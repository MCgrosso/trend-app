'use client'

import { useState, useEffect, useRef } from 'react'
import { Question } from '@/lib/types'
import { submitAnswer } from './actions'
import { CheckCircle, XCircle, ChevronRight, Star } from 'lucide-react'
import { playSuccess, playError, playTick } from '@/lib/sounds'
import { getMedal } from '@/lib/medals'
import Confetti from '@/components/Confetti'

type AnsweredMap = Record<string, { selected_option: string; is_correct: boolean }>

interface Props {
  questions: Question[]
  answeredMap: AnsweredMap
  initialWeeklyScore: number
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const
type Option = typeof OPTIONS[number]

function getOptionText(q: Question, opt: Option) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[opt]
}

function CircularTimer({ timeLeft }: { timeLeft: number }) {
  const radius = 22
  const circ   = 2 * Math.PI * radius
  const offset = circ * (1 - timeLeft / 30)
  const color  = timeLeft > 15 ? '#22c55e' : timeLeft > 8 ? '#eab308' : '#ef4444'
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" className="flex-shrink-0">
      <circle cx="27" cy="27" r={radius} fill="none" stroke="#374151" strokeWidth="4" />
      <circle
        cx="27" cy="27" r={radius}
        fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 27 27)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
      />
      <text x="27" y="32" textAnchor="middle" fill={color} fontSize="13" fontWeight="bold">
        {timeLeft}
      </text>
    </svg>
  )
}

