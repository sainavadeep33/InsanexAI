/**
 * InsanexAI Gemini Chat Service
 * Streams responses from the FastAPI backend at POST /api/chat/stream using Server-Sent Events (SSE).
 */

import { API_BASE_URL } from '../config/api'

const API_URL = API_BASE_URL

export async function streamChatResponse({
  message,
  messages = [],
  conversationId,
  token,
  attachment,
  webSearch = false,
  onChunk,
  onSearchStart,
  onSources,
  onDone,
  signal,
}) {
  const headers = {
    Accept: 'text/event-stream',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let body
  if (attachment && attachment.file) {
    const formData = new FormData()
    formData.append('file', attachment.file)
    formData.append('message', message || '')
    if (conversationId) {
      formData.append('conversation_id', String(conversationId))
    }
    formData.append('web_search', String(Boolean(webSearch)))
    const cleanHistory = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.text,
      attachment: m.attachment || undefined,
      sources: m.sources || undefined,
    }))
    formData.append('messages', JSON.stringify(cleanHistory))
    body = formData
    // Note: Do NOT set Content-Type header so browser sets multipart/form-data with boundary
  } else {
    headers['Content-Type'] = 'application/json'
    const payload = {
      message,
      messages: messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        text: m.text,
        attachment: m.attachment || undefined,
        sources: m.sources || undefined,
      })),
      conversation_id: conversationId ? String(conversationId) : undefined,
      web_search: Boolean(webSearch),
    }
    body = JSON.stringify(payload)
  }

  let response
  try {
    response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers,
      body,
      signal,
      credentials: 'include',
    })
  } catch (networkErr) {
    if (signal?.aborted) {
      if (onDone) onDone({ finishReason: 'interrupted' })
      return
    }
    // Attempt fallback to non-stream chat endpoint if stream route is unavailable (text-only)
    if (!attachment || !attachment.file) {
      try {
        response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers,
          body,
          signal,
          credentials: 'include',
        })
      } catch {
        throw new Error(
          'Unable to connect to the InsanexAI backend. Please check your network connection or server status.'
        )
      }
    } else {
      throw new Error(
        'Unable to connect to the InsanexAI backend. Please check your network connection or server status.'
      )
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.detail || `Server error (${response.status}): ${response.statusText}`
    )
  }

  if (!response.body) {
    throw new Error('Streaming response is not supported by the browser or server.')
  }

  const contentType = response.headers.get('content-type') || ''
  const isSSE = contentType.includes('text/event-stream')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let fullText = ''
  let finishReason = 'stop'
  let sources = []

  try {
    while (true) {
      if (signal?.aborted) {
        finishReason = 'interrupted'
        await reader.cancel().catch(() => {})
        break
      }

      const { value, done } = await reader.read()
      if (done) break

      const textChunk = decoder.decode(value, { stream: true })

      if (!isSSE) {
        // Plain text streaming fallback
        if (textChunk) {
          fullText += textChunk
          onChunk(textChunk)
        }
        continue
      }

      buffer += textChunk
      const lines = buffer.split('\n')
      // Retain the last incomplete line in buffer
      buffer = lines.pop() ?? ''

      let currentEvent = 'message'
      let currentData = ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim()
        } else if (trimmed.startsWith('data:')) {
          currentData = trimmed.slice(5).trim()
        } else if (trimmed === '') {
          // Event dispatch on empty line delimiter
          if (currentData) {
            try {
              const data = JSON.parse(currentData)
              if (currentEvent === 'message' && data.chunk) {
                fullText += data.chunk
                onChunk(data.chunk)
              } else if (currentEvent === 'search_start') {
                if (onSearchStart) onSearchStart(data.query)
              } else if (currentEvent === 'sources') {
                if (Array.isArray(data.sources)) sources = data.sources
                if (onSources) onSources(data.sources || [], data.error)
              } else if (currentEvent === 'done') {
                if (data.full_text) fullText = data.full_text
                if (data.finish_reason) finishReason = data.finish_reason
                if (Array.isArray(data.sources)) sources = data.sources
              } else if (currentEvent === 'error') {
                throw new Error(data.error || 'Stream error occurred.')
              }
            } catch (jsonErr) {
              if (currentEvent === 'error') {
                throw new Error(currentData || 'Stream error occurred.')
              }
            }
            currentEvent = 'message'
            currentData = ''
          }
        }
      }
    }
  } catch (err) {
    if (signal?.aborted || err.name === 'AbortError') {
      finishReason = 'interrupted'
    } else {
      throw err
    }
  } finally {
    if (onDone) {
      onDone({ fullText, finishReason, sources })
    }
  }
}

