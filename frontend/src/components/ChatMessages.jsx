import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check, ArrowDown, FileText, Image as ImageIcon, Volume2, Square, Globe, ExternalLink } from 'lucide-react'
import { speakMessage, stopCurrentPlayback } from '../utils/speechSynthesis'
import Prism from 'prismjs'
// Core and language grammar modules for Prism
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import { SparkleIcon } from './Icons'

// Normalize markdown language tags to Prism grammar names
const LANGUAGE_MAP = {
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  typescript: 'typescript',
  tsx: 'tsx',
  py: 'python',
  python: 'python',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  markup: 'markup',
  css: 'css',
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  zsh: 'bash',
  json: 'json',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
  md: 'markdown',
  markdown: 'markdown',
}

/**
 * Safely renders Prism.tokenize output into React JSX elements.
 * 100% XSS safe: avoids dangerouslySetInnerHTML entirely.
 */
function renderPrismTokens(tokens) {
  if (!tokens) return null

  const renderToken = (token, key) => {
    if (typeof token === 'string') {
      return token
    }
    if (!token) return null

    const typeClass = token.type ? `token ${token.type}` : ''
    const aliasClass = Array.isArray(token.alias)
      ? token.alias.join(' ')
      : token.alias || ''
    const className = [typeClass, aliasClass].filter(Boolean).join(' ')

    let children = null
    if (Array.isArray(token.content)) {
      children = token.content.map((subToken, idx) => renderToken(subToken, `${key}-${idx}`))
    } else if (typeof token.content === 'object' && token.content !== null) {
      children = renderToken(token.content, `${key}-sub`)
    } else {
      children = token.content
    }

    return (
      <span key={key} className={className}>
        {children}
      </span>
    )
  }

  if (Array.isArray(tokens)) {
    return tokens.map((token, idx) => renderToken(token, idx))
  }
  return renderToken(tokens, 0)
}

function CodeBlock({ language, codeText }) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeText)
        setCopied(true)
        setCopyFailed(false)
        setTimeout(() => setCopied(false), 2000)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = codeText
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '-9999px'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        if (success) {
          setCopied(true)
          setCopyFailed(false)
          setTimeout(() => setCopied(false), 2000)
        } else {
          setCopyFailed(true)
          setTimeout(() => setCopyFailed(false), 2000)
        }
      }
    } catch (err) {
      console.error('Failed to copy code: ', err)
      setCopyFailed(true)
      setTimeout(() => setCopyFailed(false), 2000)
    }
  }

  const rawLang = language ? language.toLowerCase().trim() : ''
  const prismLang = LANGUAGE_MAP[rawLang] || rawLang
  const grammar = Prism.languages[prismLang]
  const tokens = grammar ? Prism.tokenize(codeText, grammar) : null
  const displayLang = rawLang || 'code'

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-neutral-800 bg-[#0f0f11] text-neutral-100 text-xs shadow-xs">
      {/* Top Header Bar: select-none to eliminate "codeCopy" / "pythonCopy" noise */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-b border-neutral-800 text-[11px] text-neutral-400 font-mono select-none">
        <span className="font-medium lowercase text-neutral-300 select-none">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-neutral-800 select-none"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans font-medium">Copied!</span>
            </>
          ) : copyFailed ? (
            <span className="text-red-400 font-sans font-medium">Failed</span>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans font-medium">Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content: rendered safely with JSX token spans, ZERO dangerouslySetInnerHTML */}
      <pre className="p-4 overflow-x-auto font-mono text-xs leading-relaxed text-neutral-200 select-text">
        <code className={`language-${prismLang || 'text'}`}>
          {tokens ? renderPrismTokens(tokens) : codeText}
        </code>
      </pre>
    </div>
  )
}

