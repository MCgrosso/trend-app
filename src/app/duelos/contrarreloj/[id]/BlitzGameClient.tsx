'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/Avatar'
import Confetti from '@/components/Confetti'
import GoldenParticles from '@/components/GoldenParticles'
import PvpRankBadge from '@/components/PvpRankBadge'
import { submitBlitzResult, type BlitzMode, type BlitzQuestion } from '../actions'
import { CheckCircle, XCircle, Clock, Swords, Hourglass } from 'lucide-react'
import { playSuccess, playError } from '@/lib/sounds'
import { getRank } from '@/lib/pvpRanks'

interface DuelProfile {
  id: string; username: string; first_name: string
  avatar_url: string | null; frame: string | null; avatar_bg: string | null
  pvp_rank: string | null; pvp_points: number | null
}

interface BlitzDuelRow {
  id: string
  challenger_id: string
  opponent_id: string
  mode: BlitzMode
  status: 'pending' | 'active' | 'finished'
  challenger_score: number
  opponent_score: number
  challenger_time_survived: number
  opponent_time_survived: number
  challenger_finished: boolean
  opponent_finished: boolean
  rank_multiplier: number
  same_rank: boolean
  winner_id: string | null
  challenger: DuelProfile
  opponent:   DuelProfile
}

interface Props {
  userId: string
  duel: BlitzDuelRow
  questions: BlitzQuestion[]
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const
type Option = typeof OPTIONS[number]

const BLITZ_DURATION = 60        // segundos totales
const DYNAMIC_START  = 30
const DYNAMIC_GAIN   = 5
const DYNAMIC_LOSS   = 5

function getOptionText(q: BlitzQuestion, opt: Option) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[opt]
}

