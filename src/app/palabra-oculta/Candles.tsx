'use client'

import { useEffect, useRef, useState } from 'react'
import { playCandleExtinguish } from '@/lib/sounds'

const CANDLE_COUNT = 6

// Each candle has a wax body + wick + flame. The flame's `state` controls
// rendering: 'lit' = flickering, 'extinguishing' = fade-out animation,
// 'out' = no flame. When the puzzle is won, all remaining lit candles get
// the celebratory pulse.
type CandleState = 'lit' | 'extinguishing' | 'out'

export default function Candles({
  errors,
  celebrate = false,
}: {
  errors: number
  celebrate?: boolean
}) {
  const prevErrors = useRef(errors)
  const [states, setStates] = useState<CandleState[]>(Array(CANDLE_COUNT).fill('lit'))

  useEffect(() => {
    const diff = errors - prevErrors.current
    if (diff > 0) {
      // Apagar las velas necesarias: la próxima desde la derecha que esté 'lit'
      setStates(prev => {
        const next = [...prev]
        let toExtinguish = diff
        for (let i = next.length - 1; i >= 0 && toExtinguish > 0; i--) {
          if (next[i] === 'lit') {
            next[i] = 'extinguishing'
            toExtinguish--
            playCandleExtinguish()
          }
        }
        return next
      })
      // Tras la animación de extinguir, marcar como 'out'
      const t = setTimeout(() => {
        setStates(prev => prev.map(s => (s === 'extinguishing' ? 'out' : s)))
      }, 750)
      prevErrors.current = errors
      return () => clearTimeout(t)
    }
    prevErrors.current = errors
  }, [errors])

  return (
    <div className="flex justify-center items-end gap-3 sm:gap-4 px-2">
      {states.map((state, i) => (
        <Candle key={i} state={state} celebrate={celebrate && state === 'lit'} />
      ))}
    </div>
  )
}

function Candle({ state, celebrate }: { state: CandleState; celebrate: boolean }) {
  const flameClass =
    state === 'out'
      ? ''
      : state === 'extinguishing'
        ? 'candle-extinguishing'
        : celebrate
          ? 'candle-celebrate'
          : 'candle-flame'

  return (
    <div className="relative flex flex-col items-center">
      {/* Llama */}
      <div className="relative w-4 h-7 mb-0.5">
        {state !== 'out' && (
          <span
            className={`absolute left-1/2 bottom-0 ${flameClass}`}
            style={{
              width: 12,
              height: 22,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              background:
                'radial-gradient(ellipse at 50% 75%, #fff7d6 0%, #fde68a 30%, #f59e0b 60%, #ea580c 90%)',
              transformOrigin: '50% 100%',
            }}
          />
        )}
      </div>
      {/* Mecha */}
      <span className="block w-0.5 h-1.5 bg-gray-900" />
      {/* Cuerpo de la vela */}
      <div
        className="rounded-sm"
        style={{
          width: 14,
          height: 36,
          background: 'linear-gradient(to bottom, #fef3c7 0%, #fde68a 35%, #d97706 100%)',
          boxShadow: 'inset -2px 0 4px rgba(120, 53, 15, 0.45), 0 4px 8px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
