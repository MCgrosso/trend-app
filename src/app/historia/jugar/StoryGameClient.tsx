'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Sparkles, Star, BookOpen } from 'lucide-react'
import Hourglass from '@/components/Hourglass'
import GoldenParticles from '@/components/GoldenParticles'
import BibleCharacter, { Mood } from '@/components/BibleCharacter'
import Confetti from '@/components/Confetti'
import { playSuccess, playError, playTick } from '@/lib/sounds'
import { playChime } from '@/lib/storyMusic'
import { submitStoryAnswer } from '../actions'
import { SPECIAL_AVATARS } from '@/lib/avatars'
import AvatarUnlockedModal from './AvatarUnlockedModal'
import ResultCard from '@/components/ResultCard'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

interface Chapter {
  id: string
  book: string
  chapter: number
  title: string
  character_name: string
  character_emoji: string
}

interface Question {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  explanation: string
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const
type Option = typeof OPTIONS[number]

function getOptionText(q: Question, opt: Option) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[opt]
}

function reactionFor(mood: Mood, character: string) {
  if (mood === 'happy') {
    return [
      `¡Magnífico! Conocés muy bien la Palabra. Que el Señor siga iluminando tu camino. — ${character}`,
      `¡Bendición! Tu corazón está atento a las Escrituras.`,
      `¡Excelente trabajo! La Palabra de Dios habita en vos.`,
    ][Math.floor(Math.random() * 3)]
  }
  if (mood === 'sad') {
    return `Aún hay mucho por descubrir... Te invito a leer este capítulo con calma y volver a intentarlo. — ${character}`
  }
  return `Buen esfuerzo. Seguí leyendo y aprendiendo. — ${character}`
}

