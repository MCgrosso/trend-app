'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Lock, Play, Check, Trophy, Sparkles } from 'lucide-react'
import Logo from '@/components/Logo'
import CrossfadeSlideshow from '@/components/CrossfadeSlideshow'
import GoldenParticles from '@/components/GoldenParticles'
import { FRAME_MAP } from '@/lib/frames'
import type { EventChallenge, EventProgress } from '@/lib/types'

const SLIDESHOW = [
  '/david_pastor.png',
  '/david_musico.png',
  '/david_ungido.png',
  '/david_batalla.png',
  '/goliat_batalla.png',
  '/oso_batalla.png',
  '/leon_batalla.png',
]

const pad = (n: number) => n.toString().padStart(2, '0')

function formatUnlockDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function EventosClient({
  challenges,
  progress,
  isLoggedIn,
}: {
  challenges: EventChallenge[]
  progress: EventProgress[]
  isLoggedIn: boolean
}) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0)
    const tick  = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearTimeout(first); clearInterval(tick) }
  }, [])

  const progressById = new Map(progress.map(p => [p.challenge_day_id, p]))
  const currentMs = now ?? 0

  // Día activo actual = primer día desbloqueado (unlock_date <= now) que no esté completado
  const activeDay = challenges.find(c => {
    const unlockMs = new Date(c.unlock_date).getTime()
    return unlockMs <= currentMs && !progressById.get(c.id)?.completed
  })

  const completedCount = progress.filter(p => p.completed).length
  const allDone = completedCount >= 7

  // Próximo día no desbloqueado (para el contador grande)
  const nextLocked = challenges.find(c => new Date(c.unlock_date).getTime() > currentMs)
  const countdown = (() => {
    if (!nextLocked || now === null) return null
    const diff = new Date(nextLocked.unlock_date).getTime() - currentMs
    if (diff <= 0) return null
    const totalSec = Math.floor(diff / 1000)
    return {
      d: Math.floor(totalSec / 86400),
      h: Math.floor((totalSec % 86400) / 3600),
      m: Math.floor((totalSec % 3600) / 60),
      s: totalSec % 60,
    }
  })()

  return (
    <div className="min-h-screen relative overflow-hidden">
      <CrossfadeSlideshow images={SLIDESHOW} intervalMs={3000} fadeMs={1500} />
      <GoldenParticles active density={70} className="z-[1]" />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-4 max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 text-amber-200/90 hover:text-amber-100 text-sm transition-colors drop-shadow">
            <ChevronLeft size={18} /> Volver
          </Link>
          <Logo size="sm" />
        </header>

        <div className="px-4 max-w-lg mx-auto pb-12 space-y-6">
          {/* Hero */}
          <div className="text-center space-y-2">
            <p className="text-amber-300 text-xs uppercase tracking-[0.3em] font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              ✦ Evento Especial ✦
            </p>
            <h1
              className="font-bebas text-5xl sm:text-6xl text-amber-200 leading-none"
              style={{ textShadow: '0 0 24px rgba(251,191,36,0.7), 0 4px 18px rgba(0,0,0,0.95)' }}
            >
              EL VALLE DE ELÁ
            </h1>
            <p className="text-amber-100/90 text-sm italic drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              7 días con David
            </p>
          </div>

          {/* Estado actual: contador o día activo */}
          {activeDay ? (
            <div className="bg-black/55 backdrop-blur-sm border-2 border-amber-400/70 rounded-2xl p-4 text-center animate-event-glow">
              <p className="text-amber-300 text-[10px] uppercase tracking-widest font-bold">Día activo</p>
              <p className="font-bebas text-3xl text-white leading-none mt-1">DÍA {activeDay.day_number} DE 7</p>
              <p className="text-amber-100 text-xs mt-1">{activeDay.title}</p>
            </div>
          ) : countdown ? (
            <div className="bg-black/55 backdrop-blur-sm border border-amber-500/50 rounded-2xl p-4 text-center">
              <p className="text-amber-300 text-[10px] uppercase tracking-widest font-bold">
                {nextLocked && nextLocked.day_number === 1 ? 'Empieza en' : `Día ${nextLocked?.day_number ?? '—'} en`}
              </p>
              <p className="font-bebas text-3xl text-amber-200 tabular-nums mt-1">
                {countdown.d > 0 ? `${countdown.d}d ` : ''}{pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
              </p>
            </div>
          ) : allDone ? (
            <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 backdrop-blur-sm border-2 border-amber-400 rounded-2xl p-4 text-center shadow-[0_0_30px_rgba(251,191,36,0.5)]">
              <Trophy size={28} className="text-amber-200 mx-auto mb-1" />
              <p className="font-bebas text-2xl text-amber-100 leading-none">¡COMPLETASTE EL VIAJE!</p>
              <p className="text-amber-200/90 text-xs mt-1">Avatar David desbloqueado</p>
            </div>
          ) : null}

          {/* Barra de progreso */}
          {isLoggedIn && (
            <div className="bg-black/45 backdrop-blur-sm border border-amber-700/40 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-amber-200">Tu progreso</span>
                <span className="text-amber-100 font-bold">{completedCount}/7 días</span>
              </div>
              <div className="h-2.5 bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-700"
                  style={{ width: `${(completedCount / 7) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Lista de los 7 días */}
          <div className="space-y-3">
            {challenges.map(c => {
              const unlockMs = new Date(c.unlock_date).getTime()
              const locked   = currentMs > 0 && unlockMs > currentMs
              const myProg   = progressById.get(c.id)
              const completed = myProg?.completed ?? false
              const isActive = !locked && !completed
              const frame = c.frame_reward ? FRAME_MAP[c.frame_reward] : null

              return (
                <div
                  key={c.id}
                  className={`relative rounded-2xl border p-4 transition-all backdrop-blur-sm ${
                    completed
                      ? 'bg-emerald-900/40 border-emerald-500/50'
                      : isActive
                        ? 'bg-amber-900/40 border-amber-400/70 animate-event-glow'
                        : 'bg-black/55 border-gray-700/50 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Day badge */}
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border-2 ${
                      completed ? 'bg-emerald-600/40 border-emerald-400/70' :
                      isActive  ? 'bg-amber-500/40 border-amber-300' :
                                  'bg-gray-800/60 border-gray-600/40'
                    }`}>
                      <span className="text-[8px] uppercase tracking-wider text-white/70 font-bold leading-none">Día</span>
                      <span className={`font-bebas text-2xl leading-none ${completed ? 'text-emerald-200' : isActive ? 'text-amber-100' : 'text-gray-400'}`}>{c.day_number}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-bold ${completed ? 'text-emerald-100' : isActive ? 'text-amber-100' : 'text-gray-400'}`}>{c.title}</p>
                      <p className={`text-xs ${completed ? 'text-emerald-200/80' : isActive ? 'text-amber-200/90' : 'text-gray-500'} italic`}>{c.subtitle}</p>

                      {locked && (
                        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-400">
                          <Lock size={11} /> Se desbloquea: {formatUnlockDate(c.unlock_date)}
                        </p>
                      )}

                      {completed && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                            <Check size={12} /> Completado
                          </span>
                          {c.format === 'rpg' && (
                            <span className="text-amber-300">{myProg?.score ?? 0}/5 ⚔️</span>
                          )}
                        </div>
                      )}

                      {completed && frame && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider"
                          style={{ borderColor: frame.previewColor, color: frame.previewColor, backgroundColor: `${frame.previewColor}22` }}>
                          {frame.emoji ?? '◆'} {frame.label}
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    {isActive && (
                      <Link
                        href={`/eventos/dia/${c.day_number}`}
                        className="flex-shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-stone-900 text-xs font-bold px-3 py-2 rounded-xl shadow-lg shadow-amber-900/50"
                      >
                        <Play size={12} /> Jugar
                      </Link>
                    )}
                    {locked && (
                      <Lock size={18} className="text-gray-600 mt-1" />
                    )}
                    {completed && (
                      <Link
                        href={`/eventos/dia/${c.day_number}`}
                        className="flex-shrink-0 text-emerald-300 hover:text-emerald-100 text-xs underline"
                      >
                        Ver
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {allDone && (
            <Link
              href="/profile"
              className="block bg-gradient-to-br from-amber-600/40 to-yellow-700/30 border-2 border-amber-400 rounded-2xl p-5 text-center hover:brightness-110 transition-all"
            >
              <Sparkles size={28} className="text-amber-200 mx-auto mb-1" />
              <p className="font-bebas text-2xl text-white">🏆 AVATAR DAVID DESBLOQUEADO</p>
              <p className="text-amber-200 text-xs mt-1">Equipalo desde tu perfil</p>
            </Link>
          )}

          {!isLoggedIn && (
            <div className="bg-black/60 border border-amber-500/40 rounded-xl p-4 text-center">
              <p className="text-amber-100 text-sm">Ingresá para participar del evento</p>
              <Link href="/login" className="inline-block mt-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold text-sm px-4 py-2 rounded-full">
                Ingresar
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
