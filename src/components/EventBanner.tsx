'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Calendar, ChevronRight } from 'lucide-react'

// Miércoles 30 de abril de 2026 a las 22:00 hs (Argentina, GMT-3)
// Expresado como UTC fija para que no dependa de la zona horaria del cliente.
const TARGET_MS = Date.UTC(2026, 3, 1, 1, 0, 0) // 2026-05-01 01:00 UTC = 2026-04-30 22:00 UTC-3

interface Remaining { d: number; h: number; m: number; s: number; done: boolean }

function computeRemaining(nowMs: number): Remaining {
  const diff = TARGET_MS - nowMs
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true }
  const totalSec = Math.floor(diff / 1000)
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
    done: false,
  }
}

const pad = (n: number) => n.toString().padStart(2, '0')

export default function EventBanner() {
  // SSR-stable placeholder (matches server HTML); the interval below flips
  // `liveNow` to the real wall clock on the next macrotask after mount.
  const [liveNow, setLiveNow] = useState<number | null>(null)

  useEffect(() => {
    // First update is queued (not synchronous) so it doesn't cascade the mount render.
    const first = setTimeout(() => setLiveNow(Date.now()), 0)
    const tick  = setInterval(() => setLiveNow(Date.now()), 1000)
    return () => { clearTimeout(first); clearInterval(tick) }
  }, [])

  const remaining = liveNow === null ? null : computeRemaining(liveNow)
  const label = remaining === null
    ? '— días --:--:--'
    : remaining.done
      ? '¡El evento ya empezó!'
      : `${remaining.d} día${remaining.d === 1 ? '' : 's'} ${pad(remaining.h)}:${pad(remaining.m)}:${pad(remaining.s)}`

  return (
    <Link
      href="/eventos"
      className="relative block rounded-3xl overflow-hidden border-2 border-amber-500/60 animate-event-glow"
      style={{ aspectRatio: '1983 / 793' }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: 'url(/dyg.png)' }}
        aria-hidden
      />

      {/* Dark overlay — transparent on sides, dark in center for text contrast */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center text-center px-4 py-3">
        <span className="inline-flex items-center gap-1.5 bg-amber-500/25 border border-amber-300/60 text-amber-100 text-[10px] font-bold uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full">
          <Calendar size={10} /> Evento Especial
        </span>

        <h2
          className="font-bebas text-white leading-none mt-2"
          style={{ fontSize: 'clamp(22px, 7vw, 40px)', textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}
        >
          El Valle de Elá
        </h2>

        <p className="text-amber-100/90 text-[11px] italic mt-0.5 drop-shadow">
          ¿Conocés la historia completa?
        </p>

        <div className="mt-1.5 flex items-baseline gap-2 font-bebas text-amber-300 tabular-nums"
             style={{ fontSize: 'clamp(14px, 4vw, 22px)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
          <span>{label}</span>
        </div>

        <span className="mt-1.5 inline-flex items-center gap-1 bg-black/45 border border-amber-400/60 text-amber-100 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
          Ver más <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  )
}
