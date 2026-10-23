/**
 * InsanexAI Multilingual Text-to-Speech Engine
 * Dynamic voice enumeration, script/language detection, Markdown sanitizer, and chunked playback.
 */

export function cleanTextForSpeech(markdown) {
  if (!markdown) return ''

  let text = String(markdown)

  // 1. Remove fenced code blocks (replace with speech friendly note)
  text = text.replace(/```[\s\S]*?```/g, ' Code block omitted. ')

  // 2. Remove inline code backticks: `code` -> code
  text = text.replace(/`([^`]+)`/g, '$1')

  // 3. Convert markdown links: [link text](url) -> link text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')

  // 4. Remove raw URLs
  text = text.replace(/https?:\/\/\S+/gi, '')

  // 5. Remove markdown headers: #, ##, etc.
  text = text.replace(/^#{1,6}\s+/gm, '')

  // 6. Remove bold/italics markers: ***, **, *, __, _
  text = text.replace(/(\*\*\*|\*\*|\*|___|__|\b_|_\b)/g, '')

  // 7. Remove blockquotes: >
  text = text.replace(/^>\s+/gm, '')

  // 8. Remove horizontal rules: ---, ***, ___
  text = text.replace(/^[\-*_]{3,}\s*$/gm, '')

  // 9. Remove markdown table formatting (| col | col |)
  text = text.replace(/^\|.*\|$/gm, '')
  text = text.replace(/\|/g, ' ')

  // 10. Clean up bullet points: * , - , + , 1. -> natural pause
  text = text.replace(/^[\*\-\+]\s+/gm, '')
  text = text.replace(/^\d+\.\s+/gm, '')

  // 11. Remove emojis that can cause weird TTS reading
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')

  // 12. Consolidate multiple spaces and newlines
  text = text.replace(/\n+/g, '. ')
  text = text.replace(/\s{2,}/g, ' ')

  return text.trim()
}

export function detectLanguageScript(text) {
  if (!text) return 'en-US'

  // Count occurrences of characters in various Unicode blocks
  let teluguCount = 0
  let devanagariCount = 0 // Hindi, Marathi
  let tamilCount = 0
  let kannadaCount = 0
  let malayalamCount = 0
  let bengaliCount = 0
  let gujaratiCount = 0
  let punjabiCount = 0
  let arabicCount = 0
  let cjkCount = 0 // Chinese, Japanese, Korean
  let cyrillicCount = 0 // Russian

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x0c00 && code <= 0x0c7f) teluguCount++
    else if (code >= 0x0900 && code <= 0x097f) devanagariCount++
    else if (code >= 0x0b80 && code <= 0x0bff) tamilCount++
    else if (code >= 0x0c80 && code <= 0x0cff) kannadaCount++
    else if (code >= 0x0d00 && code <= 0x0d7f) malayalamCount++
    else if (code >= 0x0980 && code <= 0x09ff) bengaliCount++
    else if (code >= 0x0a80 && code <= 0x0aff) gujaratiCount++
    else if (code >= 0x0a00 && code <= 0x0a7f) punjabiCount++
    else if (code >= 0x0600 && code <= 0x06ff) arabicCount++
    else if (code >= 0x4e00 && code <= 0x9fff) cjkCount++
    else if (code >= 0x0400 && code <= 0x04ff) cyrillicCount++
  }

  const counts = [
    { lang: 'te-IN', count: teluguCount },
    { lang: 'hi-IN', count: devanagariCount },
    { lang: 'ta-IN', count: tamilCount },
    { lang: 'kn-IN', count: kannadaCount },
    { lang: 'ml-IN', count: malayalamCount },
    { lang: 'bn-IN', count: bengaliCount },
    { lang: 'gu-IN', count: gujaratiCount },
    { lang: 'pa-IN', count: punjabiCount },
    { lang: 'ar-SA', count: arabicCount },
    { lang: 'zh-CN', count: cjkCount },
    { lang: 'ru-RU', count: cyrillicCount },
  ]

  counts.sort((a, b) => b.count - a.count)
  if (counts[0].count >= 3) {
    return counts[0].lang
  }

  // Common Tenglish / Hindi Romanized heuristics or English
  const lower = text.toLowerCase()
  if (/\b(nenu|meeru|cheppandi|bagunara|sangathulu|keka|chala|undi|leda|emiti|enti|ela)\b/i.test(lower)) {
    return 'en-IN' // Indian English voice sounds best for Romanized Tenglish
  }
  if (/\b(kya|kaise|hai|hoga|kuch|nahi|mujhe|aap|bataiye|theek)\b/i.test(lower)) {
    return 'en-IN' // Indian English for Hinglish
  }

  return 'en-US'
}

let cachedVoices = []

export function getAvailableVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  if (cachedVoices.length > 0) return cachedVoices

  const voices = window.speechSynthesis.getVoices() || []
  if (voices.length > 0) {
    cachedVoices = voices
  }
  return voices
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices() || []
  }
}

export function findMatchingVoice(langCode) {
  const voices = getAvailableVoices()
  if (!voices || voices.length === 0) return null

  const target = (langCode || 'en-US').toLowerCase().replace('_', '-')
  const langPrefix = target.split('-')[0]

  // 1. Exact match (e.g. te-IN)
  let match = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === target)
  if (match) return { voice: match, isExact: true }

  // 2. Prefix match (e.g. te)
  match = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix))
  if (match) return { voice: match, isExact: true }

  // 3. Fallback to English (India) or default English if available
  const inEnglish = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === 'en-in')
  const defaultEnglish = voices.find((v) => v.lang.toLowerCase().startsWith('en'))
  const fallback = inEnglish || defaultEnglish || voices[0]

  return { voice: fallback, isExact: false }
}

// Split text into natural sentence chunks to prevent browser synthesis timeout bug
function splitIntoChunks(text, maxLen = 160) {
  const rawSentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text]
  const chunks = []

  let current = ''
  for (const s of rawSentences) {
    const trimmed = s.trim()
    if (!trimmed) continue
    if ((current + ' ' + trimmed).length <= maxLen) {
      current = current ? `${current} ${trimmed}` : trimmed
    } else {
      if (current) chunks.push(current)
      if (trimmed.length > maxLen) {
        // Split extra long sentence by comma or words
        const words = trimmed.split(' ')
        let sub = ''
        for (const w of words) {
          if ((sub + ' ' + w).length <= maxLen) {
            sub = sub ? `${sub} ${w}` : w
          } else {
            if (sub) chunks.push(sub)
            sub = w
          }
        }
        if (sub) current = sub
        else current = ''
      } else {
        current = trimmed
      }
    }
  }
  if (current) chunks.push(current)
  return chunks.length > 0 ? chunks : [text]
}

let activePlayback = null

export function stopCurrentPlayback() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  if (activePlayback) {
    if (activePlayback.onEnd) activePlayback.onEnd()
    activePlayback = null
  }
}

export function speakMessage({
  text,
  onStart,
  onEnd,
  onError,
}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onError) onError('Speech synthesis is not supported in this browser.')
    return { stop: () => {} }
  }

  // Cancel any current audio so voices never overlap
  stopCurrentPlayback()

  const cleanText = cleanTextForSpeech(text)
  if (!cleanText) {
    if (onError) onError('No readable text to play.')
    return { stop: () => {} }
  }

  const detectedLang = detectLanguageScript(text)
  const voiceMatch = findMatchingVoice(detectedLang)
  const matchedVoice = voiceMatch?.voice || null
  const isNative = voiceMatch?.isExact || false

  const chunks = splitIntoChunks(cleanText)
  let currentChunkIndex = 0
  let isStopped = false

  const playbackController = {
    onEnd: () => {
      isStopped = true
      if (onEnd) onEnd()
    },
  }
  activePlayback = playbackController

  const playNextChunk = () => {
    if (isStopped || currentChunkIndex >= chunks.length) {
      if (!isStopped && onEnd) onEnd()
      activePlayback = null
      return
    }

    const chunkText = chunks[currentChunkIndex]
    currentChunkIndex++

    const utterance = new SpeechSynthesisUtterance(chunkText)
    if (matchedVoice) {
      utterance.voice = matchedVoice
      utterance.lang = matchedVoice.lang
    } else {
      utterance.lang = detectedLang
    }
    utterance.rate = 1.0
    utterance.pitch = 1.0

    utterance.onstart = () => {
      if (currentChunkIndex === 1 && onStart) {
        onStart({
          lang: detectedLang,
          voiceName: matchedVoice?.name || 'Default voice',
          isNativeVoice: isNative,
        })
      }
    }

    utterance.onend = () => {
      if (!isStopped) {
        playNextChunk()
      }
    }

    utterance.onerror = (e) => {
      if (isStopped || e.error === 'canceled' || e.error === 'interrupted') return
      console.warn('Speech synthesis error:', e)
      if (onError) onError('Speech playback error: ' + (e.error || 'unknown'))
      isStopped = true
      activePlayback = null
      if (onEnd) onEnd()
    }

    try {
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      if (onError) onError('Failed to start speech playback.')
      if (onEnd) onEnd()
      activePlayback = null
    }
  }

  playNextChunk()

  return {
    stop: () => {
      isStopped = true
      stopCurrentPlayback()
    },
    detectedLang,
    voiceName: matchedVoice?.name || 'Default voice',
    isNativeVoice: isNative,
  }
}