export default function TriviaClient({ questions, answeredMap, initialWeeklyScore }: Props) {
  const [current,      setCurrent]      = useState(0)
  const [localAnswers, setLocalAnswers] = useState<AnsweredMap>({ ...answeredMap })
  const [selected,     setSelected]     = useState<Option | null>(null)
  const [showResult,   setShowResult]   = useState(false)
  const [cardAnim,     setCardAnim]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [scoreGained,  setScoreGained]  = useState(false)
  const [insertError,  setInsertError]  = useState<string | null>(null)

  // Timer
  const [timeLeft,    setTimeLeft]    = useState(30)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Visual effects
  const [slideKey,           setSlideKey]           = useState(0)
  const [showConfetti,       setShowConfetti]       = useState(false)
  const [showFloatingPoints, setShowFloatingPoints] = useState(false)
  const [streakMsg,          setStreakMsg]          = useState<string | null>(null)
  const [medalEarned,        setMedalEarned]        = useState<{ icon: string; label: string } | null>(null)

  // Streak & weekly score tracking
  const [consecutive,    setConsecutive]    = useState(0)
  const [sessionCorrects, setSessionCorrects] = useState(0)

  const question       = questions[current]
  const alreadyAnswered = localAnswers[question?.id]
  const totalAnswered  = Object.keys(localAnswers).length
  const allDone        = totalAnswered >= questions.length

  // Stable refs to avoid stale closures in timer
  const localAnswersRef  = useRef(localAnswers)
  localAnswersRef.current = localAnswers
  const handleSelectRef = useRef<((opt: Option) => Promise<void>) | null>(null)

  async function handleSelect(option: Option) {
    if (localAnswersRef.current[question?.id] || loading) return

    // Stop timer
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    setInsertError(null)
    setLoading(true)
    setSelected(option)

    try {
      const { error, isCorrect } = await submitAnswer(question.id, option)
      if (error) {
        setInsertError(error)
        return
      }

      setLocalAnswers(prev => ({
        ...prev,
        [question.id]: { selected_option: option, is_correct: isCorrect },
      }))
      setShowResult(true)
      setScoreGained(isCorrect)

      if (isCorrect) {
        playSuccess()
        setCardAnim('answer-correct')
        setShowConfetti(true)
        setShowFloatingPoints(true)
        setTimeout(() => setShowFloatingPoints(false), 950)
        setTimeout(() => setShowConfetti(false), 2600)

        setConsecutive(prev => {
          const next = prev + 1
          if (next === 3) {
            setStreakMsg('¡En llamas! 🔥')
            setTimeout(() => setStreakMsg(null), 2400)
          } else if (next === 5) {
            setStreakMsg('¡Imparable! ⚡')
            setTimeout(() => setStreakMsg(null), 2400)
          }
          return next
        })

        setSessionCorrects(prev => {
          const prevScore = initialWeeklyScore + prev * 10
          const nextScore = prevScore + 10
          const prevMedal = getMedal(prevScore, false)
          const nextMedal = getMedal(nextScore, false)
          if (nextMedal && prevMedal?.label !== nextMedal.label) {
            setMedalEarned(nextMedal)
            setTimeout(() => setMedalEarned(null), 3200)
          }
          return prev + 1
        })
      } else {
        playError()
        setCardAnim('answer-incorrect')
        setConsecutive(0)
      }

      setTimeout(() => setCardAnim(''), 700)
    } catch (e) {
      setInsertError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  // Keep ref updated every render
  handleSelectRef.current = handleSelect

  // Countdown timer — resets when question changes
  useEffect(() => {
    const isAnswered = !!localAnswersRef.current[questions[current]?.id]
    if (isAnswered) { setTimeLeft(0); return }

    setTimeLeft(30)
    const correctOpt = questions[current]?.correct_option

    const id = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1
        if (next > 0 && next <= 5) playTick()
        if (next <= 0) {
          clearInterval(id)
          const wrong = (OPTIONS.find(o => o !== correctOpt) ?? 'A') as Option
          handleSelectRef.current?.(wrong)
          return 0
        }
        return next
      })
    }, 1000)

    timerRef.current = id
    return () => clearInterval(id)
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  function advanceTo(idx: number) {
    setShowResult(false)
    setSelected(null)
    setScoreGained(false)
    setSlideKey(k => k + 1)
    setCurrent(idx)
  }

  if (!question) return null

  const effectiveAnswer = alreadyAnswered ?? (
    showResult && selected
      ? { selected_option: selected, is_correct: selected === question.correct_option }
      : null
  )

  return (
    <div className="space-y-5 relative">
      <Confetti active={showConfetti} />

      {/* Medal overlay */}
      {medalEarned && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="animate-medal-pop animate-overlay-fade bg-gray-900/90 border border-yellow-500/50 rounded-3xl px-8 py-6 text-center shadow-2xl">
            <span className="text-6xl block mb-2">{medalEarned.icon}</span>
            <p className="text-yellow-300 font-bold text-xl">¡Medalla {medalEarned.label}!</p>
            <p className="text-gray-400 text-sm mt-1">Seguí jugando 🔥</p>
          </div>
        </div>
      )}

      {/* Streak banner */}
      {streakMsg && (
        <div className="fixed top-20 inset-x-0 flex justify-center z-30 pointer-events-none">
          <div className="animate-streak-pop bg-orange-900/90 border border-orange-500/60 rounded-full px-7 py-2.5 shadow-xl">
            <p className="text-orange-100 font-bold text-lg">{streakMsg}</p>
          </div>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex gap-2 flex-wrap">
        {questions.map((q, i) => {
          const ans = localAnswers[q.id]
          return (
            <button
              key={q.id}
              onClick={() => advanceTo(i)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-all border ${
                i === current
                  ? 'border-purple-400 bg-purple-600 text-white'
                  : ans
                    ? ans.is_correct
                      ? 'border-green-600 bg-green-900/50 text-green-400'
                      : 'border-red-600 bg-red-900/50 text-red-400'
                    : 'border-gray-600 bg-gray-800/40 text-gray-400'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {allDone && (
        <div className="bg-green-900/30 border border-green-700/40 rounded-2xl p-4 text-center animate-bounce-in">
          <span className="text-3xl">🎉</span>
          <p className="text-green-300 font-semibold mt-1">¡Completaste todas las trivias de hoy!</p>
          <p className="text-gray-400 text-sm">Volvé mañana para más preguntas</p>
        </div>
      )}

      {insertError && (
        <div className="bg-red-900/40 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-xl">
          Error al guardar: {insertError}
        </div>
      )}

      {/* Question card — key triggers slide-in on every question change */}
      <div key={slideKey} className="animate-slide-in relative">
        {/* Floating +10 */}
        {showFloatingPoints && (
          <div className="absolute -top-1 right-10 z-10 pointer-events-none animate-float-up">
            <span className="text-yellow-300 font-extrabold text-2xl drop-shadow-lg">+10</span>
          </div>
        )}

        <div className={`bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 ${cardAnim}`}>
          {/* Header row */}
          <div className="flex items-center gap-3 mb-4">
            <CircularTimer timeLeft={effectiveAnswer ? 0 : timeLeft} />
            <span className="text-xs text-purple-400 font-medium bg-purple-900/30 px-2.5 py-1 rounded-full">
              Pregunta {current + 1} de {questions.length}
            </span>
            {effectiveAnswer && (
              effectiveAnswer.is_correct
                ? <span className="flex items-center gap-1 text-green-400 text-xs font-semibold ml-auto"><CheckCircle size={14} /> +10 pts</span>
                : <span className="flex items-center gap-1 text-red-400 text-xs font-semibold ml-auto"><XCircle size={14} /> Incorrecta</span>
            )}
          </div>

          <h2 className="text-lg font-semibold text-white leading-snug mb-5">{question.question}</h2>

          <div className="space-y-3">
            {OPTIONS.map(opt => {
              const text       = getOptionText(question, opt)
              const isSelected = effectiveAnswer?.selected_option === opt
              const isCorrect  = question.correct_option === opt
              const showCorrect = !!effectiveAnswer && isCorrect
              const showWrong   = !!effectiveAnswer && isSelected && !isCorrect

              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  disabled={!!effectiveAnswer || loading}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 flex items-center gap-3 disabled:opacity-50 ${
                    showCorrect
                      ? 'bg-green-900/40 border-green-500 text-green-200'
                      : showWrong
                        ? 'bg-red-900/40 border-red-500 text-red-200'
                        : effectiveAnswer
                          ? 'bg-gray-700/20 border-gray-600/30 text-gray-500 cursor-default'
                          : loading
                            ? 'bg-gray-700/40 border-gray-600/50 text-white cursor-wait'
                            : 'bg-gray-700/40 border-gray-600/50 text-white hover:bg-gray-700/70 hover:border-purple-500/70 active:scale-[0.99]'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${
                    showCorrect ? 'bg-green-600 border-green-500 text-white' :
                    showWrong   ? 'bg-red-600   border-red-500   text-white' :
                                  'bg-gray-600/50 border-gray-500/50 text-gray-300'
                  }`}>
                    {opt}
                  </span>
                  <span className="text-sm">{text}</span>
                  {showCorrect && <CheckCircle size={16} className="ml-auto text-green-400 flex-shrink-0" />}
                  {showWrong   && <XCircle    size={16} className="ml-auto text-red-400   flex-shrink-0" />}
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
            {effectiveAnswer.is_correct ? (
              <>
                <CheckCircle size={18} className="text-green-400" />
                <span className="text-green-300 font-semibold">¡Correcto!</span>
                {scoreGained && (
                  <span className="flex items-center gap-1 text-yellow-300 text-sm ml-auto">
                    <Star size={14} className="text-yellow-400" /> +10 puntos
                  </span>
                )}
              </>
            ) : (
              <>
                <XCircle size={18} className="text-red-400" />
                <span className="text-red-300 font-semibold">Incorrecto</span>
                <span className="text-gray-400 text-sm ml-auto">
                  Respuesta: <span className="text-green-400 font-bold">{question.correct_option}</span>
                </span>
              </>
            )}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {/* Next button */}
      {effectiveAnswer && current < questions.length - 1 && (
        <button
          onClick={() => advanceTo(current + 1)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          Siguiente pregunta <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}
