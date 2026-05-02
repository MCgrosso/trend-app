'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Sparkles, Trophy } from 'lucide-react'
import Confetti from '@/components/Confetti'
import GoldenParticles from '@/components/GoldenParticles'
import Typewriter from '@/components/Typewriter'
import { createClient } from '@/lib/supabase/client'
import { completeDayChallenge } from '../../actions'
import ReflectionForm from './ReflectionForm'
import { AVATARS } from '@/lib/avatars'
import type { EventChallenge, EventProgress } from '@/lib/types'

export default function UnlockClient({
  challenge,
  progress,
  userId,
}: {
  challenge: EventChallenge
  progress: EventProgress | null
  userId: string
}) {
  const router = useRouter()
  const paragraphs = challenge.narrative_text.split(/\n\n+/).map(s => s.trim()).filter(Boolean)
  const [paraIdx, setParaIdx]   = useState(0)
  const [paraDone, setParaDone] = useState(false)
  const [showReflection, setShowReflection] = useState(progress?.completed ?? false)
  const [equipped, setEquipped] = useState(false)
  const [equipping, setEquipping] = useState(false)

  // Marcar día 7 como completado al entrar (1 sola vez)
  useEffect(() => {
    if (!progress?.completed) {
      completeDayChallenge({ challengeId: challenge.id, score: 0 }).catch(() => {})
    }
  }, [challenge.id, progress?.completed])

  async function equipDavid() {
    setEquipping(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ avatar_url: 'avatar_david', frame: challenge.frame_reward ?? undefined }).eq('id', userId)
    setEquipping(false)
    setEquipped(true)
  }

  const david = AVATARS['avatar_david']

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #92400e 0%, #1f1408 50%, #050201 100%)' }}
    >
      <Confetti active />
      <GoldenParticles active density={140} />

      <header className="relative z-10 px-4 pt-6 pb-3 max-w-lg mx-auto flex items-center justify-between">
        <Link href="/eventos" className="flex items-center gap-1 text-amber-200/90 hover:text-amber-100 text-sm">
          <ChevronLeft size={16} /> Salir
        </Link>
        <p className="text-amber-300 text-[10px] uppercase tracking-widest font-bold">Día 7 · Finale</p>
      </header>

      <div className="relative z-10 px-4 max-w-lg mx-auto pb-12 space-y-6 text-center">
        <div>
          <Trophy size={42} className="text-amber-300 mx-auto drop-shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-bounce-in" />
          <p className="text-amber-300 text-xs uppercase tracking-[0.3em] font-bold mt-2">🏆 Completaste el viaje</p>
          <h1
            className="font-bebas text-4xl sm:text-5xl text-amber-100 mt-1 leading-none"
            style={{ textShadow: '0 0 30px rgba(251,191,36,0.7), 0 4px 18px rgba(0,0,0,0.95)' }}
          >
            HÉROE DEL VALLE DE ELÁ
          </h1>
        </div>

        {/* Avatar David grande */}
        <div className="flex justify-center">
          <div
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden frame-valle-ela animate-float"
            style={{ backgroundColor: david?.bg ?? '#fbbf24' }}
          >
            {david?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={david.image} alt="David" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-7xl">{david?.emoji ?? '👑'}</span>
            )}
          </div>
        </div>

        <p className="text-amber-200 font-bebas text-2xl">DAVID</p>

        {/* Texto narrativo con typewriter */}
        <div className="bg-gradient-to-b from-amber-100/95 to-yellow-50/95 text-stone-900 rounded-2xl border-4 border-yellow-700/60 shadow-2xl shadow-black/60 p-5 text-left">
          <Typewriter
            key={paraIdx}
            text={paragraphs[paraIdx] ?? ''}
            speed={26}
            onDone={() => setParaDone(true)}
            className="text-stone-900 text-sm leading-relaxed"
          />
          {paraDone && paraIdx < paragraphs.length - 1 && (
            <button
              onClick={() => { setParaIdx(i => i + 1); setParaDone(false) }}
              className="mt-3 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-sm"
            >
              Continuar →
            </button>
          )}
        </div>

        {/* Botones de cierre del finale */}
        {paraDone && paraIdx === paragraphs.length - 1 && !showReflection && (
          <div className="space-y-2 animate-bounce-in">
            <button
              onClick={equipDavid}
              disabled={equipping || equipped}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 disabled:opacity-60 text-stone-900 font-bold py-3 rounded-xl shadow-lg shadow-amber-900/50"
            >
              <Sparkles size={16} /> {equipped ? '¡Equipado! ✓' : equipping ? 'Equipando...' : 'Equipar avatar David ahora'}
            </button>
            <button
              onClick={() => setShowReflection(true)}
              className="w-full bg-amber-700/40 hover:bg-amber-700/60 border border-amber-500/40 text-amber-100 font-medium py-3 rounded-xl text-sm transition-colors"
            >
              Escribir mi reflexión final
            </button>
          </div>
        )}

        {showReflection && (
          <div className="text-left">
            <ReflectionForm
              challengeId={challenge.id}
              prompt={challenge.reflection_prompt ?? ''}
              initialAnswer={progress?.reflection_answer ?? ''}
              initialIsPublic={progress?.is_public ?? false}
              onSaved={() => setTimeout(() => router.push('/eventos'), 2000)}
            />
          </div>
        )}

        <Link href="/eventos" className="block text-amber-200/80 hover:text-amber-100 text-sm py-1">
          Volver al evento
        </Link>
      </div>
    </div>
  )
}
