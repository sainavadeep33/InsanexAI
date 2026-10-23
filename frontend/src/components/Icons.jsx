import React from 'react'

/**
 * Minimalist geometric AI spark icon for InsanexAI.
 * Clean, elegant, monochrome without neon gradients.
 */
export function SparkleIcon({ className = "w-5 h-5", strokeWidth = 1.75 }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <path d="m4.93 4.93 2.83 2.83M16.24 16.24l2.83 2.83" />
      <path d="m4.93 19.07 2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.12" />
    </svg>
  )
}

/**
 * InsanexAI Text Logo with minimalist AI icon.
 */
export function InsanexLogo({ className = "", iconSize = "w-5 h-5", textSize = "text-base" }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-900 text-white shadow-xs">
        <SparkleIcon className={iconSize} strokeWidth={2} />
      </div>
      <span className={`font-semibold tracking-tight text-neutral-900 ${textSize}`}>
        Insanex<span className="text-neutral-500 font-normal">AI</span>
      </span>
    </div>
  )
}
