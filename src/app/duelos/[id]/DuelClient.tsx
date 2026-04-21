'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/Avatar'
import Confetti from '@/components/Confetti'
import { getTitle } from '@/lib/titles'
import { submitDuelAnswer, checkAndFinishDuel } from '../actions'
import { CheckCircle, XCircle, Swords, Clock, Trophy, Shield } from 'lucide-react'
import { playSuccess, playError, playTick } from '@/lib/sounds'
import { getAudioManager } from '@/lib/audioManager'

interface DuelProfile {
  id: string; username: string; first_name: string; avatar_url: string | null; frame: string | null; title: string | null
}

interface QuestionData {
  id: string; question: string
  option_a: string; option_b: string; option_c: string; option_d: string
  correct_option: string; explanation: string; category: string
}

interface DuelQuestionRow {
  id: string
  duel_id: string
  question_id: string
  question_order: number
  challenger_answer: string | null
  challenger_correct: boolean | null
  opponent_answer: string | null
  opponent_correct: boolean | null
  question: QuestionData
}

interface DuelRow {
  id: string
  challenger_id: string
  opponent_id: string
  status: string
  categories: string[]
  challenger_score: number
  opponent_score: number
  winner_id: string | null
  challenger_finished: boolean
  opponent_finished: boolean
  challenger: DuelProfile
  opponent: DuelProfile
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const
type Option = typeof OPTIONS[number]

function getOptionText(q: QuestionData, opt: Option) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[opt]
}

function CircularTimer({ timeLeft, max = 20 }: { timeLeft: number; max?: number }) {
  const radius = 20; const circ = 2 * Math.PI * radius
  const offset = circ * (1 - timeLeft / max)
  const color  = timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#eab308' : '#ef4444'
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0">
      <circle cx="24" cy="24" r={radius} fill="none" stroke="#374151" strokeWidth="4" />
      <circle cx="24" cy="24" r={radius} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 24 24)" style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }} />
      <text x="24" y="29" textAnchor="middle" fill={color} fontSize="12" fontWeight="bold">{timeLeft}</text>
    </svg>
  )
}

