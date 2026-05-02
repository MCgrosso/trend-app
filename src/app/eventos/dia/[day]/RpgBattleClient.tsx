'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Swords, RotateCw, ChevronLeft, Trophy } from 'lucide-react'
import HpBar from '@/components/HpBar'
import Confetti from '@/components/Confetti'
import GoldenParticles from '@/components/GoldenParticles'
import { getAudioManager } from '@/lib/audioManager'
import {
  playDamageDealt, playDamageTaken,
  playBattleVictory, playBattleDefeat,
} from '@/lib/sounds'
import { completeDayChallenge } from '../../actions'
import ReflectionForm from './ReflectionForm'
import type { EventChallenge, EventProgress } from '@/lib/types'

const MAX_HP = 5

type Phase = 'intro' | 'battle' | 'victory' | 'defeat' | 'reflection'

export default function RpgBattleClient({
  challenge,
  progress,
}: {
  challenge: EventChallenge
  progress: EventProgress | null
}) {
  const router = useRouter()
  const questions = challenge.battle_questions ?? []

  const [phase, setPhase]       = useState<Phase>(progress?.completed ? 'reflection' : 'intro')
  const [davidHp, setDavidHp]   = useState(MAX_HP)
  const [enemyHp, setEnemyHp]   = useState(MAX_HP)
  const [currentQ, setCurrentQ] = useState(0)
  const [picked, setPicked]     = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [enemyHurt, setEnemyHurt] = useState(false)
  const [davidHurt, setDavidHurt] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Música de batalla mientras dure este pantallazo
  useEffect(() => {
    const am = getAudioManager()
    am?.setBackgroundTrack('batalla')
    return () => { am?.setBackgroundTrack('main') }
  }, [])

  function startBattle() {
    setPhase('battle')
    setDavidHp(MAX_HP); setEnemyHp(MAX_HP)
    setCurrentQ(0); setPicked(null); setFeedback(null)
  }

  async function pickAnswer(opt: string) {
    if (picked || phase !== 'battle') return
    setPicked(opt)
    const q = questions[currentQ]
    const isCorrect = opt === q.a

    if (isCorrect) {
      playDamageDealt()
      setFeedback('correct')
      setEnemyHurt(true)
      setTimeout(() => setEnemyHurt(false), 400)
      const newEnemy = enemyHp - 1
      setEnemyHp(newEnemy)
      if (newEnemy <= 0) {
        setTimeout(() => onVictory(), 900)
        return
      }
    } else {
      playDamageTaken()
      setFeedback('wrong')
      setDavidHurt(true)
      setTimeout(() => setDavidHurt(false), 400)
      const newDavid = davidHp - 1
      setDavidHp(newDavid)
      if (newDavid <= 0) {
        setTimeout(() => onDefeat(), 900)
        return
      }
    }

    // Avanzar a la próxima pregunta. Si no hay más, victoria/derrota por HP final.
    setTimeout(() => {
      const next = currentQ + 1
      if (next >= questions.length) {
        // Sobrevivió todas las preguntas → victoria si HP > enemyHP
        if (enemyHp - (isCorrect ? 1 : 0) <= davidHp - (isCorrect ? 0 : 1)) onVictory()
        else onDefeat()
        return
      }
      setCurrentQ(next); setPicked(null); setFeedback(null)
    }, 950)
  }

  async function onVictory() {
    playBattleVictory()
    setPhase('victory')
    setCompleting(true)
    // Score = HP que le quedó a David (max 5)
    const score = Math.max(0, davidHp)
    await completeDayChallenge({ challengeId: challenge.id, score })
    setCompleting(false)
    setTimeout(() => setPhase('reflection'), 2400)
  }

  function onDefeat() {
    playBattleDefeat()
    setPhase('defeat')
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  const currentQuestion = questions[currentQ]

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top, #312e81 0%, #1e1b4b 35%, #1a0f06 100%)',
      }}
    >
      {/* Cielo dramático con tinte */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(to bottom, rgba(190, 24, 93, 0.15) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.6) 100%)',
      }} />

      <header className="relative z-10 px-4 pt-6 pb-3 max-w-lg mx-auto flex items-center justify-between">
        <Link href="/eventos" className="flex items-center gap-1 text-amber-200/90 hover:text-amber-100 text-sm">
          <ChevronLeft size={16} /> Salir
        </Link>
        <p className="text-amber-300 text-[10px] uppercase tracking-widest font-bold">Día {challenge.day_number} · {challenge.title}</p>
      </header>

      {/* INTRO */}
      {phase === 'intro' && (
        <div className="relative z-10 px-4 max-w-lg mx-auto py-6 space-y-5">
          <div className="text-center">
            <p className="text-amber-300 text-xs uppercase tracking-[0.3em] font-bold">⚔️ Batalla</p>
            <h1 className="font-bebas text-4xl text-white mt-1 leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">{challenge.title.toUpperCase()}</h1>
            <p className="text-amber-100/90 text-sm mt-1 italic">{challenge.subtitle}</p>
          </div>

          <BattleStage
            challenge={challenge}
            davidHp={MAX_HP}
            enemyHp={MAX_HP}
            enemyHurt={false}
            davidHurt={false}
          />

          <p className="text-amber-100/85 text-sm leading-relaxed text-center max-w-md mx-auto" style={{ fontFamily: 'serif' }}>
            Respondé bien para atacar al enemigo. Si fallás, recibís el golpe.
          </p>

          <button
            onClick={startBattle}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-stone-900 font-bold py-3 rounded-xl shadow-lg shadow-amber-900/50 text-base"
          >
            <Swords size={18} /> ¡Comenzar batalla!
          </button>
        </div>
      )}

      {/* BATTLE */}
      {phase === 'battle' && currentQuestion && (
        <div className="relative z-10 px-4 max-w-lg mx-auto py-4 space-y-4">
          <BattleStage
            challenge={challenge}
            davidHp={davidHp}
            enemyHp={enemyHp}
            enemyHurt={enemyHurt}
            davidHurt={davidHurt}
          />

          <div className="bg-gradient-to-b from-amber-100/95 to-yellow-50/95 text-stone-900 rounded-2xl border-4 border-yellow-700/60 shadow-2xl shadow-black/60 p-4">
            <p className="text-yellow-700/80 text-[10px] uppercase tracking-widest text-center font-bold mb-2">
              Pregunta {currentQ + 1} de {questions.length}
            </p>
            <p className="text-stone-900 font-semibold text-base text-center mb-4 px-2" style={{ fontFamily: 'serif' }}>
              {currentQuestion.q}
            </p>
            <div className="space-y-2">
              {currentQuestion.options.map(opt => {
                const isPicked = picked === opt
                const isAnswer = opt === currentQuestion.a
                const showRight = picked && isAnswer
                const showWrong = picked && isPicked && !isAnswer
                return (
                  <button
                    key={opt}
                    onClick={() => pickAnswer(opt)}
                    disabled={!!picked}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm transition-all disabled:cursor-default ${
                      showRight ? 'bg-green-100 border-green-600 text-green-900' :
                      showWrong ? 'bg-red-100 border-red-600 text-red-900' :
                      picked    ? 'bg-yellow-100/40 border-yellow-700/30 text-stone-500' :
                                  'bg-yellow-100/60 border-yellow-700/40 text-stone-800 hover:bg-yellow-200 active:scale-[0.99]'
                    }`}
                    style={{ fontFamily: 'serif' }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {feedback && (
              <p className={`mt-3 text-center text-xs font-bold ${feedback === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                {feedback === 'correct' ? '⚔️ ¡Golpe directo al enemigo!' : '💢 Recibiste daño'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* VICTORY */}
      {phase === 'victory' && (
        <div className="relative z-10 px-4 max-w-lg mx-auto py-10 flex flex-col items-center text-center">
          <Confetti active />
          <GoldenParticles active density={120} />
          <Trophy size={64} className="text-amber-300 drop-shadow-[0_0_24px_rgba(251,191,36,0.9)] animate-bounce-in" />
          <h2 className="font-bebas text-5xl text-amber-100 mt-3 leading-none animate-bounce-in" style={{ textShadow: '0 0 24px rgba(251,191,36,0.6)' }}>
            ¡VICTORIA!
          </h2>
          <p className="text-amber-200 mt-2 text-sm">
            {completing ? 'Guardando recompensa...' : 'Marco desbloqueado y equipado'}
          </p>
        </div>
      )}

      {/* DEFEAT */}
      {phase === 'defeat' && (
        <div className="relative z-10 px-4 max-w-lg mx-auto py-10 flex flex-col items-center text-center">
          <p className="text-6xl">💀</p>
          <h2 className="font-bebas text-5xl text-red-300 mt-3 leading-none">CAÍSTE EN BATALLA</h2>
          <p className="text-amber-200/80 mt-2 text-sm">No te rindas. David también necesitó valentía.</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={startBattle}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 hover:brightness-110 text-white font-bold px-5 py-3 rounded-xl"
            >
              <RotateCw size={16} /> Reintentar
            </button>
            <Link href="/eventos" className="inline-flex items-center gap-2 bg-gray-700/60 hover:bg-gray-600/60 text-white font-bold px-5 py-3 rounded-xl">
              Salir
            </Link>
          </div>
        </div>
      )}

      {/* REFLECTION */}
      {phase === 'reflection' && (
        <div className="relative z-10 px-4 max-w-lg mx-auto py-6 space-y-4">
          <ReflectionForm
            challengeId={challenge.id}
            prompt={challenge.reflection_prompt ?? ''}
            initialAnswer={progress?.reflection_answer ?? ''}
            initialIsPublic={progress?.is_public ?? false}
            onSaved={() => setTimeout(() => router.push('/eventos'), 1800)}
          />
          <Link href="/eventos" className="block text-center text-amber-200/80 hover:text-amber-100 text-sm py-2">
            Volver al evento
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Sub-componente: el escenario de batalla (David vs enemigo) ───────────────
function BattleStage({
  challenge, davidHp, enemyHp, enemyHurt, davidHurt,
}: {
  challenge: EventChallenge
  davidHp: number; enemyHp: number
  enemyHurt: boolean; davidHurt: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-3 items-end">
      {/* David (left) */}
      <div className="flex flex-col items-center">
        <HpBar current={davidHp} max={MAX_HP} side="left" color="green" label="David" />
        <div className={`relative mt-2 w-32 h-32 sm:w-36 sm:h-36 ${davidHurt ? 'animate-shake-tiny' : ''}`}>
          {davidHurt && <span className="absolute inset-0 rounded-full animate-battle-flash pointer-events-none" />}
          {challenge.character_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={challenge.character_image}
              alt="David"
              className="w-full h-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.8)]"
            />
          )}
        </div>
      </div>
      {/* Enemy (right) */}
      <div className="flex flex-col items-center">
        <HpBar current={enemyHp} max={MAX_HP} side="right" color="red" label={enemyLabelFor(challenge)} />
        <div className={`relative mt-2 w-32 h-32 sm:w-36 sm:h-36 ${enemyHurt ? 'animate-shake-tiny' : ''}`}>
          {enemyHurt && <span className="absolute inset-0 rounded-full animate-battle-flash pointer-events-none" />}
          {challenge.enemy_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={challenge.enemy_image}
              alt="Enemigo"
              className="w-full h-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.8)] -scale-x-100"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function enemyLabelFor(c: EventChallenge): string {
  if (c.enemy_image?.includes('oso')) return 'Oso'
  if (c.enemy_image?.includes('leon')) return 'León'
  if (c.enemy_image?.includes('goliat')) return 'Goliat'
  return 'Enemigo'
}
