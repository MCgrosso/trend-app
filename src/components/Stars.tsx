'use client'

import { useEffect, useState } from 'react'

interface Star {
  x: number; y: number
  size: number
  delay: number
  duration: number
  opacity: number
}

export default function Stars({ count = 90 }: { count?: number }) {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    setStars(
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.8 + 0.5,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
        opacity: Math.random() * 0.6 + 0.4,
      }))
    )
  }, [count])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Deep space nebula glows */}
      <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)' }} />
      <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08), transparent 70%)' }} />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08), transparent 70%)' }} />

      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            boxShadow: s.size > 1.5 ? '0 0 6px rgba(255,255,255,0.8)' : undefined,
          }}
        />
      ))}
    </div>
  )
}