export default function DuelClient({ userId, duel: initialDuel, duelQuestions: initialQuestions }: {
  userId: string
  duel: DuelRow
  duelQuestions: DuelQuestionRow[]
}) {
  const router = useRouter()

  // Local state for duel — updated by realtime / polling so the results screen
  // re-renders the moment the opponent finishes.
  const [duel, setDuel] = useState<DuelRow>(initialDuel)

  const isChallenger = duel.challenger_id === userId
  const me = isChallenger ? duel.challenger : duel.opponent
  const opp = isChallenger ? duel.opponent : duel.challenger

  // Local state so we can retry the fetch client-side if SSR returned empty
  const [duelQuestions, setDuelQuestions] = useState<DuelQuestionRow[]>(initialQuestions)
  const [retrying, setRetrying]           = useState(initialQuestions.length === 0)
  const [retryFailed, setRetryFailed]     = useState(false)

  // ── Defensive "answered by me" check ─────────────────────────────────────
  function isAnsweredByMe(dq: DuelQuestionRow): boolean {
    const val = isChallenger ? dq.challenger_answer : dq.opponent_answer
    return typeof val === 'string' && val.trim() !== ''
  }

  const pendingQs    = duelQuestions.filter(dq => !isAnsweredByMe(dq))
  const answered     = duelQuestions.filter(dq =>  isAnsweredByMe(dq))
  const myCorrectCount = answered.filter(dq =>
    (isChallenger ? dq.challenger_correct : dq.opponent_correct) === true
  ).length

  const noQuestions = duelQuestions.length === 0

  console.log('[duel] duelQuestions:', duelQuestions)
  console.log('[duel] answered:', answered)
  console.log('[duel] userId=', userId, 'isChallenger=', isChallenger,
    'duel.status=', duel.status,
    'pending=', pendingQs.length, 'answered=', answered.length, 'noQuestions=', noQuestions)
  if (duelQuestions.length > 0) {
    console.log('[duel] raw rows:', duelQuestions.map(dq => ({
      order: dq.question_order,
      ch_answer: dq.challenger_answer, ch_type: typeof dq.challenger_answer,
      op_answer: dq.opponent_answer,   op_type: typeof dq.opponent_answer,
    })))
  }

  // ── Client-side retry: if SSR returned empty (RLS edge case, race
  //    condition with insert), re-fetch from the browser after a short delay.
  useEffect(() => {
    if (!retrying) return
    const supabase = createClient()
    let cancelled = false

    async function fetchAndMaybeRetry() {
      // Try up to 3 times across 3 seconds
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (cancelled) return
        await new Promise(r => setTimeout(r, 1000))
        const { data, error } = await supabase
          .from('duel_questions')
          .select(`
            *,
            question:questions(id, question, option_a, option_b, option_c, option_d, correct_option, explanation, category)
          `)
          .eq('duel_id', duel.id)
          .order('question_order')

        console.log(`[duel] retry attempt ${attempt}: data=`, data, 'error=', error)
        if (!cancelled && data && data.length > 0) {
          setDuelQuestions(data as DuelQuestionRow[])
          setRetrying(false)
          return
        }
      }
      if (!cancelled) {
        setRetrying(false)
        setRetryFailed(true)
      }
    }

    fetchAndMaybeRetry()
    return () => { cancelled = true }
  }, [retrying, duel.id])

  const [current, setCurrent]         = useState(0)
  const [selected, setSelected]       = useState<Option | null>(null)
  const [showResult, setShowResult]   = useState(false)
  const [loading, setLoading]         = useState(false)
  const [timeLeft, setTimeLeft]       = useState(20)
  const [cardAnim, setCardAnim]       = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [showFloat, setShowFloat]     = useState(false)
  const [myScore, setMyScore]         = useState(myCorrectCount)
  // finished ONLY when answered >= total AND total > 0
  const [finished, setFinished]       = useState(
    duelQuestions.length > 0 && answered.length >= duelQuestions.length
  )
  console.log('[duel] finished:', finished)
  const [result, setResult]           = useState<string | null>(null)
  const [slideKey, setSlideKey]       = useState(0)
  const [localAnswers, setLocalAnswers] = useState<Record<string, boolean>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const handleRef = useRef<((opt: Option) => Promise<void>) | null>(null)

  // Already all answered
  const alreadyDone = duel.status === 'finished' || (isChallenger ? duel.challenger_finished : duel.opponent_finished)

  const currentDQ = pendingQs[current]

  // ── Realtime: react to duel row updates instantly ──────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const challengerId = duel.challenger_id

    const channel = supabase
      .channel(`duel-row-${duel.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${duel.id}` },
        (payload) => {
          console.log('[duel-rt] update event:', payload.new)
          const incoming = payload.new as Partial<DuelRow>
          setDuel(prev => ({
            ...prev,
            ...incoming,
            // Preserve joined profiles (realtime payload doesn't include them)
            challenger: prev.challenger,
            opponent:   prev.opponent,
          }))
          if (incoming.status === 'finished') {
            const r =
              !incoming.winner_id                  ? 'draw' :
              incoming.winner_id === challengerId  ? 'challenger' :
                                                     'opponent'
            setResult(r)
            setFinished(true)
          }
        }
      )
      .subscribe(s => console.log('[duel-rt] sub status:', s))

    return () => { supabase.removeChannel(channel) }
  }, [duel.id, duel.challenger_id])

  // ── Polling fallback: every 3s while I'm done waiting for opponent ─────────
  useEffect(() => {
    if (duel.status === 'finished') return
    if (!finished) return  // only poll once I've finished my side

    console.log('[duel-poll] starting poll (every 3s) while waiting for opponent')
    const id = setInterval(async () => {
      const r = await checkAndFinishDuel(duel.id)
      console.log('[duel-poll] checkAndFinishDuel returned:', r)
      if (r.finished && r.result) {
        setResult(r.result)
        setFinished(true)
        // Pull fresh duel row so scores/winner_id show in results screen
        const supabase = createClient()
        const { data: fresh } = await supabase
          .from('duels')
          .select('*')
          .eq('id', duel.id)
          .single()
        if (fresh) setDuel(prev => ({ ...prev, ...fresh, challenger: prev.challenger, opponent: prev.opponent }))
      }
    }, 3000)

    return () => { clearInterval(id) }
  }, [finished, duel.id, duel.status])

  // ── Duel audio orchestration ──────────────────────────────────────────────
  // Phases:
  //   1. Just won/lost mid-session → one-shot (victoria/derrota), then main
  //   2. Results screen (mounted on already-finished duel, or draw) → main
  //   3. Waiting for opponent (I'm done, duel not finished) → main
  //   4. Actively answering questions → batalla
  const justFinishedRef = useRef(false)
  useEffect(() => {
    const am = getAudioManager()
    if (!am) return

    // 1. Just completed mid-session — fire one-shot, then back to main
    if (finished && result !== null && !justFinishedRef.current) {
      justFinishedRef.current = true
      if (result === 'draw') {
        am.setBackgroundTrack('main')
      } else {
        const isWin = (result === 'challenger' && isChallenger) || (result === 'opponent' && !isChallenger)
        am.setBackgroundTrack(null)
        am.playOneShot(isWin ? 'victoria' : 'derrota', () => {
          am.setBackgroundTrack('main')
        })
      }
      return
    }

    // 2. Results screen from mount (or after the one-shot already fired) → main
    if (duel.status === 'finished' || justFinishedRef.current) {
      am.setBackgroundTrack('main')
      return
    }

    // 3. Waiting for opponent → main
    if (finished || alreadyDone || !currentDQ) {
      am.setBackgroundTrack('main')
      return
    }

    // 4. Actively answering → batalla
    am.setBackgroundTrack('batalla')
  }, [duel.status, finished, alreadyDone, result, isChallenger, currentDQ])

  async function handleSelect(option: Option) {
    if (!currentDQ || loading || showResult) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setLoading(true); setSelected(option)

    const resp = await submitDuelAnswer(duel.id, currentDQ.id, option)
    console.log('[handleSelect] submitDuelAnswer response:', resp)

    if (resp.error) {
      // Surface the migration / RLS error
      alert(resp.error)
      setSelected(null)
      setLoading(false)
      return
    }

    const { isCorrect, finished: fin, result: res } = resp

    setLocalAnswers(prev => ({ ...prev, [currentDQ.id]: isCorrect }))
    setShowResult(true)
    if (isCorrect) {
      playSuccess()
      setCardAnim('answer-correct')
      setShowConfetti(true)
      setShowFloat(true)
      setMyScore(s => s + 1)
      setTimeout(() => setShowFloat(false), 950)
      setTimeout(() => setShowConfetti(false), 2600)
    } else {
      playError()
      setCardAnim('answer-incorrect')
    }
    setTimeout(() => setCardAnim(''), 700)

    // Server says BOTH players are done → set finished + result immediately
    if (fin) {
      setFinished(true)
      setResult(res)
    }
    // (If only I'm done, finished stays false. The "Ver resultado →" button on the
    //  last question lets me transition manually; realtime/polling will pull the
    //  result once the rival also finishes.)

    setLoading(false)
  }

  handleRef.current = handleSelect

  useEffect(() => {
    if (!currentDQ || showResult || alreadyDone) return
    setTimeLeft(20)
    const correctOpt = currentDQ.question.correct_option

    const id = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1
        if (next > 0 && next <= 5) playTick()
        if (next <= 0) {
          clearInterval(id)
          const wrong = OPTIONS.find(o => o !== correctOpt) ?? 'A'
          handleRef.current?.(wrong as Option)
          return 0
        }
        return next
      })
    }, 1000)
    timerRef.current = id
    return () => clearInterval(id)
  }, [current, currentDQ?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    setShowResult(false)
    setSelected(null)
    setSlideKey(k => k + 1)
    setCurrent(c => c + 1)
  }

  // ── Empty array: spinner while client retries; error if all retries fail ──
  if (noQuestions && retrying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 border-4 border-purple-700/30 border-t-purple-500 rounded-full animate-spin mb-4" />
        <p className="text-purple-300 text-sm">Cargando preguntas del duelo...</p>
      </div>
    )
  }

  if (noQuestions && retryFailed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl mb-4">⚠️</span>
        <h2 className="text-xl font-bold text-white mb-2">Este duelo no tiene preguntas</h2>
        <p className="text-gray-400 text-sm max-w-xs">El duelo se creó sin preguntas asignadas o RLS las está filtrando. Avisale al admin o creá uno nuevo.</p>
        <button onClick={() => router.push('/duelos')}
          className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors">
          Volver a Duelos
        </button>
      </div>
    )
  }

  // ── Finished / Results screen ──────────────────────────────────────────────
  if (finished || alreadyDone || !currentDQ) {
    const isWaiting = finished && result === null && !alreadyDone
    const isWinner  = duel.status === 'finished' && duel.winner_id === userId
    const isDraw    = duel.status === 'finished' && !duel.winner_id
    const chScore   = duel.challenger_score
    const opScore   = duel.opponent_score
    const myFinalScore = isChallenger ? chScore : opScore
    const oppFinalScore = isChallenger ? opScore : chScore

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a] flex flex-col items-center justify-center px-4">
        <Confetti active={duel.status === 'finished' && isWinner} />

        <div className="w-full max-w-lg space-y-6 animate-bounce-in">
          {isWaiting ? (
            <div className="text-center">
              <Clock size={56} className="text-purple-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-white">¡Respondiste todo!</h2>
              <p className="text-gray-400 mt-2">Esperando que {opp.first_name} termine...</p>
            </div>
          ) : duel.status === 'finished' ? (
            <>
              <div className="text-center">
                <span className="text-6xl block mb-2">{isWinner ? '🏆' : isDraw ? '🤝' : '😔'}</span>
                <h2 className={`text-3xl font-extrabold ${isWinner ? 'text-yellow-300' : isDraw ? 'text-blue-300' : 'text-red-300'}`}>
                  {isWinner ? '¡Victoria!' : isDraw ? 'Empate' : 'Derrota'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">{isWinner ? '+20 puntos' : isDraw ? '+10 puntos cada uno' : '+5 puntos'}</p>
              </div>

              {/* Score display */}
              <div className="flex items-center gap-4 bg-gray-800/50 border border-gray-700/40 rounded-2xl p-5">
                <div className="flex-1 text-center">
                  <Avatar avatarUrl={me.avatar_url} firstName={me.first_name} size="md" frame={me.frame} className="mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">{me.first_name}</p>
                  <p className={`text-4xl font-extrabold mt-1 ${isWinner ? 'text-green-400' : 'text-white'}`}>{myFinalScore}</p>
                </div>
                <div className="flex flex-col items-center">
                  <Swords size={20} className="text-purple-400" />
                  <p className="text-gray-500 text-xs mt-1">VS</p>
                </div>
                <div className="flex-1 text-center">
                  <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="md" frame={opp.frame} className="mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">{opp.first_name}</p>
                  <p className={`text-4xl font-extrabold mt-1 ${!isWinner && !isDraw ? 'text-green-400' : 'text-white'}`}>{oppFinalScore}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <CheckCircle size={56} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">¡Terminaste!</h2>
              <p className="text-gray-400 mt-2">Tus respuestas fueron guardadas</p>
            </div>
          )}

          <button onClick={() => router.push('/duelos')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all">
            Volver a Duelos
          </button>
        </div>
      </div>
    )
  }

  // ── Play screen ────────────────────────────────────────────────────────────
  const q = currentDQ.question
  const effectiveAnswer = showResult && selected
    ? { selected_option: selected, is_correct: selected === q.correct_option }
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="px-4 pt-6 pb-3 max-w-lg mx-auto">
        {/* VS bar */}
        <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700/40 rounded-2xl p-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Avatar avatarUrl={me.avatar_url} firstName={me.first_name} size="xs" frame={me.frame} />
            <div>
              <p className="text-white text-xs font-semibold">{me.first_name}</p>
              <p className="text-green-400 text-base font-bold">{myScore}</p>
            </div>
          </div>
          <Swords size={16} className="text-purple-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="text-right">
              <p className="text-white text-xs font-semibold">{opp.first_name}</p>
              <p className="text-gray-400 text-base font-bold">?</p>
            </div>
            <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="xs" frame={opp.frame} />
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-4">
          {duelQuestions.map((dq, i) => {
            const localAns = localAnswers[dq.id]
            const isCurrent = pendingQs[current]?.id === dq.id
            return (
              <div key={dq.id} className={`flex-1 h-2 rounded-full transition-all ${
                localAns !== undefined
                  ? localAns ? 'bg-green-500' : 'bg-red-500'
                  : isCurrent
                    ? 'bg-purple-500'
                    : 'bg-gray-700'
              }`} />
            )
          })}
        </div>
      </div>

      {/* Question card */}
      <div className="px-4 max-w-lg mx-auto pb-8 space-y-4">
        <div key={slideKey} className="animate-slide-in relative">
          {showFloat && (
            <div className="absolute -top-1 right-10 z-10 pointer-events-none animate-float-up">
              <span className="text-yellow-300 font-extrabold text-2xl drop-shadow-lg">+1</span>
            </div>
          )}

          <div className={`bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 ${cardAnim}`}>
            <div className="flex items-center gap-3 mb-3">
              <CircularTimer timeLeft={effectiveAnswer ? 0 : timeLeft} />
              <div>
                <span className="text-xs text-purple-400 font-medium bg-purple-900/30 px-2.5 py-1 rounded-full">
                  {q.category}
                </span>
                <p className="text-xs text-gray-500 mt-1">Pregunta {current + 1} de {pendingQs.length}</p>
              </div>
              {effectiveAnswer && (
                effectiveAnswer.is_correct
                  ? <span className="ml-auto flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={12} /> Correcto</span>
                  : <span className="ml-auto flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} /> Incorrecto</span>
              )}
            </div>

            <h2 className="text-base font-semibold text-white leading-snug mb-4">{q.question}</h2>

            <div className="space-y-2.5">
              {OPTIONS.map(opt => {
                const text = getOptionText(q, opt)
                const isSelected = effectiveAnswer?.selected_option === opt
                const isCorrect  = q.correct_option === opt
                const showCorrect = !!effectiveAnswer && isCorrect
                const showWrong   = !!effectiveAnswer && isSelected && !isCorrect

                return (
                  <button key={opt} onClick={() => handleSelect(opt)}
                    disabled={!!effectiveAnswer || loading}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 disabled:opacity-50 ${
                      showCorrect ? 'bg-green-900/40 border-green-500 text-green-200'
                      : showWrong ? 'bg-red-900/40 border-red-500 text-red-200'
                      : effectiveAnswer ? 'bg-gray-700/20 border-gray-600/30 text-gray-500 cursor-default'
                      : 'bg-gray-700/40 border-gray-600/50 text-white hover:bg-gray-700/70 hover:border-purple-500/70 active:scale-[0.99]'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${
                      showCorrect ? 'bg-green-600 border-green-500 text-white'
                      : showWrong ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-gray-600/50 border-gray-500/50 text-gray-300'
                    }`}>{opt}</span>
                    <span className="text-sm">{text}</span>
                    {showCorrect && <CheckCircle size={14} className="ml-auto text-green-400 flex-shrink-0" />}
                    {showWrong   && <XCircle    size={14} className="ml-auto text-red-400 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Explanation */}
        {effectiveAnswer && (
          <div className={`rounded-2xl p-4 border animate-bounce-in ${
            effectiveAnswer.is_correct ? 'bg-green-900/20 border-green-700/40' : 'bg-red-900/20 border-red-700/40'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {effectiveAnswer.is_correct
                ? <><CheckCircle size={16} className="text-green-400" /><span className="text-green-300 font-semibold">¡Correcto!</span></>
                : <><XCircle size={16} className="text-red-400" /><span className="text-red-300 font-semibold">Incorrecto — resp: {q.correct_option}</span></>
              }
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{q.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {effectiveAnswer && current < pendingQs.length - 1 && (
          <button onClick={advance}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all">
            Siguiente →
          </button>
        )}

        {/* Last question — explicit "see result" button */}
        {effectiveAnswer && current === pendingQs.length - 1 && !finished && (
          <button onClick={() => setFinished(true)}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold py-3 rounded-xl transition-all">
            Ver resultado →
          </button>
        )}
      </div>
    </div>
  )
}
