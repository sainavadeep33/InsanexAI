import React, { useEffect, useState, useRef, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import WelcomeScreen from './components/WelcomeScreen'
import ChatMessages from './components/ChatMessages'
import Composer from './components/Composer'
import AuthModal from './components/AuthModal'
import { streamChatResponse } from './utils/chatEngine'
import { Loader2 } from 'lucide-react'
import { InsanexLogo } from './components/Icons'
import { API_BASE_URL } from './config/api'

const USER_KEY = 'insanexai-user'
const TOKEN_KEY = 'insanexai-token'

const getUserStorageKey = (userId) => (userId ? `insanexai-chats-${userId}` : null)

function loadSavedUser() {
  try {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function loadChatsForUser(userId) {
  if (!userId) return []
  try {
    const key = getUserStorageKey(userId)
    const saved = localStorage.getItem(key)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [webSearch, setWebSearch] = useState(false)

  // Authentication State
  const [user, setUser] = useState(loadSavedUser)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const abortControllerRef = useRef(null)

  // Verify authentication session on load
  useEffect(() => {
    let active = true
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      setUser(null)
      setChats([])
      setIsCheckingAuth(false)
      try {
        localStorage.removeItem('insanexai-chats')
      } catch {}
      return
    }

    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Session invalid'))))
      .then((data) => {
        if (active && data?.user) {
          setUser(data.user)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
          const cached = loadChatsForUser(data.user.id)
          if (cached.length > 0) {
            setChats(cached)
          }
        }
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          localStorage.removeItem('insanexai-chats')
          setUser(null)
          setChats([])
        }
      })
      .finally(() => {
        if (active) {
          setIsCheckingAuth(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  // Fetch conversations from server whenever authenticated user is present
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (user?.id && token) {
      fetch(`${API_BASE_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          if (data?.conversations) {
            setChats(data.conversations)
            const cacheKey = getUserStorageKey(user.id)
            if (cacheKey) {
              localStorage.setItem(cacheKey, JSON.stringify(data.conversations))
            }
          }
        })
        .catch(() => {})
    } else if (!user) {
      setChats([])
      setActiveChat(null)
    }
  }, [user?.id])

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore network errors on logout
    }
    if (user?.id) {
      localStorage.removeItem(getUserStorageKey(user.id))
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('insanexai-chats')
    setUser(null)
    setActiveChat(null)
    setChats([])
    setMessage('')
    setError('')
  }

  const handleAuthSuccess = (authenticatedUser, token) => {
    setUser(authenticatedUser)
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (authenticatedUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser))
      const cached = loadChatsForUser(authenticatedUser.id)
      setChats(cached)
    }
    setIsAuthModalOpen(false)
  }

  // Persist chats to user-scoped localStorage
  useEffect(() => {
    if (user?.id) {
      try {
        const cacheKey = getUserStorageKey(user.id)
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify(chats))
        }
      } catch (err) {
        console.error('Failed to save chat history:', err)
      }
    }
  }, [chats, user?.id])

  // Helper to sync conversation to backend when authenticated
  const saveConversationToServer = useCallback(async (chatId, title, msgs) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    try {
      await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          id: String(chatId),
          title: title || 'Untitled conversation',
          messages: msgs.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            text: m.text,
            attachment: m.attachment || null,
            sources: m.sources || null,
          })),
        }),
      })
    } catch (err) {
      console.error('Failed to sync conversation to server:', err)
    }
  }, [])

  // Global keyboard shortcuts (Cmd+K / Ctrl+K for new chat)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handleNewChat()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading])

  const activeConversation = chats.find((chat) => chat.id === activeChat)
  const messages = activeConversation?.messages ?? []

  const handleNewChat = useCallback(() => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setActiveChat(null)
    setMessage('')
    setError('')
    setLoading(false)
    setMobileSidebarOpen(false)
  }, [loading])

  const handleSelectChat = useCallback(
    async (chatId) => {
      if (loading && abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      setActiveChat(chatId)
      setMessage('')
      setError('')
      setLoading(false)
      setMobileSidebarOpen(false)

      // If messages not loaded, fetch from server if authenticated
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/conversations/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          })
          if (res.ok) {
            const data = await res.json()
            if (data?.conversation?.messages) {
              setChats((prev) =>
                prev.map((c) =>
                  c.id === chatId ? { ...c, messages: data.conversation.messages } : c
                )
              )
            }
          }
        } catch {}
      }
    },
    [loading]
  )

  const handleRenameChat = useCallback(
    async (chatId, newTitle) => {
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, title: newTitle } : chat))
      )

      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/conversations/${chatId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({ title: newTitle }),
          })
        } catch (err) {
          console.error('Failed to rename conversation on server:', err)
        }
      }
    },
    []
  )

  const handleDeleteChat = useCallback(
    async (chatId) => {
      setChats((prev) => prev.filter((chat) => chat.id !== chatId))
      if (activeChat === chatId) {
        setActiveChat(null)
        setMessage('')
        setError('')
      }

      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/conversations/${chatId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          })
        } catch (err) {
          console.error('Failed to delete conversation on server:', err)
        }
      }
    },
    [activeChat]
  )


  const handleStopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setLoading(false)
    if (activeChat) {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChat) return chat
          const updated = [...chat.messages]
          const lastIdx = updated.length - 1
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              interrupted: true,
            }
          }
          return { ...chat, messages: updated }
        })
      )
    }
  }, [activeChat])

  const executeSendMessage = async (textToSend, attachment = null) => {
    const rawText = (textToSend || '').trim()
    if (!rawText && !attachment) return
    if (loading) return

    const text = rawText || (
      attachment?.isImage
        ? 'Please analyze this image.'
        : `Please analyze this document (${attachment?.name || 'file'}).`
    )

    const chatId = activeChat ?? Date.now()
    const existingChat = chats.find((chat) => chat.id === chatId)

    const attachmentMeta = attachment
      ? {
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
          isImage: Boolean(attachment.isImage || (attachment.type && attachment.type.startsWith('image/'))),
          previewUrl: attachment.previewUrl || null,
        }
      : null

    const conversationHistory = [
      ...(existingChat?.messages ?? []),
      { role: 'user', text, attachment: attachmentMeta },
    ]

    const updatedChat = {
      id: chatId,
      title: existingChat?.title ?? (
        rawText
          ? (rawText.length > 28 ? `${rawText.slice(0, 28)}...` : rawText)
          : (attachment?.name ? `File: ${attachment.name}` : 'File analysis')
      ),
      timestamp: Date.now(),
      messages: [
        ...conversationHistory,
        {
          role: 'assistant',
          text: '',
          interrupted: false,
          sources: [],
          isSearching: webSearch,
        },
      ],
    }

    setChats((prev) => [updatedChat, ...prev.filter((c) => c.id !== chatId)])
    setActiveChat(chatId)
    setMessage('')
    setError('')
    setLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    const handleSearchStart = (searchQuery) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat
          const updatedMessages = [...chat.messages]
          const lastIdx = updatedMessages.length - 1
          const lastMsg = updatedMessages[lastIdx]
          if (lastMsg?.role === 'assistant') {
            updatedMessages[lastIdx] = {
              ...lastMsg,
              isSearching: true,
              searchQuery: searchQuery || '',
            }
          }
          return { ...chat, messages: updatedMessages }
        })
      )
    }

    const handleSources = (sourcesList, searchErr) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat
          const updatedMessages = [...chat.messages]
          const lastIdx = updatedMessages.length - 1
          const lastMsg = updatedMessages[lastIdx]
          if (lastMsg?.role === 'assistant') {
            updatedMessages[lastIdx] = {
              ...lastMsg,
              isSearching: false,
              sources: sourcesList || [],
              searchError: searchErr || null,
            }
          }
          return { ...chat, messages: updatedMessages }
        })
      )
    }

    const appendChunk = (chunk) => {
      if (!chunk) return
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat
          const updatedMessages = [...chat.messages]
          const lastIdx = updatedMessages.length - 1
          const lastMsg = updatedMessages[lastIdx]

          if (lastMsg?.role === 'assistant') {
            updatedMessages[lastIdx] = {
              ...lastMsg,
              isSearching: false,
              text: lastMsg.text + chunk,
            }
          }
          return { ...chat, messages: updatedMessages }
        })
      )
    }

    const handleStreamDone = ({ fullText, finishReason, sources: doneSources }) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat
          const updatedMessages = [...chat.messages]
          const lastIdx = updatedMessages.length - 1
          const lastMsg = updatedMessages[lastIdx]

          if (lastMsg?.role === 'assistant') {
            updatedMessages[lastIdx] = {
              ...lastMsg,
              text: fullText || lastMsg.text,
              interrupted: finishReason === 'interrupted',
              isSearching: false,
              sources: (doneSources && doneSources.length > 0) ? doneSources : (lastMsg.sources || []),
            }
          }
          return { ...chat, messages: updatedMessages }
        })
      )
    }

    try {
      const token = localStorage.getItem(TOKEN_KEY)
      await streamChatResponse({
        message: text,
        messages: existingChat?.messages ?? [],
        conversationId: chatId,
        token,
        attachment,
        webSearch,
        onChunk: appendChunk,
        onSearchStart: handleSearchStart,
        onSources: handleSources,
        onDone: handleStreamDone,
        signal: controller.signal,
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errorMsg = err.message || 'Unable to complete message stream.'
        setError(errorMsg)
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== chatId) return chat
            const updatedMessages = [...chat.messages]
            const lastIdx = updatedMessages.length - 1
            if (updatedMessages[lastIdx]?.role === 'assistant' && !updatedMessages[lastIdx].text) {
              updatedMessages[lastIdx] = {
                ...updatedMessages[lastIdx],
                text: `⚠️ **Error:** ${errorMsg}`,
              }
            }
            return { ...chat, messages: updatedMessages }
          })
        )
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null

      // Sync updated conversation to server if authenticated
      setTimeout(() => {
        setChats((currentChats) => {
          const finished = currentChats.find((c) => c.id === chatId)
          if (finished) {
            saveConversationToServer(chatId, finished.title, finished.messages)
          }
          return currentChats
        })
      }, 150)
    }
  }

  const handleSubmit = (e, attachment = null) => {
    if (e) e.preventDefault()
    executeSendMessage(message, attachment)
  }

  const handleSelectSuggestion = (promptText) => {
    executeSendMessage(promptText)
  }

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#fcfcfc] text-neutral-900 select-none animate-fade-in">
        <InsanexLogo iconSize="w-8 h-8" textSize="text-2xl" />
        <div className="flex items-center gap-2 mt-4 text-xs text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
          <span>Verifying session...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthModal
        isOpen={true}
        isStandalone={true}
        onSuccess={handleAuthSuccess}
      />
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-neutral-900 font-sans antialiased">
      {/* Collapsible / Responsive Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        loading={loading}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        {/* Minimal Topbar */}
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onNewChat={handleNewChat}
          loading={loading}
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          activeConversation={activeConversation}
        />


        {/* Conversation Stream or Welcome Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {messages.length === 0 ? (
            <WelcomeScreen onSelectSuggestion={handleSelectSuggestion} />
          ) : (
            <ChatMessages
              messages={messages}
              loading={loading}
              error={error}
            />
          )}

          {/* Fixed Bottom Rounded Composer */}
          <Composer
            value={message}
            onChange={setMessage}
            onSubmit={handleSubmit}
            onStop={handleStopGenerating}
            loading={loading}
            activeChat={activeChat}
            webSearch={webSearch}
            onToggleWebSearch={() => setWebSearch((prev) => !prev)}
          />
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  )
}