export default function StoryGameClient({
  chapter, questions, previousAnswers, userId,
}: {
  chapter: Chapter
  questions: Question[]
  previousAnswers: { question_id: string; is_correct: boolean }[]
  userId: string
}) {
  const router = useRouter()
  const answeredMap = new Map(previousAnswers.map(a => [a.question_id, a.is_correct]))

  const [current, setCurrent]         = useState(0)
  const [selected, setSelected]       = useState<Option | null>(null)
  const [showResult, setShowResult]   = useState(false)
  const [loading, setLoading]         = useState(false)
  const [timeLeft, setTimeLeft]       = useState(30)
  const [results, setResults]         = useState<boolean[]>([])
  const [allDone, setAllDone]         = useState(questions.length === 0 || previousAnswers.length >= questions.length)
  const [scrollKey, setScrollKey]     = useState(0)
  const [cardAnim, setCardAnim]       = useState('')
  const [showStars, setShowStars]     = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [resultCard, setResultCard] = useState<{ stars: 1 | 2 | 3; xpBefore: number; xpAfter: number; xpEarned: number; pts: number } | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const handleRef = useRef<((opt: Option) => Promise<void>) | null>(null)

  // Find an avatar gated by this exact chapter (book + chapter number).
  // The modal only triggers on a *fresh* completion via `advance()` — if the
  // user reopens an already-finished chapter, `allDone` starts true and we
  // never set `showUnlockModal`, so the celebration doesn't repeat.
  const unlockableAvatar = SPECIAL_AVATARS.find(
    a => a.chapterUnlock?.book === chapter.book && a.chapterUnlock?.chapter === chapter.chapter
  ) ?? null

  const q = questions[current]
  const alreadyAnswered = q ? answeredMap.get(q.id) : undefined

  // Initialize results from previous answers if completed
  useEffect(() => {
    if (allDone && results.length === 0 && previousAnswers.length > 0) {
      setResults(previousAnswers.map(a => a.is_correct))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelect(option: Option) {
    if (!q || loading || showResult || alreadyAnswered !== undefined) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setLoading(true); setSelected(option)

    const { isCorrect } = await submitStoryAnswer(chapter.id, q.id, option)

    setResults(prev => [...prev, isCorrect])
    setShowResult(true)
    if (isCorrect) {
      playSuccess()
      setCardAnim('answer-correct')
    } else {
      playError()
      setCardAnim('answer-incorrect')
    }
    setTimeout(() => setCardAnim(''), 700)
    setLoading(false)
  }

  handleRef.current = handleSelect

  // Countdown
  useEffect(() => {
    if (allDone || !q || showResult || alreadyAnswered !== undefined) return
    setTimeLeft(30)
    const correctOpt = q.correct_option

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
  }, [current, q?.id, allDone]) // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    setShowResult(false)
    setSelected(null)
    setScrollKey(k => k + 1)
    if (current === questions.length - 1) {
      setAllDone(true)
      setShowStars(true)
      playChime()
      setTimeout(() => setShowStars(false), 4500)
      // Disparar ResultCard con el snapshot de XP del usuario (server fetch ligero)
      const correctCount = [...results, true /*placeholder*/].slice(0, questions.length).filter(Boolean).length
      const stars: 1 | 2 | 3 = correctCount >= 5 ? 3 : correctCount >= 3 ? 2 : 1
      // Hacemos un fetch del XP del profile inmediatamente — el bonus de capítulo
      // ya fue otorgado en el último submitStoryAnswer si correspondía.
      const supabase = createBrowserClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        supabase.from('profiles').select('xp').eq('id', user.id).single().then(({ data }) => {
          const xpAfter = data?.xp ?? 0
          // Aproximamos xpEarned del juego: 5*correct + 1*wrong (+25 si todos)
          const wrongCount = results.filter(r => r === false).length
          const baseXp = correctCount * 5 + wrongCount * 1
          const bonus = correctCount + wrongCount >= questions.length ? 25 : 0
          const xpEarned = baseXp + bonus
          setResultCard({
            stars,
            xpBefore: Math.max(0, xpAfter - xpEarned),
            xpAfter,
            xpEarned,
            pts: correctCount * 10,
          })
        })
      })
      if (unlockableAvatar) {
        setTimeout(() => setShowUnlockModal(true), 1800)
      }
    } else {
      setCurrent(c => c + 1)
    }
  }

  // Animate score counter on results screen
  useEffect(() => {
    if (!allDone) return
    const target = results.filter(Boolean).length
    if (target === 0) return
    let n = 0
    const id = setInterval(() => {
      n++
      setAnimatedScore(n)
      if (n >= target) clearInterval(id)
    }, 150)
    return () => clearInterval(id)
  }, [allDone, results])

  // ── Results screen ─────────────────────────────────────────────────────────
  if (allDone) {
    const correct = results.filter(Boolean).length
    const total   = results.length || questions.length
    const mood: Mood = correct > 3 ? 'happy' : correct >= 3 ? 'neutral' : 'sad'
    const isHappy   = mood === 'happy'

    return (
      <div className="min-h-screen relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at top, #2d1b08 0%, #1a0f06 40%, #0a0604 100%)' }}>

        <GoldenParticles active={isHappy} density={60} />
        <Confetti active={showStars && isHappy} />

        <div className="relative z-20 px-4 max-w-lg mx-auto py-8 flex flex-col items-center min-h-screen justify-center">
          <BibleCharacter character={chapter.character_name} mood={mood} size={120} />

          <div className="bg-gradient-to-b from-yellow-50 to-yellow-100/95 text-stone-900 rounded-2xl px-5 py-4 max-w-md w-full shadow-2xl shadow-yellow-900/50 border-2 border-yellow-700/60 mt-4 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-yellow-100 border-l-2 border-t-2 border-yellow-700/60 rotate-45" />
            <p className="text-stone-800 text-sm leading-relaxed text-center" style={{ fontFamily: 'serif' }}>
              {reactionFor(mood, chapter.character_name)}
            </p>
          </div>

          {/* Score */}
          <div className="mt-6 text-center">
            <p className="text-yellow-300/80 text-xs uppercase tracking-[0.3em]">Tu puntaje</p>
            <p className="text-6xl font-extrabold text-yellow-200 mt-2 animate-bounce-in" style={{ fontFamily: 'serif' }}>
              {animatedScore}<span className="text-yellow-500/60 text-3xl"> / {total}</span>
            </p>
            <p className="text-yellow-300/70 text-sm mt-1">+{correct * 10} puntos al ranking</p>
          </div>

          {/* Badge */}
          <div className="mt-6 bg-gradient-to-br from-yellow-600/40 to-amber-700/30 border-2 border-yellow-500/50 rounded-2xl p-4 max-w-xs w-full text-center animate-bounce-in"
            style={{ boxShadow: '0 0 30px rgba(251, 191, 36, 0.3)' }}>
            <Sparkles size={24} className="text-yellow-300 mx-auto mb-1" />
            <p className="text-yellow-100 font-bold">🏅 Completé {chapter.book} {chapter.chapter}</p>
            <p className="text-yellow-200/80 text-xs mt-1 italic">{chapter.title}</p>
          </div>

          <button onClick={() => router.push('/profile')}
            className="mt-6 w-full max-w-xs py-3 bg-yellow-700/40 hover:bg-yellow-700/60 border border-yellow-600/40 text-yellow-100 font-medium rounded-xl text-sm transition-colors">
            Ver mi viaje bíblico
          </button>
          <button onClick={() => router.push('/')}
            className="mt-2 w-full max-w-xs py-3 text-yellow-200/70 hover:text-yellow-100 text-sm transition-colors">
            Volver al inicio
          </button>
        </div>

        {showUnlockModal && unlockableAvatar && (
          <AvatarUnlockedModal
            avatar={unlockableAvatar}
            userId={userId}
            onClose={() => setShowUnlockModal(false)}
          />
        )}

        {resultCard && (
          <ResultCard
            open
            stars={resultCard.stars}
            title="¡Capítulo completado!"
            subtitle={`${chapter.book} ${chapter.chapter}`}
            pointsEarned={resultCard.pts}
            xpEarned={resultCard.xpEarned}
            xpBefore={resultCard.xpBefore}
            xpAfter={resultCard.xpAfter}
            onClose={() => setResultCard(null)}
          />
        )}
      </div>
    )
  }

  // ── Play screen ────────────────────────────────────────────────────────────
  if (!q) return null

  const effectiveAnswer = showResult && selected
    ? { selected_option: selected, is_correct: selected === q.correct_option }
    : null

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #2d1b08 0%, #1a0f06 40%, #0a0604 100%)' }}>

      {/* Parchment vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 200px rgba(0, 0, 0, 0.7)' }} />

      <div className="relative z-10 px-4 max-w-lg mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-yellow-400/70 text-[10px] uppercase tracking-[0.25em]">{chapter.book} {chapter.chapter}</p>
            <p className="text-yellow-100 font-bold text-sm" style={{ fontFamily: 'serif' }}>{chapter.title}</p>
          </div>
          <Hourglass timeLeft={effectiveAnswer ? 0 : timeLeft} />
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-5">
          {questions.map((_, i) => {
            const r = results[i]
            return (
              <div key={i} className={`flex-1 h-2 rounded-full ${
                r === true  ? 'bg-green-500'
                : r === false ? 'bg-red-500'
                : i === current ? 'bg-yellow-500'
                : 'bg-yellow-900/40'
              }`} />
            )
          })}
        </div>

        {/* Scroll/parchment card */}
        <div key={scrollKey} className="animate-scroll-unroll">
          <div className={`relative bg-gradient-to-b from-amber-100/95 to-yellow-50/95 text-stone-900 rounded-2xl border-4 border-yellow-700/60 shadow-2xl shadow-black/60 p-5 ${cardAnim}`}
            style={{ boxShadow: '0 0 0 2px #d4a247, 0 20px 40px rgba(0,0,0,0.5)' }}>

            {/* Decorative corners */}
            <span className="absolute top-2 left-2 text-yellow-700/60 text-xs">✦</span>
            <span className="absolute top-2 right-2 text-yellow-700/60 text-xs">✦</span>
            <span className="absolute bottom-2 left-2 text-yellow-700/60 text-xs">✦</span>
            <span className="absolute bottom-2 right-2 text-yellow-700/60 text-xs">✦</span>

            <p className="text-yellow-700/80 text-[10px] uppercase tracking-widest text-center font-bold mb-2">
              Pregunta {current + 1} de {questions.length}
            </p>

            <h2 className="text-stone-900 font-semibold text-base leading-snug text-center mb-5 px-2" style={{ fontFamily: 'serif' }}>
              {q.question}
            </h2>

            <div className="space-y-2.5">
              {OPTIONS.map(opt => {
                const text       = getOptionText(q, opt)
                const isSelected = effectiveAnswer?.selected_option === opt
                const isCorrect  = q.correct_option === opt
                const showCorrect = !!effectiveAnswer && isCorrect
                const showWrong   = !!effectiveAnswer && isSelected && !isCorrect

                return (
                  <button key={opt} onClick={() => handleSelect(opt)}
                    disabled={!!effectiveAnswer || loading}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 disabled:opacity-60 ${
                      showCorrect
                        ? 'bg-green-100 border-green-600 text-green-900'
                        : showWrong
                          ? 'bg-red-100 border-red-600 text-red-900'
                          : effectiveAnswer
                            ? 'bg-yellow-100/40 border-yellow-700/30 text-stone-500'
                            : 'bg-yellow-100/60 border-yellow-700/40 text-stone-800 hover:bg-yellow-200 hover:border-yellow-700/70 active:scale-[0.99]'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 ${
                      showCorrect ? 'bg-green-600 border-green-700 text-white' :
                      showWrong   ? 'bg-red-600 border-red-700 text-white' :
                                    'bg-yellow-700/20 border-yellow-700/50 text-yellow-900'
                    }`}>{opt}</span>
                    <span className="text-sm font-medium" style={{ fontFamily: 'serif' }}>{text}</span>
                    {showCorrect && <CheckCircle size={16} className="ml-auto text-green-700 flex-shrink-0" />}
                    {showWrong   && <XCircle    size={16} className="ml-auto text-red-700 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Explanation */}
        {effectiveAnswer && (
          <div className={`mt-4 rounded-2xl p-4 border-2 animate-bounce-in ${
            effectiveAnswer.is_correct
              ? 'bg-green-900/30 border-green-700/50'
              : 'bg-red-900/30 border-red-700/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {effectiveAnswer.is_correct ? (
                <>
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-300 font-semibold text-sm">¡Correcto!</span>
                  <span className="ml-auto flex items-center gap-1 text-yellow-300 text-xs">
                    <Star size={12} className="text-yellow-400" /> +10
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-red-400" />
                  <span className="text-red-300 font-semibold text-sm">Incorrecto</span>
                  <span className="ml-auto text-yellow-200/80 text-xs">Resp: <span className="text-green-400 font-bold">{q.correct_option}</span></span>
                </>
              )}
            </div>
            <p className="text-yellow-100/90 text-xs leading-relaxed flex items-start gap-2">
              <BookOpen size={12} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <span>{q.explanation}</span>
            </p>
          </div>
        )}

        {/* Next button */}
        {effectiveAnswer && (
          <button onClick={advance}
            className="mt-4 w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-stone-900 font-bold py-3 rounded-xl text-sm shadow-lg shadow-yellow-900/40 transition-all">
            {current === questions.length - 1 ? 'Ver resultados ✨' : 'Siguiente pregunta →'}
          </button>
        )}
      </div>
    </div>
  )
}
