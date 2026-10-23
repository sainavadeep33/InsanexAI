/**
 * InsanexAI Multilingual Speech Recognition Engine
 * Wraps browser Web Speech API (webkitSpeechRecognition / SpeechRecognition)
 * Provides genuine multilingual language codes, dynamic detection, and error handling.
 */

export const RECOGNITION_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', flag: '🌐' },
  // Indian Languages
  { code: 'te-IN', name: 'Telugu (తెలుగు)', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam (മലയാളം)', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali (বাংলা)', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi (मराठी)', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🇮🇳' },
  { code: 'ur-IN', name: 'Urdu (اردو)', flag: '🇮🇳' },
  // International Languages
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'ar-SA', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'ja-JP', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'ru-RU', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'pt-BR', name: 'Portuguese (Brasil)', flag: '🇧🇷' },
  { code: 'it-IT', name: 'Italian (Italiano)', flag: '🇮🇹' },
]

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function createSpeechRecognizer({
  language = 'auto',
  onStart,
  onResult,
  onError,
  onEnd,
}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    if (onError) onError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
    return null
  }

  const recognition = new SpeechRecognition()
  recognition.continuous = false // Single speech utterance at a time to prevent background listening
  recognition.interimResults = true // Display speech in real-time as words are spoken
  recognition.maxAlternatives = 1

  // Set language
  if (language === 'auto' || !language) {
    recognition.lang = navigator.language || 'en-US'
  } else {
    recognition.lang = language
  }

  recognition.onstart = () => {
    if (onStart) onStart()
  }

  recognition.onresult = (event) => {
    let interimTranscript = ''
    let finalTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }

    if (onResult) {
      onResult({
        final: finalTranscript.trim(),
        interim: interimTranscript.trim(),
        isFinal: Boolean(finalTranscript),
      })
    }
  }

  recognition.onerror = (event) => {
    let errorMsg = 'An error occurred during speech recognition.'
    switch (event.error) {
      case 'not-allowed':
      case 'permission-denied':
        errorMsg = 'Microphone permission was denied. Please allow microphone access in browser settings.'
        break
      case 'no-speech':
        errorMsg = 'No speech was detected. Please try again.'
        break
      case 'network':
        errorMsg = 'Network error occurred during speech recognition.'
        break
      case 'audio-capture':
        errorMsg = 'No microphone was found. Please check your audio input settings.'
        break
      case 'aborted':
        // User stopped listening, not an error
        return
      default:
        errorMsg = 'Speech recognition error: ' + (event.error || 'unknown')
    }

    if (onError) onError(errorMsg)
  }

  recognition.onend = () => {
    if (onEnd) onEnd()
  }

  try {
    recognition.start()
  } catch (err) {
    if (onError) onError('Unable to start speech recognition. Please try again.')
    return null
  }

  return {
    stop: () => {
      try {
        recognition.stop()
      } catch {}
    },
    abort: () => {
      try {
        recognition.abort()
      } catch {}
    },
  }
}
