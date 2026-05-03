'use client'

import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import Confetti from '@/components/Confetti'
import GoldenParticles from '@/components/GoldenParticles'
import { getXpProgress, totalXpForLevel } from '@/lib/xp'

// Cartel animado de fin de actividad: estrellas (1-3) + barra XP que sube
// + posible aviso de level up. Se monta como overlay full-screen.
//
// Para calcular la animación de la barra XP el caller debe pasar:
//   xpBefore = totalXp ANTES de otorgar la recompensa
//   xpAfter  = totalXp DESPUÉS de otorgarla
//   xpEarned = cuánto sumaste en esta actividad
//
// El componente calcula nivel viejo/nuevo y dispara el "LEVEL UP" si difieren.
export default function ResultCard({
  open,
  stars,
  title,
  subtitle,
  pointsEarned,
  xpEarned,
  xpBefore,
  xpAfter,
  onClose,
}: {
  open: boolean
  stars: 1 | 2 | 3
  title: string
  subtitle?: string
  pointsEarned?: number
  xpEarned: number
  xpBefore: number
  xpAfter: number
  onClose: () => void
}) {
  const [shownStars, setShownStars] = useState(0)
  const [progressOn, setProgressOn] = useState(false)

  const before = getXpProgress(xpBefore)
  const after  = getXpProgress(xpAfter)
  const leveledUp = after.level > before.level

  // Calcular barras de animación: si subió de nivel, animamos en dos fases:
  //   1) llenar hasta 100% del nivel viejo
  //   2) reset a 0 y llenar hasta after.percentage del nuevo nivel
  // Para simplicidad y porque las animaciones consecutivas con CSS son finicky,
  // mostramos UNA barra que arranca en before.percentage y se llena hasta:
  //   - after.percentage si NO subió de nivel
  //   - 100% si subió (con badge LEVEL UP overlay)
  const startPct = before.percentage
  const endPct   = leveledUp ? 100 : after.percentage

  useEffect(() => {
    if (!open) {
      setShownStars(0); setProgressOn(false)
      return
    }
    // Caída secuencial de estrellas
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i <= stars; i++) {
      timers.push(setTimeout(() => setShownStars(i), 250 * i))
    }
    // Barra XP sube después de que cayeron las estrellas
    timers.push(setTimeout(() => setProgressOn(true), 250 * stars + 200))
    return () => { timers.forEach(clearTimeout) }
  }, [open, stars])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-bounce-in">
      {stars === 3 && <Confetti active />}
      {leveledUp && <GoldenParticles active density={120} />}

      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#1a0a4e] via-[#0f0a2e] to-[#1a0a4e] border-2 border-purple-500/60 rounded-3xl p-6 shadow-[0_0_60px_rgba(124,58,237,0.5)]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <h2 className="font-bebas text-3xl text-white text-center leading-none">{title}</h2>
        {subtitle && <p className="text-purple-200/80 text-center text-sm mt-1">{subtitle}</p>}

        {/* Estrellas */}
        <div className="flex items-center justify-center gap-3 mt-5 min-h-[60px]">
          {[1, 2, 3].map(i => {
            const earned = i <= stars
            const visible = i <= shownStars
            if (!earned) {
              return (
                <Star key={i} size={42} className="text-gray-700/40" />
              )
            }
            return (
              <Star
                key={i}
                size={48}
                fill="#fbbf24"
                className={`text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] ${visible ? 'animate-star-drop' : 'opacity-0'}`}
                style={{ animationDelay: `${(i - 1) * 0.05}s` }}
              />
            )
          })}
        </div>

        {/* Métricas */}
        <div className={`grid ${pointsEarned !== undefined ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-5`}>
          {pointsEarned !== undefined && (
            <div className="bg-yellow-900/25 border border-yellow-700/40 rounded-xl p-3 text-center">
              <p className="text-yellow-300/80 text-[10px] uppercase tracking-wider">Puntos</p>
              <p className="font-bebas text-2xl text-yellow-200 leading-none mt-0.5">+{pointsEarned}</p>
            </div>
          )}
          <div className="bg-cyan-900/25 border border-cyan-700/40 rounded-xl p-3 text-center">
            <p className="text-cyan-300/80 text-[10px] uppercase tracking-wider">XP</p>
            <p className="font-bebas text-2xl text-cyan-200 leading-none mt-0.5">+{xpEarned}</p>
          </div>
        </div>

        {/* Nivel + barra XP */}
        <div className="mt-5">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-purple-200 text-xs">
              Nivel <span className="font-bebas text-lg text-white align-baseline">{after.level}</span>
            </span>
            <span className="text-purple-300/70 text-[11px] tabular-nums">
              {after.level >= 50
                ? 'NIVEL MÁXIMO'
                : `${after.currentXp} / ${after.requiredXp} XP`}
            </span>
          </div>
          <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-purple-700/40">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-400 origin-left"
              style={{
                width: '100%',
                transform: `scaleX(${(progressOn ? endPct : startPct) / 100})`,
                transition: 'transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </div>
        </div>

        {/* Level up overlay */}
        {leveledUp && progressOn && (
          <div className="mt-4 text-center animate-level-up">
            <p className="text-amber-300 text-xs uppercase tracking-[0.3em] font-bold">¡LEVEL UP!</p>
            <p className="font-bebas text-4xl text-white leading-none mt-1" style={{ textShadow: '0 0 18px rgba(251,191,36,0.9)' }}>
              NIVEL {after.level}
            </p>
            {after.level === 50 && (
              <p className="text-amber-300 text-xs mt-1">🏆 Guardián de la Palabra</p>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:brightness-110 text-white font-bold py-3 rounded-xl transition-all"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

// Helper exportado para que los callers calculen el nivel viejo si solo tienen xpAfter
export function levelFromXp(xp: number) {
  return getXpProgress(xp).level
}

export { totalXpForLevel }
