'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Trophy, Skull, Clock, Star, Lightbulb, RefreshCw } from 'lucide-react'
import Confetti from '@/components/Confetti'
import GoldenParticles from '@/components/GoldenParticles'
import Candles from './Candles'
import VirtualKeyboard from './VirtualKeyboard'
import { playLetterReveal, playError, playBattleVictory, playBattleDefeat } from '@/lib/sounds'
import { submitPuzzleAttempt } from './actions'
import { computeScore } from './score'
import type { WordPuzzle, WordPuzzleAttempt } from '@/lib/types'

const MAX_ERRORS = 6

// Normaliza una letra: a minúscula sin diacríticos. La Ñ se mantiene como letra
// distinta (igual que el teclado español). El resto se vuelve plain ASCII.
function normalizeLetter(ch: string): string {
  const lower = ch.toLowerCase()
  if (lower === 'ñ') return 'ñ'
  return lower.normalize('NFD').replace(/\p{M}/gu, '')
}

const LETTER_RE = /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)|([^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/g

type Token = { text: string; isWord: boolean; isHidden: boolean }

function tokenize(verse: string, hiddenWords: string[]): Token[] {
  const hiddenSet = new Set(hiddenWords.map(w => normalizeWord(w)))
  const out: Token[] = []
  let m
  LETTER_RE.lastIndex = 0
  while ((m = LETTER_RE.exec(verse)) !== null) {
    if (m[1]) {
      out.push({ text: m[1], isWord: true, isHidden: hiddenSet.has(normalizeWord(m[1])) })
    } else if (m[2]) {
      out.push({ text: m[2], isWord: false, isHidden: false })
    }
  }
  return out
}

function normalizeWord(w: string): string {
  return w.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

export default function PalabraOcultaClient({
  puzzle,
  attempt,
}: {
  puzzle: WordPuzzle
  attempt: WordPuzzleAttempt | null
}) {
  const tokens = useMemo(() => tokenize(puzzle.verse, puzzle.hidden_words), [puzzle.verse, puzzle.hidden_words])

  // Conjunto de TODAS las letras normalizadas que hay en las palabras ocultas.
  // Para detectar victoria: cuando `revealed` ⊇ targetLetters.
  const targetLetters = useMemo(() => {
    const s = new Set<string>()
    for (const t of tokens) {
      if (t.isHidden) {
        for (const ch of t.text) s.add(normalizeLetter(ch))
      }
    }
    return s
  }, [tokens])

  // Estado del juego — si ya hay un intento previo, mostramos directamente el resultado.
  const initialPhase: Phase = attempt ? (attempt.completed ? 'won' : 'lost') : 'playing'
  const [phase, setPhase]       = useState<Phase>(initialPhase)
  const [revealed, setRevealed] = useState<Set<string>>(() => attempt ? targetLetters : new Set())
  const [wrong, setWrong]       = useState<Set<string>>(new Set())
  const [errors, setErrors]     = useState(attempt?.errors ?? 0)
  const [seconds, setSeconds]   = useState(attempt?.time_seconds ?? 0)
  const [shake, setShake]       = useState(false)
  const [flash, setFlash]       = useState<{ kind: 'good' | 'bad'; key: number } | null>(null)
  const submittedRef = useRef(!!attempt)

  // Cronómetro: solo corre cuando el juego está en 'playing'
  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  async function finalize(completed: boolean, finalErrors: number, finalSeconds: number) {
    if (submittedRef.current) return
    submittedRef.current = true
    if (completed) playBattleVictory()
    else playBattleDefeat()
    await submitPuzzleAttempt({
      puzzleId: puzzle.id,
      completed,
      errors: finalErrors,
      timeSeconds: finalSeconds,
    })
  }

  function pickLetter(L: string) {
    if (phase !== 'playing') return
    const norm = normalizeLetter(L)
    if (revealed.has(norm) || wrong.has(L)) return

    if (targetLetters.has(norm)) {
      // Letra correcta
      const next = new Set(revealed); next.add(norm)
      setRevealed(next)
      playLetterReveal()
      setFlash({ kind: 'good', key: Date.now() })
      // Verificar victoria
      if ([...targetLetters].every(t => next.has(t))) {
        setPhase('won')
        finalize(true, errors, seconds)
      }
    } else {
      // Letra incorrecta
      const newWrong = new Set(wrong); newWrong.add(L)
      setWrong(newWrong)
      const newErrors = errors + 1
      setErrors(newErrors)
      playError()
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setFlash({ kind: 'bad', key: Date.now() })
      if (newErrors >= MAX_ERRORS) {
        setPhase('lost')
        // Revelar todo para mostrar el versículo completo en pantalla de derrota
        setRevealed(new Set(targetLetters))
        finalize(false, newErrors, seconds)
      }
    }
  }

  // Conjuntos para el teclado: letras YA correctas (a partir de la letra
  // visible que el user pulsó). Para mostrar marcado en verde, necesitamos
  // recordar qué letra A-Z el user efectivamente probó. Usamos `revealed`
  // (conjunto de normalizadas) y mapeamos a su versión mayúscula simple.
  const correctKb = useMemo(() => {
    const s = new Set<string>()
    for (const ch of revealed) {
      if (ch === 'ñ') s.add('Ñ')
      else s.add(ch.toUpperCase())
    }
    return s
  }, [revealed])

  const score = phase === 'won' || phase === 'lost'
    ? computeScore({ completed: phase === 'won', errors, timeSeconds: seconds })
    : 0

  return (
    <div className={`space-y-5 ${shake ? 'animate-screen-shake' : ''}`}>
      {phase === 'won' && (
        <>
          <Confetti active />
          <GoldenParticles active density={90} />
        </>
      )}

      {/* Pista + referencia */}
      <div className="bg-[#0f0a2e]/80 border border-amber-500/40 rounded-2xl p-4 text-center">
        <p className="text-amber-300 text-[10px] uppercase tracking-widest font-bold">📖 Referencia</p>
        <p className="text-amber-100 font-bebas text-2xl leading-none mt-0.5">{puzzle.reference}</p>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-purple-200/80 text-xs">
          <Lightbulb size={12} className="text-yellow-400" />
          <span className="italic">{puzzle.hint}</span>
        </div>
      </div>

      {/* Velas */}
      <div className="flex flex-col items-center gap-1">
        <Candles errors={errors} celebrate={phase === 'won'} />
        <p className="text-purple-200/70 text-[11px] mt-1">
          {phase === 'lost' ? 'Las velas se apagaron...' : `Te quedan ${MAX_ERRORS - errors} velas`}
        </p>
      </div>

      {/* Verso con máscara */}
      <div className="bg-gradient-to-b from-[#0a071e] to-[#0f0a2e] border border-purple-500/40 rounded-2xl p-5 leading-loose text-center">
        <p className="text-white text-base sm:text-lg" style={{ fontFamily: 'serif', wordSpacing: '0.1em' }}>
          {tokens.map((t, i) => (
            <TokenView key={i} token={t} revealed={revealed} reveal={phase !== 'playing'} />
          ))}
        </p>
      </div>

      {/* HUD: tiempo + errores */}
      <div className="flex justify-between items-center text-xs text-purple-200/80 px-1">
        <div className="flex items-center gap-1.5">
          <Clock size={12} /> <span className="tabular-nums">{formatTime(seconds)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-400">✗</span> {errors} {errors === 1 ? 'error' : 'errores'}
        </div>
      </div>

      {/* Teclado o resultado */}
      {phase === 'playing' ? (
        <VirtualKeyboard
          used={new Set()}
          correct={correctKb}
          wrong={wrong}
          disabled={false}
          onPick={pickLetter}
        />
      ) : (
        <ResultPanel
          phase={phase}
          errors={errors}
          seconds={seconds}
          score={score}
        />
      )}

      {/* Mini feedback visual */}
      {flash && (
        <div
          key={flash.key}
          className={`fixed top-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold pointer-events-none animate-bounce-in ${
            flash.kind === 'good' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}
        >
          {flash.kind === 'good' ? '✦ Correcto' : '✗ Falló'}
        </div>
      )}
    </div>
  )
}

type Phase = 'playing' | 'won' | 'lost'

function TokenView({ token, revealed, reveal }: { token: Token; revealed: Set<string>; reveal: boolean }) {
  if (!token.isWord) return <span>{token.text}</span>
  if (!token.isHidden) return <span>{token.text}</span>

  // Hidden word: render each char as slot. Reveal letter when normalized form
  // is in `revealed`, OR when the game is over (reveal all).
  return (
    <span className="inline-flex items-end mx-0.5">
      {token.text.split('').map((ch, i) => {
        const norm = normalizeLetter(ch)
        const show = reveal || revealed.has(norm)
        return (
          <span
            key={i}
            className={`relative mx-[1px] inline-block min-w-[0.7em] text-center border-b-2 ${
              show ? 'border-emerald-400/50 text-emerald-100' : 'border-amber-300/60 text-transparent'
            }`}
            style={{ minWidth: '0.7em', lineHeight: 1.2 }}
          >
            {show ? (
              <span className={revealed.has(norm) && !reveal ? 'animate-letter-reveal' : ''}>{ch}</span>
            ) : (
              ' '
            )}
          </span>
        )
      })}
    </span>
  )
}

function ResultPanel({
  phase, errors, seconds, score,
}: {
  phase: 'won' | 'lost'; errors: number; seconds: number; score: number
}) {
  const won = phase === 'won'
  return (
    <div className={`rounded-2xl p-5 border-2 text-center ${
      won
        ? 'bg-gradient-to-br from-amber-900/40 to-yellow-900/30 border-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.4)]'
        : 'bg-gradient-to-br from-red-900/40 to-purple-950/40 border-red-500/50'
    }`}>
      {won ? (
        <Trophy size={32} className="text-amber-300 mx-auto drop-shadow-[0_0_14px_rgba(251,191,36,0.8)]" />
      ) : (
        <Skull size={32} className="text-red-300 mx-auto" />
      )}
      <h2 className={`font-bebas text-3xl mt-2 leading-none ${won ? 'text-amber-100' : 'text-red-200'}`}>
        {won ? '¡PALABRA REVELADA!' : 'SE APAGARON LAS VELAS'}
      </h2>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="bg-black/30 rounded-lg p-2">
          <Clock size={14} className="text-cyan-300 mx-auto mb-0.5" />
          <p className="font-bebas text-lg text-white leading-none tabular-nums">{formatTime(seconds)}</p>
          <p className="text-[10px] text-gray-400">Tiempo</p>
        </div>
        <div className="bg-black/30 rounded-lg p-2">
          <span className="text-red-400">✗</span>
          <p className="font-bebas text-lg text-white leading-none">{errors}</p>
          <p className="text-[10px] text-gray-400">Errores</p>
        </div>
        <div className="bg-black/30 rounded-lg p-2">
          <Star size={14} className="text-yellow-300 mx-auto mb-0.5" />
          <p className="font-bebas text-lg text-yellow-200 leading-none">+{score}</p>
          <p className="text-[10px] text-gray-400">Puntos</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Link
          href="/profile"
          className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          Ver mi perfil
        </Link>
        <Link
          href="/"
          className="text-purple-300 hover:text-purple-100 text-sm py-1 transition-colors flex items-center justify-center gap-1"
        >
          <RefreshCw size={12} /> Volvé mañana por un nuevo versículo
        </Link>
      </div>
    </div>
  )
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
