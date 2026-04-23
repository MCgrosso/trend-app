'use client'

import Link from 'next/link'
import Image from 'next/image'
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
      {/* 1. Base animated background — orange-gold gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, #FF6B00 0%, #C4440A 45%, #8B3A00 100%)',
        }}
        aria-hidden
      />

      {/* 2. Anime speed lines — three stacked layers at different thicknesses & speeds */}
      <div className="speed-lines speed-lines-thick" aria-hidden />
      <div className="speed-lines speed-lines-med"   aria-hidden />
      <div className="speed-lines speed-lines-thin"  aria-hidden />

      {/* 3. Inner gold vignette / edge glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow:
            'inset 0 0 30px rgba(251, 191, 36, 0.55), inset 0 0 80px rgba(234, 88, 12, 0.45)',
        }}
        aria-hidden
      />

      {/* 4. The actual character image — object-contain so David & Goliath stay intact */}
      <Image
        src="/dyg.png"
        alt=""
        aria-hidden
        fill
        priority
        sizes="(max-width: 640px) 100vw, 512px"
        className="object-contain select-none pointer-events-none"
        draggable={false}
      />

      {/* 5. Content — each text block carries its own dark backdrop for legibility */}
      <div className="relative h-full flex flex-col items-center justify-center text-center px-4 py-3 gap-1.5">
        <span className="inline-flex items-center gap-1.5 bg-black/55 backdrop-blur-sm border border-amber-300/70 text-amber-100 text-[10px] font-bold uppercase tracking-[0.25em] px-2.5 py-0.5 rounded-full">
          <Calendar size={10} /> Evento Especial
        </span>

        <h2
          className="font-bebas text-white leading-none px-3 py-0.5 rounded-md"
          style={{
            fontSize: 'clamp(22px, 7vw, 40px)',
            textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.8)',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          El Valle de Elá
        </h2>

        <p
          className="text-amber-100 text-[11px] italic px-2 rounded-md"
          style={{
            textShadow: '0 1px 4px rgba(0,0,0,0.95)',
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        >
          ¿Conocés la historia completa?
        </p>

        <div
          className="flex items-baseline gap-2 font-bebas text-amber-300 tabular-nums px-3 py-0.5 rounded-md"
          style={{
            fontSize: 'clamp(14px, 4vw, 22px)',
            textShadow: '0 1px 4px rgba(0,0,0,0.95)',
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
        >
          <span>{label}</span>
        </div>

        <span className="inline-flex items-center gap-1 bg-black/60 border border-amber-400/70 text-amber-100 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
          Ver más <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  )
}
