import React, { useState } from 'react'
import { X, Lock, Mail, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { InsanexLogo } from './Icons'
import { API_BASE_URL } from '../config/api'

const API_URL = API_BASE_URL

export default function AuthModal({ isOpen, onClose, onSuccess, isStandalone = false }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen && !isStandalone) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (isSignUp && name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).')
      return
    }

    setLoading(true)

    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login'
      const payload = isSignUp
        ? { name: name.trim(), email: trimmedEmail, password }
        : { email: trimmedEmail, password }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication request failed. Please try again.')
      }

      // Success
      localStorage.setItem('insanexai-token', data.token)
      localStorage.setItem('insanexai-user', JSON.stringify(data.user))
      onSuccess(data.user, data.token)
      if (onClose) onClose()
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const modalForm = (
    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 z-10">
      {/* Close Button - hidden in standalone mode */}
      {!isStandalone && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <InsanexLogo iconSize="w-5 h-5" textSize="text-lg" />
          <h2 className="mt-3 text-lg font-semibold text-neutral-900">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            {isSignUp
              ? 'Sign up to sync and securely access your AI chats'
              : 'Enter your credentials to access your account'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-700 leading-relaxed">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-9 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
          </button>
        </form>

        {/* Toggle between Login and Sign Up */}
        <div className="mt-5 text-center text-xs text-neutral-500">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false)
                  setError('')
                }}
                className="font-semibold text-neutral-900 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true)
                  setError('')
                }}
                className="font-semibold text-neutral-900 hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    )

  if (isStandalone) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-[#f9f9f9] select-none animate-fade-in">
        {modalForm}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in select-none">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />
      {modalForm}
    </div>
  )
}
