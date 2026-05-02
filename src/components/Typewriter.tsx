'use client'

import { useEffect, useRef, useState } from 'react'

// Renders text char-by-char with optional skip-to-end button.
// Re-renders cleanly when `text` prop changes (used to play multiple paragraphs).
export default function Typewriter({
  text,
  speed = 28,
  onDone,
  className = '',
}: {
  text: string
  speed?: number
  onDone?: () => void
  className?: string
}) {
  const [shown, setShown] = useState('')
  const [done, setDone]   = useState(false)
  const idxRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    setShown('')
    setDone(false)
    idxRef.current = 0
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    function tick() {
      const i = idxRef.current
      if (i >= text.length) {
        setDone(true)
        onDoneRef.current?.()
        return
      }
      const ch = text[i]
      setShown(prev => prev + ch)
      idxRef.current = i + 1
      // Punctuation pause: longer beat after period or paragraph break
      const delay = ch === '\n' ? speed * 6 : (ch === '.' || ch === '?' || ch === '!') ? speed * 4 : speed
      timeoutRef.current = setTimeout(tick, delay)
    }

    timeoutRef.current = setTimeout(tick, speed)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [text, speed])

  function skip() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShown(text)
    setDone(true)
    onDoneRef.current?.()
  }

  return (
    <div className={`relative ${className}`} onClick={skip}>
      <p className="whitespace-pre-line">{shown}{!done && <span className="inline-block w-2 h-4 bg-current ml-0.5 align-middle animate-pulse" />}</p>
    </div>
  )
}