function AssistantMessage({
  text,
  sources,
  isSearching,
  searchQuery,
  searchError,
  loading,
  loadingMessage,
  interrupted,
  msgIndex,
  isPlaying,
  onTogglePlay,
  voiceNotice,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyAll = () => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-start gap-3.5 max-w-3xl mx-auto w-full group">
      {/* InsanexAI Avatar */}
      <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs select-none">
        <SparkleIcon className="w-3.5 h-3.5" strokeWidth={2} />
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center text-xs font-semibold text-neutral-900 mb-1 select-none">
          <span>InsanexAI</span>
          {interrupted && (
            <span className="ml-2 text-[10px] text-neutral-400 font-normal px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">
              Stopped
            </span>
          )}
        </div>

        {/* Searching Status Indicator */}
        {isSearching && (
          <div className="flex items-center gap-2 py-2 px-3 mb-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-xs text-blue-700 select-none animate-pulse">
            <Globe className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
            <span className="font-medium truncate">
              {searchQuery ? `Searching the web for "${searchQuery}"...` : 'Searching the live web...'}
            </span>
          </div>
        )}

        {/* Search Error Notice */}
        {searchError && (
          <div className="flex items-center gap-2 py-1.5 px-3 mb-2.5 rounded-xl bg-amber-50 border border-amber-200/70 text-xs text-amber-800 select-none">
            <span className="font-medium">⚠️ {searchError}</span>
          </div>
        )}

        {/* Sources Cards Panel */}
        {sources && sources.length > 0 && (
          <div className="mb-3.5 select-none">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 mb-2">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Sources</span>
              <span className="text-[11px] font-normal text-neutral-400">({sources.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {sources.map((s, idx) => (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-between p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/80 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all text-xs group/source"
                  title={`${s.title}\n${s.url}`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-medium text-neutral-500 truncate" title={s.domain}>
                      {s.domain || 'web'}
                    </span>
                    <ExternalLink className="w-3 h-3 text-neutral-400 group-hover/source:text-blue-600 ml-auto shrink-0 transition-colors" />
                  </div>
                  <span className="font-medium text-neutral-800 line-clamp-2 leading-snug group-hover/source:text-blue-600 transition-colors">
                    {s.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {text ? (
          <div className="prose-chat select-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Unwrap outer pre from react-markdown to avoid nested <pre> around CodeBlock
                pre({ children }) {
                  return <>{children}</>
                },
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const rawContent = Array.isArray(children) ? children.join('') : String(children || '')
                  const isBlock = match || rawContent.includes('\n')

                  if (!isBlock) {
                    return (
                      <code
                        className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-neutral-200/60"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }

                  const lang = match ? match[1].toLowerCase() : ''
                  const codeContent = rawContent.replace(/\n$/, '')
                  return <CodeBlock language={lang} codeText={codeContent} />
                },
                // Clean Responsive Tables
                table({ children }) {
                  return (
                    <div className="my-3 overflow-x-auto rounded-lg border border-neutral-200 shadow-2xs">
                      <table className="min-w-full divide-y divide-neutral-200 text-xs text-left text-neutral-800">
                        {children}
                      </table>
                    </div>
                  )
                },
                thead({ children }) {
                  return (
                    <thead className="bg-neutral-50 font-semibold text-neutral-900 border-b border-neutral-200 select-none">
                      {children}
                    </thead>
                  )
                },
                th({ children }) {
                  return <th className="px-3.5 py-2.5 font-semibold text-neutral-900">{children}</th>
                },
                td({ children }) {
                  return <td className="px-3.5 py-2 border-t border-neutral-100">{children}</td>
                },
                // Clean Blockquotes
                blockquote({ children }) {
                  return (
                    <blockquote className="my-3 pl-3.5 border-l-2 border-neutral-300 italic text-neutral-600">
                      {children}
                    </blockquote>
                  )
                },
                // Dividers
                hr() {
                  return <hr className="my-4 border-neutral-200" />
                },
                // Safe Links: allow only http, https, mailto, and relative paths
                a({ href, children }) {
                  const isSafe = /^((https?|mailto):|\/)/i.test(href || '')
                  if (!isSafe) {
                    return (
                      <span className="text-neutral-500 line-through cursor-not-allowed" title="Blocked unsafe link">
                        {children}
                      </span>
                    )
                  }
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 underline font-medium hover:text-neutral-600 transition-colors"
                    >
                      {children}
                    </a>
                  )
                },
                // Headings
                h1({ children }) {
                  return <h1 className="text-lg font-bold text-neutral-900 mt-4 mb-2">{children}</h1>
                },
                h2({ children }) {
                  return <h2 className="text-base font-semibold text-neutral-900 mt-3.5 mb-1.5">{children}</h2>
                },
                h3({ children }) {
                  return <h3 className="text-sm font-semibold text-neutral-900 mt-2.5 mb-1">{children}</h3>
                },
                h4({ children }) {
                  return <h4 className="text-xs font-semibold text-neutral-900 mt-2 mb-1 uppercase tracking-wider">{children}</h4>
                },
                // Lists
                ul({ children }) {
                  return <ul className="my-2 pl-5 list-disc space-y-1">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="my-2 pl-5 list-decimal space-y-1">{children}</ol>
                },
                li({ children }) {
                  return <li className="leading-relaxed">{children}</li>
                },
                // Paragraphs
                p({ children }) {
                  return <p className="my-2 leading-relaxed">{children}</p>
                },
                strong({ children }) {
                  return <strong className="font-semibold text-neutral-900">{children}</strong>
                },
                em({ children }) {
                  return <em className="italic">{children}</em>
                },
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-1.5 py-1 text-xs text-neutral-500 select-none">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:200ms]" />
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:400ms]" />
            <span className="text-xs text-neutral-400 ml-1">{loadingMessage || 'Thinking...'}</span>
          </div>
        ) : null}

        {/* Action buttons (Copy full response, Read aloud / Stop) */}
        {text && !loading && (
          <div
            className={`mt-2.5 flex items-center gap-2 select-none transition-opacity ${
              isPlaying
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-700 py-1 px-2 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Copy response"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Copied response</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Read Aloud / Stop Audio Button */}
            <button
              type="button"
              onClick={() => onTogglePlay && onTogglePlay(msgIndex, text)}
              className={`flex items-center gap-1.5 text-[11px] py-1 px-2 rounded-md transition-colors cursor-pointer ${
                isPlaying
                  ? 'text-neutral-900 bg-neutral-200/80 font-medium'
                  : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
              }`}
              title={isPlaying ? 'Stop audio' : 'Read aloud (Multilingual)'}
              aria-label={isPlaying ? 'Stop audio' : 'Read aloud'}
            >
              {isPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current text-neutral-800" />
                  <span>Stop</span>
                  {/* Animated sound wave bars */}
                  <span className="flex items-center gap-0.5 ml-1">
                    <span className="w-0.5 h-2.5 bg-neutral-700 animate-pulse" />
                    <span className="w-0.5 h-3.5 bg-neutral-700 animate-pulse [animation-delay:150ms]" />
                    <span className="w-0.5 h-2 bg-neutral-700 animate-pulse [animation-delay:300ms]" />
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read aloud</span>
                </>
              )}
            </button>

            {/* Fallback voice notice */}
            {voiceNotice && isPlaying && (
              <span className="text-[10px] text-neutral-400 italic">
                {voiceNotice}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function UserMessage({ text, attachment }) {
  const isImage = attachment && (attachment.isImage || (attachment.type && attachment.type.startsWith('image/')))

  return (
    <div className="flex flex-col items-end max-w-3xl mx-auto w-full space-y-1.5">
      {/* Attachment Pill / Thumbnail */}
      {attachment && (
        <div className="max-w-[85%] sm:max-w-[75%] select-none">
          {isImage ? (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-2xs">
              {attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name || 'Attached image'}
                  className="max-h-60 max-w-full rounded-xl object-contain bg-white"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 bg-white">
                  <ImageIcon className="w-4 h-4 text-neutral-500" />
                  <span className="font-medium truncate max-w-[200px]">{attachment.name}</span>
                  {attachment.size && (
                    <span className="text-[11px] text-neutral-400">({formatFileSize(attachment.size)})</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-800 shadow-2xs">
              <FileText className="w-4 h-4 text-neutral-600 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate max-w-[220px]" title={attachment.name}>
                  {attachment.name}
                </span>
                {attachment.size && (
                  <span className="text-[10px] text-neutral-500">{formatFileSize(attachment.size)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Prompt Text */}
      {text && (
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 bg-neutral-100 text-neutral-900 text-sm leading-relaxed whitespace-pre-wrap select-text">
          {text}
        </div>
      )}
    </div>
  )
}

export default function ChatMessages({ messages, loading, error }) {
  const containerRef = useRef(null)
  const bottomRef = useRef(null)
  const isNearBottomRef = useRef(true)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [playingIndex, setPlayingIndex] = useState(null)
  const [voiceNotice, setVoiceNotice] = useState('')
  const playbackRef = useRef(null)

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopCurrentPlayback()
      if (playbackRef.current?.stop) playbackRef.current.stop()
    }
  }, [])

  // If new AI generation starts or messages are cleared, cancel audio playback
  useEffect(() => {
    if (loading || !messages || messages.length === 0) {
      stopCurrentPlayback()
      setPlayingIndex(null)
      setVoiceNotice('')
    }
  }, [loading, messages?.length])

  const handleTogglePlay = (index, text) => {
    if (playingIndex === index) {
      // User requested stop
      stopCurrentPlayback()
      setPlayingIndex(null)
      setVoiceNotice('')
      return
    }

    // Stop any existing playback
    stopCurrentPlayback()
    setPlayingIndex(index)
    setVoiceNotice('')

    const controller = speakMessage({
      text,
      onStart: (info) => {
        if (!info.isNativeVoice) {
          setVoiceNotice(`Using ${info.voiceName}`)
        } else {
          setVoiceNotice('')
        }
      },
      onEnd: () => {
        setPlayingIndex((curr) => (curr === index ? null : curr))
        setVoiceNotice('')
      },
      onError: (err) => {
        console.warn(err)
        setPlayingIndex((curr) => (curr === index ? null : curr))
        setVoiceNotice('')
      },
    })
    playbackRef.current = controller
  }

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const isNear = distanceToBottom <= 140
    isNearBottomRef.current = isNear
    setShowScrollBottom(!isNear)
  }

  const scrollToBottom = (behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
    isNearBottomRef.current = true
    setShowScrollBottom(false)
  }

  // Only auto-scroll if user was already at or near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  // Contextual loading message based on preceding user message attachment or web search
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
  const lastAssistantMsg = messages[messages.length - 1]
  let contextualLoading = 'Thinking...'
  if (lastAssistantMsg?.isSearching) {
    contextualLoading = 'InsanexAI is searching the web...'
  } else if (lastUserMsg?.attachment) {
    const isImg = lastUserMsg.attachment.isImage || (lastUserMsg.attachment.type && lastUserMsg.attachment.type.startsWith('image/'))
    contextualLoading = isImg ? 'InsanexAI is analyzing image...' : 'InsanexAI is analyzing document...'
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6 relative"
    >
      {messages.map((item, idx) => (
        <div key={idx} className="w-full">
          {item.role === 'user' ? (
            <UserMessage text={item.text} attachment={item.attachment} />
          ) : (
            <AssistantMessage
              text={item.text}
              sources={item.sources}
              isSearching={Boolean(item.isSearching)}
              searchQuery={item.searchQuery}
              searchError={item.searchError}
              loading={loading && idx === messages.length - 1 && !item.text}
              loadingMessage={item.isSearching ? 'InsanexAI is searching the web...' : contextualLoading}
              interrupted={item.interrupted}
              msgIndex={idx}
              isPlaying={playingIndex === idx}
              onTogglePlay={handleTogglePlay}
              voiceNotice={playingIndex === idx ? voiceNotice : ''}
            />
          )}
        </div>
      ))}

      {error && (
        <div className="max-w-3xl mx-auto w-full p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed">
          {error}
        </div>
      )}

      <div ref={bottomRef} className="h-2" />

      {/* Floating scroll to bottom button */}
      {showScrollBottom && (
        <div className="sticky bottom-2 flex justify-center pointer-events-none select-none z-20">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-neutral-700 text-xs font-medium shadow-md border border-neutral-200 hover:bg-neutral-50 transition-all cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Scroll to bottom</span>
          </button>
        </div>
      )}
    </div>
  )
}