export default function BlitzGameClient({ userId, duel: initialDuel, questions }: Props) {
  const router = useRouter()
  const [duel, setDuel] = useState<BlitzDuelRow>(initialDuel)
  const isChallenger = duel.challenger_id === userId
  const me  = isChallenger ? duel.challenger : duel.opponent
  const opp = isChallenger ? duel.opponent : duel.challenger

  // Game state
  const [phase, setPhase] = useState<'countdown' | 'playing' | 'submitting' | 'waiting' | 'finished' | 'no-questions'>(
    questions.length === 0 ? 'no-questions' : 'countdown'
  )
  const [countdown, setCountdown] = useState(3)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(duel.mode === 'blitz' ? BLITZ_DURATION : DYNAMIC_START)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [selectedOpt, setSelectedOpt] = useState<Option | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const elapsedAtEndRef = useRef<number>(0)

  // Result state
  const [resultData, setResultData] = useState<Awaited<ReturnType<typeof submitBlitzResult>> | null>(null)
  const [showRankUp, setShowRankUp] = useState(false)
  const [rivalFell, setRivalFell] = useState(false)

  const currentQ = questions[questionIdx % Math.max(1, questions.length)]

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return
    const id = setTimeout(() => {
      if (countdown <= 1) {
        startedAtRef.current = Date.now()
        setCountdown(0)
        setPhase('playing')
      } else {
        setCountdown(c => c - 1)
      }
    }, 800)
    return () => clearTimeout(id)
  }, [phase, countdown])

  // ── Game timer (1Hz) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id)
          finishLocally(0)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── Realtime: rival's status ─────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`blitz-game-${duel.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'blitz_duels', filter: `id=eq.${duel.id}` },
        (payload) => {
          const incoming = payload.new as Partial<BlitzDuelRow>
          setDuel(prev => ({ ...prev, ...incoming, challenger: prev.challenger, opponent: prev.opponent }))
          // Si el rival cayó (modo dynamic) o terminó (modo blitz) y yo aún juego,
          // mostrar feedback sutil "rival cayó" — útil para dar urgencia.
          if (duel.mode === 'dynamic') {
            const oppFinished = isChallenger ? incoming.opponent_finished : incoming.challenger_finished
            const oppTime = isChallenger ? incoming.opponent_time_survived : incoming.challenger_time_survived
            if (oppFinished && (oppTime ?? 0) > 0 && phase === 'playing') {
              setRivalFell(true)
              setTimeout(() => setRivalFell(false), 4000)
            }
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [duel.id, duel.mode, isChallenger, phase])

  function finishLocally(extraTimeSurvived: number) {
    if (phase === 'submitting' || phase === 'waiting' || phase === 'finished') return
    const startedAt = startedAtRef.current ?? Date.now()
    const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
    elapsedAtEndRef.current = elapsedSec
    setPhase('submitting')

    // En blitz, time survived = tiempo total invertido (para tie-breaker — menor gana)
    // En dynamic, time survived = duración real hasta caer (mayor gana)
    const timeSurvived = duel.mode === 'blitz' ? elapsedSec : elapsedSec + extraTimeSurvived
    submitBlitzResult(duel.id, score, timeSurvived).then(res => {
      setResultData(res)
      if (res.finished) {
        setPhase('finished')
        if (res.rankedUp) setTimeout(() => setShowRankUp(true), 600)
      } else {
        setPhase('waiting')
      }
    }).catch(() => {
      setPhase('waiting')
    })
  }

  // ── While waiting for opponent: poll the duel row ─────────────────────────
  useEffect(() => {
    if (phase !== 'waiting') return
    const supabase = createClient()
    const id = setInterval(async () => {
      const { data: fresh } = await supabase.from('blitz_duels').select('*').eq('id', duel.id).single()
      if (fresh && fresh.status === 'finished') {
        const final = await submitBlitzResult(duel.id, score, elapsedAtEndRef.current)
        setResultData(final)
        setPhase('finished')
        if (final.rankedUp) setTimeout(() => setShowRankUp(true), 600)
        clearInterval(id)
      }
    }, 2500)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, duel.id])

  function handleAnswer(opt: Option) {
    if (phase !== 'playing' || feedback) return
    setSelectedOpt(opt)
    const correct = opt === currentQ.correct_option
    setFeedback(correct ? 'correct' : 'wrong')
    if (correct) {
      playSuccess()
      setScore(s => s + 1)
      if (duel.mode === 'dynamic') {
        setTimeLeft(t => Math.min(99, t + DYNAMIC_GAIN))
      }
    } else {
      playError()
      if (duel.mode === 'dynamic') {
        setTimeLeft(t => {
          const next = t - DYNAMIC_LOSS
          if (next <= 0) {
            // Cae el jugador
            setTimeout(() => finishLocally(0), 350)
            return 0
          }
          return next
        })
      }
    }

    setTimeout(() => {
      setFeedback(null)
      setSelectedOpt(null)
      setQuestionIdx(i => i + 1)
    }, 700)
  }

  // ── Render: no questions ────────────────────────────────────────────────
  if (phase === 'no-questions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold text-white mb-2">No hay preguntas en la base</h2>
        <p className="text-gray-400 text-sm">Pedile al admin que cargue preguntas para poder jugar.</p>
        <button onClick={() => router.push('/duelos/contrarreloj')}
          className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl">
          Volver
        </button>
      </div>
    )
  }

  // ── Render: countdown ───────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a] flex flex-col items-center justify-center text-center px-6">
        <p className="text-purple-300 text-sm uppercase tracking-widest font-bold">
          {duel.mode === 'blitz' ? '⚡ BLITZ 60s' : '⏳ DINÁMICO'}
        </p>
        <p className="text-white text-base mt-1">vs @{opp.username}</p>
        <div className="mt-10 mb-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <Avatar avatarUrl={me.avatar_url} firstName={me.first_name} size="md" frame={me.frame} bg={me.avatar_bg} className="mx-auto" />
            <PvpRankBadge rank={me.pvp_rank} size="xs" className="mt-2" />
          </div>
          <Swords size={26} className="text-purple-400" />
          <div className="text-center">
            <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="md" frame={opp.frame} bg={opp.avatar_bg} className="mx-auto" />
            <PvpRankBadge rank={opp.pvp_rank} size="xs" className="mt-2" />
          </div>
        </div>
        <div className="font-bebas text-9xl text-white animate-pulse">{countdown > 0 ? countdown : '¡YA!'}</div>
      </div>
    )
  }

  // ── Render: results ─────────────────────────────────────────────────────
  if (phase === 'finished' || phase === 'waiting' || phase === 'submitting') {
    const isWinner = resultData?.myWon === true
    const isDraw = resultData?.isDraw === true

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a] flex flex-col items-center justify-center px-4">
        <Confetti active={phase === 'finished' && isWinner} />
        {showRankUp && resultData?.newRank && (
          <RankUpModal
            newRank={resultData.newRank}
            oldRank={resultData.oldRank}
            onClose={() => setShowRankUp(false)}
          />
        )}

        <div className="w-full max-w-lg space-y-6">
          {phase === 'submitting' && (
            <div className="text-center">
              <Hourglass size={48} className="text-purple-400 mx-auto mb-3 animate-spin" />
              <p className="text-white text-lg font-bold">Enviando resultado...</p>
            </div>
          )}

          {phase === 'waiting' && (
            <div className="text-center">
              <Clock size={48} className="text-purple-400 mx-auto mb-3 animate-pulse" />
              <h2 className="text-2xl font-bold text-white">¡Terminaste!</h2>
              <p className="text-gray-400 mt-2 text-sm">Esperando que {opp.first_name} termine...</p>
              <div className="mt-4 inline-block bg-gray-800/50 border border-gray-700/40 rounded-2xl px-6 py-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Tu puntaje</p>
                <p className="font-bebas text-4xl text-white">{score}</p>
              </div>
            </div>
          )}

          {phase === 'finished' && resultData && (
            <div className="animate-bounce-in">
              <div className="text-center">
                <span className="text-7xl block mb-2">{isWinner ? '🏆' : isDraw ? '🤝' : '😔'}</span>
                <h2 className={`text-3xl font-extrabold ${isWinner ? 'text-yellow-300' : isDraw ? 'text-blue-300' : 'text-red-300'}`}>
                  {isWinner ? '¡Victoria!' : isDraw ? 'Empate' : 'Derrota'}
                </h2>
                {resultData.myDelta !== null && resultData.myDelta !== 0 && (
                  <p className={`text-base font-bold mt-1 ${resultData.myDelta > 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                    {resultData.myDelta > 0 ? '+' : ''}{resultData.myDelta} pts PVP
                  </p>
                )}
              </div>

              {/* Score / time scoreboard */}
              <div className="mt-5 flex items-stretch gap-3 bg-gray-800/50 border border-gray-700/40 rounded-2xl p-4">
                <div className="flex-1 text-center">
                  <Avatar avatarUrl={me.avatar_url} firstName={me.first_name} size="md" frame={me.frame} bg={me.avatar_bg} className="mx-auto mb-1" />
                  <p className="text-white text-sm font-semibold">{me.first_name}</p>
                  <p className={`text-3xl font-extrabold mt-1 ${isWinner ? 'text-green-400' : 'text-white'}`}>{score}</p>
                  {duel.mode === 'dynamic' && <p className="text-xs text-gray-500">{elapsedAtEndRef.current}s</p>}
                </div>
                <div className="flex flex-col items-center justify-center">
                  <Swords size={20} className="text-purple-400" />
                  <p className="text-gray-500 text-xs mt-1">VS</p>
                </div>
                <div className="flex-1 text-center">
                  <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="md" frame={opp.frame} bg={opp.avatar_bg} className="mx-auto mb-1" />
                  <p className="text-white text-sm font-semibold">{opp.first_name}</p>
                  <p className={`text-3xl font-extrabold mt-1 ${!isWinner && !isDraw ? 'text-green-400' : 'text-white'}`}>{resultData.oppScore ?? 0}</p>
                  {duel.mode === 'dynamic' && <p className="text-xs text-gray-500">{resultData.oppTimeSurvived ?? 0}s</p>}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/duelos/contrarreloj')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl"
          >
            Volver a Contrarreloj
          </button>
        </div>
      </div>
    )
  }

  // ── Render: playing ─────────────────────────────────────────────────────
  const timerColor =
    duel.mode === 'blitz'
      ? timeLeft > 30 ? '#22c55e' : timeLeft > 10 ? '#eab308' : '#ef4444'
      : timeLeft > 20 ? '#22c55e' : timeLeft > 10 ? '#eab308' : '#ef4444'
  const timerPulse = duel.mode === 'dynamic' && timeLeft <= 10 ? 'animate-pulse' : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <div className="px-4 pt-6 pb-3 max-w-lg mx-auto">
        {/* VS bar */}
        <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700/40 rounded-2xl p-3 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar avatarUrl={me.avatar_url} firstName={me.first_name} size="xs" frame={me.frame} bg={me.avatar_bg} />
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{me.first_name}</p>
              <p className="text-green-400 text-base font-bold">{score}</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-bebas text-2xl ${timerPulse}`}
            style={{ color: timerColor, borderColor: timerColor + '80' }}
          >
            <Clock size={16} />
            {timeLeft}s
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <div className="text-right min-w-0">
              <p className="text-white text-xs font-semibold truncate">{opp.first_name}</p>
              <p className="text-gray-400 text-base font-bold">?</p>
            </div>
            <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="xs" frame={opp.frame} bg={opp.avatar_bg} />
          </div>
        </div>

        {duel.mode === 'dynamic' && timeLeft <= 10 && (
          <p className="text-center text-red-400 text-xs font-bold uppercase tracking-wider animate-pulse mb-2">
            ¡Atención! Tu tiempo se agota
          </p>
        )}

        {rivalFell && (
          <div className="bg-orange-900/30 border border-orange-700/50 text-orange-200 text-xs px-3 py-2 rounded-xl text-center mb-2 animate-bounce-in">
            ⚡ ¡{opp.first_name} cayó! Aguantá lo más posible
          </div>
        )}
      </div>

      <div className="px-4 max-w-lg mx-auto pb-8">
        {currentQ && (
          <div className={`bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 ${feedback === 'correct' ? 'answer-correct' : feedback === 'wrong' ? 'answer-incorrect' : ''}`}>
            <span className="text-xs text-purple-400 font-medium bg-purple-900/30 px-2.5 py-1 rounded-full">
              {currentQ.category}
            </span>
            <h2 className="text-base font-semibold text-white leading-snug mt-3 mb-4">{currentQ.question}</h2>

            <div className="space-y-2.5">
              {OPTIONS.map(opt => {
                const isSel = selectedOpt === opt
                const isCorrect = currentQ.correct_option === opt
                const showCorrect = feedback && isCorrect
                const showWrong = feedback === 'wrong' && isSel && !isCorrect
                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!feedback}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 disabled:opacity-90 ${
                      showCorrect ? 'bg-green-900/40 border-green-500 text-green-200'
                      : showWrong ? 'bg-red-900/40 border-red-500 text-red-200'
                      : feedback ? 'bg-gray-700/20 border-gray-600/30 text-gray-500'
                      : 'bg-gray-700/40 border-gray-600/50 text-white hover:bg-gray-700/70 hover:border-purple-500/70 active:scale-[0.99]'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                      showCorrect ? 'bg-green-600 border-green-500 text-white'
                      : showWrong ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-gray-600/50 border-gray-500/50 text-gray-300'
                    }`}>{opt}</span>
                    <span className="text-sm">{getOptionText(currentQ, opt)}</span>
                    {showCorrect && <CheckCircle size={14} className="ml-auto text-green-400" />}
                    {showWrong && <XCircle size={14} className="ml-auto text-red-400" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RankUpModal({ newRank, oldRank, onClose }: { newRank: string; oldRank: string | null; onClose: () => void }) {
  const r = getRank(newRank)
  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center px-6">
      <GoldenParticles />
      <div className="relative bg-gradient-to-br from-amber-900/40 via-yellow-900/30 to-amber-900/40 border-4 border-amber-300/70 rounded-3xl p-8 max-w-md text-center animate-bounce-in shadow-[0_0_40px_rgba(245,158,11,0.6)]">
        <p className="text-amber-300 text-xs uppercase tracking-[0.4em] font-bold">¡Subiste de rango!</p>
        <div className="my-6 flex items-center justify-center gap-3">
          {oldRank && (
            <>
              <span className="text-3xl opacity-50">{getRank(oldRank).icon}</span>
              <span className="text-amber-300 text-2xl">→</span>
            </>
          )}
          <span className="text-7xl drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">{r.icon}</span>
        </div>
        <h2 className={`font-bebas text-5xl ${r.color} ${r.specialClass ?? ''}`}>{r.label}</h2>
        <p className="text-amber-100 text-sm mt-3">¡Sos parte de la élite! 🎉</p>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-900 font-bold py-3 rounded-xl transition-all"
        >
          ¡Continuar!
        </button>
      </div>
    </div>
  )
}
