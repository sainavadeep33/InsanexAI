import React, { useState, useRef, useEffect } from 'react'
import { PanelLeft, SquarePen, Download, FileText, FileCode, Printer, ChevronDown } from 'lucide-react'
import { InsanexLogo } from './Icons'
import { exportChatAsTxt, exportChatAsMarkdown, exportChatAsPdf } from '../utils/exportChat'

export default function Topbar({
  sidebarOpen,
  onToggleSidebar,
  onOpenMobileSidebar,
  onNewChat,
  loading,
  user,
  onOpenAuth,
  activeConversation,
}) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  const hasMessages = Boolean(activeConversation?.messages && activeConversation.messages.length > 0)

  return (
    <header className="h-14 w-full flex items-center justify-between px-4 bg-white/90 backdrop-blur-xs border-b border-neutral-200/50 shrink-0 z-10 select-none">
      <div className="flex items-center gap-2">
        {/* Toggle button on desktop when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {/* Hamburger on mobile */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          title="Open menu"
          aria-label="Open menu"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Model Pill / Brand */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium text-neutral-700 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer">
          <span className="font-semibold text-neutral-900">InsanexAI</span>
          <span className="text-xs text-neutral-400 font-normal px-1.5 py-0.5 bg-neutral-100 rounded">1.0</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Export Dropdown (visible when active conversation has messages) */}
        {hasMessages && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-xs font-medium cursor-pointer"
              title="Export conversation (TXT, Markdown, PDF)"
              aria-label="Export conversation"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-neutral-200 rounded-xl shadow-lg p-1.5 z-30 animate-fade-in text-xs select-none">
                <button
                  onClick={() => {
                    exportChatAsMarkdown(activeConversation)
                    setShowExportMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-left cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-neutral-500" />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  onClick={() => {
                    exportChatAsTxt(activeConversation)
                    setShowExportMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-neutral-500" />
                  <span>Plain Text (.txt)</span>
                </button>
                <button
                  onClick={() => {
                    exportChatAsPdf(activeConversation)
                    setShowExportMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors text-left cursor-pointer border-t border-neutral-100 mt-1 pt-2"
                >
                  <Printer className="w-4 h-4 text-neutral-500" />
                  <span>PDF Document (.pdf)</span>
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onNewChat}
          disabled={loading}
          className="flex items-center gap-1.5 p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors disabled:opacity-40"
          title="New chat"
          aria-label="New chat"
        >
          <SquarePen className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-medium text-neutral-600">New</span>
        </button>

        {user ? (
          <div
            className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold uppercase shadow-2xs"
            title={`${user.name} (${user.email})`}
          >
            {user.name ? user.name.charAt(0) : 'U'}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="text-xs font-medium px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}
