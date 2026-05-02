'use client'

import { useEffect, useRef, useState } from 'react'

export default function HpBar({
  current,
  max,
  side,
  color = 'green',
  label,
}: {
  current: number
  max: number
  side: 'left' | 'right'
  color?: 'green' | 'red'
  label: string
}) {
  const [shake, setShake] = useState(false)
  const prevRef = useRef(current)

  // Trigger shake animation when current goes down
  useEffect(() => {
    if (current < prevRef.current) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 400)
      prevRef.current = current
      return () => clearTimeout(t)
    }
    prevRef.current = current
  }, [current])

  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const fill =
    color === 'green'
      ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-300'
      : 'bg-gradient-to-r from-red-700 via-red-500 to-rose-400'
  const border =
    color === 'green'
      ? 'border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
      : 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)]'

  return (
    <div className={`w-full max-w-[180px] ${shake ? 'animate-shake-tiny' : ''}`}>
      <div className={`flex items-baseline gap-2 mb-1 ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="text-white text-xs font-bold uppercase tracking-wider drop-shadow">{label}</span>
        <span className="text-white/80 text-[10px] tabular-nums">{current}/{max}</span>
      </div>
      <div className={`h-3 rounded-full bg-black/60 border ${border} overflow-hidden`}>
        <div
          className={`h-full ${fill} transition-all duration-500 ease-out`}
          style={{
            width: `${pct}%`,
            ...(side === 'right' ? { marginLeft: 'auto' } : null),
          }}
        />
      </div>
    </div>
  )
}
