import React from 'react'
import { Code, GraduationCap, PenLine, Lightbulb } from 'lucide-react'
import { SparkleIcon } from './Icons'

const suggestions = [
  {
    id: 'coding',
    title: 'Coding',
    description: 'Write clean code, debug issues, or explore architectures',
    prompt: 'Help me write and optimize a clean, modular Python function with type hints and docstrings.',
    icon: Code,
  },
  {
    id: 'learning',
    title: 'Learning',
    description: 'Break down complex concepts with intuitive analogies',
    prompt: 'Explain how neural networks learn, using an intuitive step-by-step analogy.',
    icon: GraduationCap,
  },
  {
    id: 'writing',
    title: 'Writing',
    description: 'Draft articles, polish emails, or rewrite for clarity and tone',
    prompt: 'Help me draft a concise, professional project update email to team leads.',
    icon: PenLine,
  },
  {
    id: 'brainstorming',
    title: 'Brainstorming',
    description: 'Generate fresh angles, creative concepts, and strategies',
    prompt: 'Brainstorm 5 innovative, practical feature ideas for an AI productivity app.',
    icon: Lightbulb,
  },
]

export default function WelcomeScreen({ onSelectSuggestion }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-3xl mx-auto w-full select-none pb-8">
      {/* Icon & Heading */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs mb-5">
          <SparkleIcon className="w-5 h-5" strokeWidth={2} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
          What can I help with?
        </h1>
        <p className="mt-2 text-sm text-neutral-500 max-w-md">
          Ask questions, brainstorm ideas, draft content, or write clean code with InsanexAI.
        </p>
      </div>

      {/* 4 Minimal Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
        {suggestions.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="flex items-start gap-3 p-3.5 text-left bg-white border border-neutral-200/90 rounded-xl hover:border-neutral-300 hover:bg-neutral-50/80 transition-colors cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700 group-hover:text-neutral-900 group-hover:bg-neutral-200/60 transition-colors shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-neutral-800 group-hover:text-neutral-900">
                  {item.title}
                </div>
                <div className="text-[11px] leading-relaxed text-neutral-500 line-clamp-2 mt-0.5">
                  {item.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
