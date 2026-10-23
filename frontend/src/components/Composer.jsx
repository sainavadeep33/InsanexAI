import React, { useRef, useEffect, useState } from 'react'
import { ArrowUp, Plus, Square, X, FileText, Image as ImageIcon, Mic, MicOff, Globe, ChevronDown } from 'lucide-react'
import { RECOGNITION_LANGUAGES, createSpeechRecognizer, isSpeechRecognitionSupported } from '../utils/speechRecognition'

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  loading,
  activeChat,
  placeholder = "Message InsanexAI...",
  webSearch = false,
  onToggleWebSearch,
}) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const prevLoadingRef = useRef(loading)
  const [attachment, setAttachment] = useState(null)
  const [attachError, setAttachError] = useState('')

  // Multilingual Speech Recognition State
  const [isListening, setIsListening] = useState(false)
  const [voiceLang, setVoiceLang] = useState('auto')
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [interimText, setInterimText] = useState('')
  const recognizerRef = useRef(null)
  const langMenuRef = useRef(null)

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.abort()
      }
    }
  }, [])

  // Close language selection menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false)
      }
    }
    if (showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLangMenu])

  // Determine whether it is safe to restore focus without stealing focus from another user control
  const shouldRestoreFocus = () => {
    const active = document.activeElement
    if (active === textareaRef.current) return true
    if (!active || active === document.body || active === document.documentElement) return true
    if (!document.body.contains(active)) return true

    // Do not steal focus if the user intentionally clicked or focused another interactive control
    const isOtherInteractive =
      active.tagName === 'INPUT' ||
      active.tagName === 'SELECT' ||
      (active.tagName === 'TEXTAREA' && active !== textareaRef.current) ||
      active.isContentEditable ||
      active.closest('aside') ||
      active.closest('[role="dialog"]') ||
      active.closest('.prose-chat button') ||
      active.closest('a')

    return !isOtherInteractive
  }

  const focusInput = () => {
    if (shouldRestoreFocus()) {
      textareaRef.current?.focus()
      requestAnimationFrame(() => {
        if (shouldRestoreFocus()) {
          textareaRef.current?.focus()
        }
      })
    }
  }

  // Restore focus when assistant finishes responding, or when message sending starts
  useEffect(() => {
    if (!loading && prevLoadingRef.current) {
      // Completed responding: restore focus
      focusInput()
    } else if (loading && !prevLoadingRef.current) {
      // Started sending: keep input focused
      focusInput()
    }
    prevLoadingRef.current = loading
  }, [loading])

  // Focus input on initial mount or when conversation changes
  useEffect(() => {
    focusInput()
    const t = setTimeout(focusInput, 100)
    return () => clearTimeout(t)
  }, [activeChat])

  // Auto-resize textarea height up to 200px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value, interimText])

  const handleToggleVoice = () => {
    setVoiceError('')
    if (isListening) {
      if (recognizerRef.current) {
        recognizerRef.current.stop()
      }
      setIsListening(false)
      setInterimText('')
      return
    }

    if (!isSpeechRecognitionSupported()) {
      setVoiceError('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    const recognizer = createSpeechRecognizer({
      language: voiceLang,
      onStart: () => {
        setIsListening(true)
        setVoiceError('')
      },
      onResult: ({ final, interim }) => {
        if (interim) {
          setInterimText(interim)
        }
        if (final) {
          onChange((prev) => {
            const current = (prev || '').trim()
            return current ? `${current} ${final}` : final
          })
          setInterimText('')
          requestAnimationFrame(() => textareaRef.current?.focus())
        }
      },
      onError: (errMsg) => {
        setVoiceError(errMsg)
        setIsListening(false)
        setInterimText('')
      },
      onEnd: () => {
        setIsListening(false)
        setInterimText('')
      },
    })

    recognizerRef.current = recognizer
  }

  const handleFileSelect = (e) => {
    setAttachError('')
    const file = e.target.files?.[0]
    if (!file) return

    // 10MB limit check
    if (file.size > 10 * 1024 * 1024) {
      setAttachError(`File exceeds 10MB limit (${formatFileSize(file.size)}).`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const isImage = file.type.startsWith('image/')
    const previewUrl = isImage ? URL.createObjectURL(file) : null

    setAttachment({
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      isImage,
      previewUrl,
    })
  }

  const handleRemoveAttachment = () => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl)
    }
    setAttachment(null)
    setAttachError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((value.trim() || attachment) && !loading) {
        handleFormSubmit(e)
      }
    }
  }

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault()
    if ((!value.trim() && !attachment) || loading) return
    if (isListening && recognizerRef.current) {
      recognizerRef.current.stop()
      setIsListening(false)
      setInterimText('')
    }
    const currentAttachment = attachment
    onSubmit(e, currentAttachment)
    handleRemoveAttachment()

    // Automatically focus the message input immediately after sending
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }

  const canSend = (Boolean(value.trim()) || Boolean(attachment)) && !loading
  const selectedLang = RECOGNITION_LANGUAGES.find((l) => l.code === voiceLang) || RECOGNITION_LANGUAGES[0]

  return (
    <footer className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1 shrink-0 select-none">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={loading}
      />

      <form
        onSubmit={handleFormSubmit}
        className="relative flex flex-col bg-[#f4f4f5]/60 hover:bg-[#f4f4f5] focus-within:bg-white focus-within:ring-1 focus-within:ring-neutral-300 border border-neutral-200/80 rounded-3xl p-2.5 transition-all shadow-2xs"
      >
        {/* Attachment Preview Card */}
        {attachment && (
          <div className="w-full pb-2 mb-1 flex items-center justify-between border-b border-neutral-200/60 select-none">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-800 shadow-2xs">
              {attachment.isImage ? (
                attachment.previewUrl ? (
                  <img
                    src={attachment.previewUrl}
                    alt="Upload preview"
                    className="w-5 h-5 rounded object-cover border border-neutral-200/50"
                  />
                ) : (
                  <ImageIcon className="w-4 h-4 text-neutral-500" />
                )
              ) : (
                <FileText className="w-4 h-4 text-neutral-500" />
              )}
              <span className="font-medium max-w-[220px] truncate" title={attachment.name}>
                {attachment.name}
              </span>
              <span className="text-[11px] text-neutral-400">
                ({formatFileSize(attachment.size)})
              </span>
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="ml-1 p-0.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Active Speech Recognition Banner */}
        {isListening && (
          <div className="w-full pb-2 mb-1 flex items-center justify-between border-b border-red-200/80 text-xs text-red-600 select-none px-2 animate-pulse">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="font-medium shrink-0">
                Listening ({selectedLang.name.split(' ')[0]})...
              </span>
              {interimText && (
                <span className="text-neutral-500 italic truncate max-w-sm">
                  "{interimText}"
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleToggleVoice}
              className="text-xs font-semibold text-red-700 hover:text-red-900 underline cursor-pointer shrink-0 ml-2"
            >
              Done
            </button>
          </div>
        )}

        {/* Input Bar Row */}
        <div className="flex items-end gap-1.5 w-full relative">
          {/* Attachment / Plus Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || isListening}
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-full transition-colors cursor-pointer shrink-0 mb-0.5 disabled:opacity-40"
            title="Attach file (PDF, TXT, PNG, JPG, WEBP)"
            aria-label="Attach file"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Microphone Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            disabled={loading}
            className={`p-2 rounded-full transition-all cursor-pointer shrink-0 mb-0.5 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-xs hover:bg-red-600'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60'
            }`}
            title={isListening ? 'Stop listening' : 'Voice input (Multilingual)'}
            aria-label={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Language Selector Popover Trigger */}
          <div className="relative shrink-0 mb-0.5" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setShowLangMenu((prev) => !prev)}
              disabled={loading || isListening}
              className="flex items-center gap-1 py-1.5 px-2 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-full border border-neutral-200/80 transition-colors cursor-pointer select-none disabled:opacity-40"
              title="Select speech recognition language"
              aria-label="Select speech recognition language"
            >
              <span>{selectedLang.flag}</span>
              <span className="hidden sm:inline max-w-[80px] truncate">
                {selectedLang.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {/* Language Selector Dropdown */}
            {showLangMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 max-h-64 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg z-50 py-1 text-xs select-none">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                  Select Speech Language
                </div>
                {RECOGNITION_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setVoiceLang(lang.code)
                      setShowLangMenu(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-neutral-100 transition-colors cursor-pointer ${
                      voiceLang === lang.code ? 'font-semibold text-neutral-900 bg-neutral-50' : 'text-neutral-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    {voiceLang === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Web Search ON/OFF Toggle Button */}
          <button
            type="button"
            onClick={onToggleWebSearch}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-full border text-[11px] font-medium transition-all cursor-pointer shrink-0 mb-0.5 select-none ${
              webSearch
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs hover:bg-blue-700'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 border-neutral-200/80 bg-white/60'
            }`}
            title={
              webSearch
                ? 'Web search is ON: InsanexAI will search the web for up-to-date information'
                : 'Web search is OFF: Click to enable live web search'
            }
            aria-label="Toggle web search"
            aria-pressed={webSearch}
          >
            <Globe className={`w-3.5 h-3.5 ${webSearch ? 'text-white' : 'text-neutral-500'}`} />
            <span className="hidden sm:inline">Search</span>
            {webSearch && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />}
          </button>

          {/* Multi-line auto-resizing input: remains enabled during loading so user can type next message */}
          <textarea
            ref={textareaRef}
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? `Listening in ${selectedLang.name.split(' ')[0]}... Speak now`
                : attachment
                ? `Ask about ${attachment.name}...`
                : placeholder
            }
            rows={1}
            disabled={false}
            className="flex-1 max-h-48 py-1.5 px-1 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none resize-none leading-relaxed"
            style={{ minHeight: '24px' }}
          />

          {/* Send or Stop Button */}
          {loading ? (
            <button
              type="button"
              onClick={onStop}
              className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 transition-colors shrink-0 mb-0.5 cursor-pointer shadow-2xs"
              title="Stop generating"
              aria-label="Stop generating"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              onMouseDown={(e) => {
                // Prevent mouse click from blurring the textarea
                if (canSend) e.preventDefault()
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5 transition-all shadow-2xs ${
                canSend
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
              title="Send message"
              aria-label="Send message"
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </form>

      {/* Attachment Error message */}
      {attachError && (
        <p className="mt-1.5 text-center text-xs text-red-500">
          {attachError}
        </p>
      )}

      {/* Voice Error message */}
      {voiceError && (
        <p className="mt-1.5 text-center text-xs text-red-500">
          {voiceError}
        </p>
      )}

      {/* Subtle ChatGPT-style disclaimer */}
      <p className="mt-2 text-center text-[11px] text-neutral-400">
        InsanexAI can make mistakes. Verify important information.
      </p>
    </footer>
  )
}

