'use client'

import { useEffect, useState } from 'react'

// Two-layer crossfading slideshow. Each tick swaps which div is on top by
// flipping opacity, then advances the underlying source on the hidden one.
export default function CrossfadeSlideshow({
  images,
  intervalMs = 3000,
  fadeMs     = 1500,
  className  = '',
  overlay    = true,
}: {
  images: string[]
  intervalMs?: number
  fadeMs?: number
  className?: string
  overlay?: boolean
}) {
  const [topIdx, setTopIdx] = useState(0)
  const [topOnA, setTopOnA] = useState(true) // which layer (A or B) is currently visible

  useEffect(() => {
    if (images.length < 2) return
    const id = setInterval(() => {
      setTopIdx(i => (i + 1) % images.length)
      setTopOnA(v => !v)
    }, intervalMs)
    return () => clearInterval(id)
  }, [images.length, intervalMs])

  if (images.length === 0) return null

  // The two layers always show consecutive frames; the visible one is the
  // current `topIdx`, the hidden one preloads the next.
  const visibleSrc = images[topIdx]
  const nextSrc    = images[(topIdx + 1) % images.length]
  const aSrc = topOnA ? visibleSrc : nextSrc
  const bSrc = topOnA ? nextSrc    : visibleSrc

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url('${aSrc}')`,
          opacity: topOnA ? 1 : 0,
          transition: `opacity ${fadeMs}ms ease-in-out`,
        }}
      />
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url('${bSrc}')`,
          opacity: topOnA ? 0 : 1,
          transition: `opacity ${fadeMs}ms ease-in-out`,
        }}
      />
      {overlay && (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.92) 100%)' }}
        />
      )}
    </div>
  )
}
