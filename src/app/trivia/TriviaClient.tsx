'use client'

import { useState } from 'react'
import { Question } from '@/lib/types'
import { submitAnswer } from './actions'
import { CheckCircle, XCircle, ChevronRight, Star } from 'lucide-react'

type AnsweredMap = Record<string, { selected_option: string; is_correct: boolean }>

interface Props {
  questions: Question[]
  answeredMap: AnsweredMap
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const
type Option = typeof OPTIONS[number]

export default function TriviaClient({ questions, answeredMap }: Props) {
  const [current, setCurrent] = useState(0)
  const [localAnswers, setLocalAnswers] = useState<AnsweredMap>({ ...answeredMap })
  const [selected, setSelected] = useState<Option | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [animClass, setAnimClass] = useState('')
  const [loading, setLoading] = useState(false)
  const [scoreGained, setScoreGained] = useState(false)
  const [insertError, setInsertError] = useState<string | null>(null)

  const question = questions[current]
  const alreadyAnswered = localAnswers[question?.id]
  const totalAnswered = Object.keys(localAnswers).length
  const allDone = totalAnswered >= questions.length

  function getOptionText(q: Question, opt: Option) {
    return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[opt]
  }

  async function handleSelect(option: Option) {
    if (alreadyAnswered || loading) return
    setInsertError(null)
    setLoading(true)
    setSelected(option)

    try {
      const { error, isCorrect } = await submitAnswer(question.id, option)

      if (error) {
        console.error('[trivia] submitAnswer error:', error)
        setInsertError(error)
      } else {
        setLocalAnswers(prev => ({
          ...prev,
          [question.id]: { selected_option: option, is_correct: isCorrect },
        }))
        setAnimClass(isCorrect ? 'answer-correct' : 'answer-incorrect')
        setShowResult(true)
        setScoreGained(isCorrect)
        setTimeout(() => setAnimClass(''), 700)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error de red'
      console.error('[trivia] exception in handleSelect:', e)
      setInsertError(msg)
    } finally {
      setLoading(false)
    }
  }

  function nextQuestion() {
    setShowResult(false)
    setSelected(null)
    setScoreGained(false)
    if (current < questions.length - 1) setCurrent(current + 1)
  }

  function goToQuestion(idx: number) {
    setShowResult(false)
    setSelected(null)
    setScoreGained(false)
    setCurrent(idx)
  }

  if (!question) return null

  const effectiveAnswer = alreadyAnswered ?? (showResult && selected ? { selected_option: selected, is_correct: selected === question.correct_option } : null)

  return (
    <div className="space-y-5">
      {/* Progress dots */}
      <div className="flex gap-2 flex-wrap">
        {questions.map((q, i) => {
          const ans = localAnswers[q.id]
          return (
            <button
              key={q.id}
              onClick={() => goToQuestion(i)}
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

      {/* Question card */}
      <div className={`bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 ${animClass}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-purple-400 font-medium bg-purple-900/30 px-2.5 py-1 rounded-full">
            Pregunta {current + 1} de {questions.length}
          </span>
          {effectiveAnswer && (
            effectiveAnswer.is_correct
              ? <span className="flex items-center gap-1 text-green-400 text-xs font-semibold"><CheckCircle size={14} /> +10 pts</span>
              : <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><XCircle size={14} /> Incorrecta</span>
          )}
        </div>
        <h2 className="text-lg font-semibold text-white leading-snug mb-5">{question.question}</h2>

        <div className="space-y-3">
          {OPTIONS.map(opt => {
            const text = getOptionText(question, opt)
            const isSelected = effectiveAnswer?.selected_option === opt
            const isCorrect = question.correct_option === opt
            const showCorrect = !!effectiveAnswer && isCorrect
            const showWrong = !!effectiveAnswer && isSelected && !isCorrect

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
                  showWrong ? 'bg-red-600 border-red-500 text-white' :
                  'bg-gray-600/50 border-gray-500/50 text-gray-300'
                }`}>
                  {opt}
                </span>
                <span className="text-sm">{text}</span>
                {showCorrect && <CheckCircle size={16} className="ml-auto text-green-400 flex-shrink-0" />}
                {showWrong && <XCircle size={16} className="ml-auto text-red-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      {effectiveAnswer && (
        <div className={`rounded-2xl p-4 border animate-bounce-in ${
          effectiveAnswer.is_correct
            ? 'bg-green-900/20 border-green-700/40'
            : 'bg-red-900/20 border-red-700/40'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {effectiveAnswer.is_correct ? (
              <>
                <CheckCircle size={18} className="text-green-400" />
                <span className="text-green-300 font-semibold">¡Correcto!</span>
                {scoreGained && (
                  <span className="flex items-center gap-1 text-yellow-300 text-sm ml-auto">
                    <Star size={14} className="text-yellow-400" />
                    +10 puntos
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
          onClick={nextQuestion}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          Siguiente pregunta
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}
