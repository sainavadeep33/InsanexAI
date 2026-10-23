import React, { useState } from 'react'
import {
  PanelLeftClose,
  SquarePen,
  Search,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  Sparkles,
  Settings,
  User,
  LogOut,
  LogIn,
} from 'lucide-react'
import { InsanexLogo } from './Icons'

export default function Sidebar({
  isOpen,
  onToggle,
  isMobileOpen,
  onMobileClose,
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  loading,
  user,
  onOpenAuth,
  onLogout,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingChatId, setEditingChatId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [deletingChatId, setDeletingChatId] = useState(null)

  // Filter both conversation titles AND message body text
  const filteredChats = chats.filter((chat) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const titleMatch = (chat.title || 'Untitled conversation').toLowerCase().includes(q)
    const contentMatch = (chat.messages || []).some((m) =>
      (m.text || '').toLowerCase().includes(q) ||
      (m.attachment?.name || '').toLowerCase().includes(q)
    )
    return titleMatch || contentMatch
  })

  const handleStartRename = (e, chat) => {
    e.stopPropagation()
    setEditingChatId(chat.id)
    setEditTitle(chat.title || 'Untitled conversation')
    setDeletingChatId(null)
  }

  const handleSaveRename = (e, chatId) => {
    e.stopPropagation()
    const trimmed = editTitle.trim()
    if (trimmed && onRenameChat) {
      onRenameChat(chatId, trimmed)
    }
    setEditingChatId(null)
  }

  const handleCancelRename = (e) => {
    e.stopPropagation()
    setEditingChatId(null)
  }

  const handleConfirmDelete = (e, chatId) => {
    e.stopPropagation()
    if (onDeleteChat) {
      onDeleteChat(chatId)
    }
    setDeletingChatId(null)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#f9f9f9] border-r border-neutral-200 text-neutral-800 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-3 h-14 border-b border-neutral-200/60">
        <InsanexLogo />
        <div className="flex items-center gap-1">
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Desktop collapse button */}
          <button
            onClick={onToggle}
            className="hidden md:flex p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons: New Chat & Search */}
      <div className="px-3 pt-3 pb-2 space-y-2">
        <button
          onClick={onNewChat}
          disabled={loading}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-neutral-800 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:border-neutral-300 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <SquarePen className="w-4 h-4 text-neutral-600" />
            <span>New chat</span>
          </div>
          <span className="text-xs text-neutral-400 font-mono">⌘K</span>
        </button>

        {/* Search Input (Searches Titles + Messages) */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles & messages..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-neutral-100/80 border border-transparent rounded-lg text-neutral-800 placeholder-neutral-400 focus:bg-white focus:border-neutral-300 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
            Recent Chats
          </span>
          {chats.length > 0 && (
            <span className="text-[10px] text-neutral-400">
              {filteredChats.length} {filteredChats.length === 1 ? 'chat' : 'chats'}
            </span>
          )}
        </div>

        {filteredChats.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-neutral-400">
            {searchQuery ? (
              <div className="space-y-1.5">
                <p>No chats matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-neutral-900 underline font-medium hover:text-neutral-600 cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium text-neutral-600">No conversations yet</p>
                <p className="text-[11px] text-neutral-400">Start a new chat to begin</p>
              </div>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = activeChat === chat.id
            const isEditing = editingChatId === chat.id
            const isDeleting = deletingChatId === chat.id

            if (isDeleting) {
              return (
                <div
                  key={chat.id}
                  className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 space-y-1.5 my-1"
                >
                  <p className="font-medium text-[11px]">Delete this conversation?</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingChatId(null)
                      }}
                      className="px-2 py-0.5 text-[11px] rounded bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => handleConfirmDelete(e, chat.id)}
                      className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white font-medium hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={chat.id}
                onClick={() => {
                  if (!isEditing) onSelectChat(chat.id)
                }}
                className={`group relative flex items-center justify-between px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-neutral-200/80 font-medium text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-100/90 hover:text-neutral-900'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(e, chat.id)
                        if (e.key === 'Escape') handleCancelRename(e)
                      }}
                      className="flex-1 px-1.5 py-0.5 text-xs bg-white border border-neutral-300 rounded text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                    <button
                      onClick={(e) => handleSaveRename(e, chat.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      title="Save title"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1 text-neutral-400 hover:bg-neutral-200 rounded"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0 pr-12">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-neutral-800' : 'text-neutral-400'
                        }`}
                      />
                      <span className="truncate">{chat.title || 'Untitled conversation'}</span>
                    </div>

                    {/* Actions: Rename & Delete (visible on hover or if active) */}
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(e, chat)}
                        className="p-1 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/70 rounded transition-colors"
                        title="Rename conversation"
                        aria-label="Rename conversation"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingChatId(chat.id)
                          setEditingChatId(null)
                        }}
                        className="p-1 text-neutral-400 hover:text-red-600 hover:bg-neutral-200/70 rounded transition-colors"
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Sidebar Footer: User Profile / Auth */}
      <div className="p-3 border-t border-neutral-200/70 bg-[#f7f7f7]">
        {user ? (
          <div className="flex items-center justify-between text-xs text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-200/50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-semibold shrink-0 uppercase">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 truncate text-xs">{user.name}</p>
                <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors cursor-pointer"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-200 ease-in-out shrink-0 overflow-hidden ${
          isOpen ? 'w-64' : 'w-0'
        }`}
      >
        <div className="w-64 h-full">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-2xs"
          onClick={onMobileClose}
        />
        {/* Drawer panel */}
        <div
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] transform transition-transform duration-200 ease-in-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  )
}
