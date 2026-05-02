'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import Stars from '@/components/Stars'
import GoldenParticles from '@/components/GoldenParticles'
import Typewriter from '@/components/Typewriter'
import { completeDayChallenge } from '../../actions'
import ReflectionForm from './ReflectionForm'
import type { EventChallenge, EventProgress } from '@/lib/types'

type Phase = 'reading' | 'reflection'

export default function NarrativeClient({
  challenge,
  progress,
}: {
  challenge: EventChallenge
  progress: EventProgress | null
}) {
  const router = useRouter()
  const paragraphs = challenge.narrative_text.split(/\n\n+/).map(s => s.trim()).filter(Boolean)
  const [phase, setPhase] = useState<Phase>(progress?.completed ? 'reflection' : 'reading')
  const [paraIdx, setParaIdx]   = useState(0)
  const [paraDone, setParaDone] = useState(false)

  function next() {
    if (paraIdx < paragraphs.length - 1) {
      setParaIdx(i => i + 1)
      setParaDone(false)
    } else {
      // Marcar el día como completado al terminar la lectura
      completeDayChallenge({ challengeId: challenge.id, score: 0 }).catch(() => {})
      setPhase('reflection')
    }
  }

  // Si ya estaba completado y entra otra vez, saltar directo al final de lectura
  useEffect(() => {
    if (progress?.completed) setParaIdx(paragraphs.length - 1)
  }, [progress?.completed, paragraphs.length])

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #1a0f3e 0%, #0a0820 50%, #050310 100%)' }}
    >
      <Stars count={120} />
      <GoldenParticles active density={45} />

      <header className="relative z-10 px-4 pt-6 pb-3 max-w-lg mx-auto flex items-center justify-between">
        <Link href="/eventos" className="flex items-center gap-1 text-amber-200/90 hover:text-amber-100 text-sm">
          <ChevronLeft size={16} /> Salir
        </Link>
        <p className="text-amber-300 text-[10px] uppercase tracking-widest font-bold">Día {challenge.day_number} · {challenge.title}</p>
      </header>

      <div className="relative z-10 px-4 max-w-lg mx-auto pb-10 space-y-5">
        <div className="text-center">
          <p className="text-amber-300 text-xs uppercase tracking-[0.3em] font-bold">📜 Narrativa</p>
          <h1 className="font-bebas text-4xl text-amber-100 mt-1 leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            {challenge.title.toUpperCase()}
          </h1>
          <p className="text-amber-200/80 text-sm mt-1 italic">{challenge.subtitle}</p>
        </div>

        {/* Personaje */}
        {challenge.character_image && (
          <div className="flex justify-center animate-float-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={challenge.character_image}
              alt={challenge.title}
              className="w-44 h-44 sm:w-52 sm:h-52 object-contain drop-shadow-[0_8px_24px_rgba(251,191,36,0.45)]"
            />
          </div>
        )}

        {phase === 'reading' && (
          <>
            <div className="bg-gradient-to-b from-amber-100/95 to-yellow-50/95 text-stone-900 rounded-2xl border-4 border-yellow-700/60 shadow-2xl shadow-black/60 p-5 min-h-[180px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-yellow-700/80 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                  <BookOpen size={11} /> Pasaje {paraIdx + 1} / {paragraphs.length}
                </p>
              </div>
              <Typewriter
                key={paraIdx}
                text={paragraphs[paraIdx] ?? ''}
                speed={26}
                onDone={() => setParaDone(true)}
                className="text-stone-900 text-sm leading-relaxed"
              />
            </div>

            {paraDone && (
              <button
                onClick={next}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 text-stone-900 font-bold py-3 rounded-xl shadow-lg animate-bounce-in"
              >
                {paraIdx === paragraphs.length - 1 ? 'Ver reflexión' : 'Continuar'} <ChevronRight size={16} />
              </button>
            )}
          </>
        )}

        {phase === 'reflection' && (
          <ReflectionForm
            challengeId={challenge.id}
            prompt={challenge.reflection_prompt ?? ''}
            initialAnswer={progress?.reflection_answer ?? ''}
            initialIsPublic={progress?.is_public ?? false}
            onSaved={() => setTimeout(() => router.push('/eventos'), 1800)}
          />
        )}

        <Link href="/eventos" className="block text-center text-amber-200/80 hover:text-amber-100 text-sm py-1">
          Volver al evento
        </Link>
      </div>
    </div>
  )
}
