'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react'
import GoldenParticles from '@/components/GoldenParticles'
import BibleCharacter from '@/components/BibleCharacter'
import { startAmbient, stopAmbient } from '@/lib/storyMusic'

interface Chapter {
  id: string
  book: string
  chapter: number
  title: string
  character_name: string
  character_emoji: string
  introduction: string
  bible_tip: string
}

export default function StoryIntro({
  chapter, completed, correctCount, totalQuestions,
}: {
  chapter: Chapter
  completed: boolean
  correctCount: number
  totalQuestions: number
}) {
  const router = useRouter()
  const [bookOpen, setBookOpen]   = useState(false)
  const [typed, setTyped]         = useState('')
  const [showTip, setShowTip]     = useState(false)
  const [showCta, setShowCta]     = useState(false)
  const [musicOn, setMusicOn]     = useState(false)

  // Book-open transition
  useEffect(() => {
    const t = setTimeout(() => setBookOpen(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Typewriter effect
  useEffect(() => {
    if (!bookOpen) return
    const text = chapter.introduction
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(id)
        setTimeout(() => setShowTip(true),  600)
        setTimeout(() => setShowCta(true), 1700)
      }
    }, 28)
    return () => clearInterval(id)
  }, [bookOpen, chapter.introduction])

  // Ambient music — needs user interaction to start
  function handleEnableMusic() {
    if (musicOn) { stopAmbient(); setMusicOn(false) }
    else         { startAmbient(); setMusicOn(true)  }
  }

  useEffect(() => {
    return () => { stopAmbient() }
  }, [])

  function handleStart() {
    stopAmbient()
    router.push('/historia/jugar')
  }

  function handleSkipTypewriter() {
    if (typed.length < chapter.introduction.length) {
      setTyped(chapter.introduction)
      setShowTip(true)
      setTimeout(() => setShowCta(true), 800)
    }
  }

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-all duration-700 ${
        bookOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        background:
          'radial-gradient(ellipse at top, #2d1b08 0%, #1a0f06 40%, #0a0604 100%)',
      }}
    >
      {/* Parchment vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 200px rgba(0, 0, 0, 0.7)' }} />

      {/* Star/parchment bg pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #fbbf24 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fbbf24 1px, transparent 1px), radial-gradient(circle at 40% 60%, #fde68a 1px, transparent 1px)',
          backgroundSize: '120px 120px, 80px 80px, 200px 200px',
        }}
      />

      <GoldenParticles active={bookOpen} density={45} />

      {/* Top bar */}
      <header className="relative z-20 px-4 pt-6 pb-2 max-w-lg mx-auto flex items-center justify-between">
        <button onClick={() => router.push('/')}
          className="text-yellow-200/70 hover:text-yellow-100 flex items-center gap-1 text-sm transition-colors">
          <ChevronLeft size={18} /> Volver
        </button>
        <button onClick={handleEnableMusic}
          className="text-yellow-200/70 hover:text-yellow-100 text-xs px-3 py-1.5 rounded-full border border-yellow-700/40 transition-colors">
          {musicOn ? '🔊 Silenciar' : '🎵 Música'}
        </button>
      </header>

      <div className="relative z-20 px-4 max-w-lg mx-auto pt-2 pb-12 flex flex-col items-center">

        {/* Chapter header */}
        <div className="text-center mb-3 animate-bounce-in">
          <p className="text-yellow-300/80 text-xs uppercase tracking-[0.3em] font-semibold">
            ✦ Modo Historia ✦
          </p>
          <h1 className="text-2xl font-bold text-yellow-100 mt-1.5" style={{ fontFamily: 'serif' }}>
            {chapter.book} {chapter.chapter}
          </h1>
          <p className="text-yellow-200/70 text-sm italic mt-0.5">{chapter.title}</p>
        </div>

        {/* Character — appears from below with light */}
        <div className={`relative my-2 transition-all duration-1000 ${bookOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
          {/* Light beam */}
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center">
            <div className="w-32 h-44 bg-gradient-to-t from-yellow-400/40 to-transparent blur-2xl" />
          </div>
          <BibleCharacter character={chapter.character_name} mood="neutral" size={110} className="relative" />
        </div>

        {/* Speech bubble */}
        <div
          onClick={handleSkipTypewriter}
          className="relative bg-gradient-to-b from-yellow-50 to-yellow-100/95 text-stone-900 rounded-2xl px-5 py-4 max-w-md w-full shadow-2xl shadow-yellow-900/40 border-2 border-yellow-700/60 cursor-pointer animate-bounce-in"
          style={{ minHeight: '120px' }}
        >
          {/* Bubble pointer */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-yellow-100 border-l-2 border-t-2 border-yellow-700/60 rotate-45" />

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{chapter.character_emoji}</span>
            <p className="text-stone-800 font-bold text-sm">{chapter.character_name}</p>
          </div>

          <p className="text-stone-800 text-[13px] leading-relaxed" style={{ fontFamily: 'serif' }}>
            {typed}
            {typed.length < chapter.introduction.length && (
              <span className="inline-block w-1 h-3.5 bg-stone-700 ml-0.5 animate-pulse" />
            )}
          </p>

          {typed.length < chapter.introduction.length && (
            <p className="text-stone-500 text-[10px] text-center mt-2 italic">tocá para saltar</p>
          )}
        </div>

        {/* Bible tip */}
        {showTip && (
          <div className="mt-5 max-w-md w-full animate-bounce-in">
            <div className="relative bg-gradient-to-br from-amber-900/40 to-yellow-900/30 border border-yellow-600/40 rounded-2xl p-4 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-yellow-400/20 blur-2xl rounded-full" />
              <div className="relative flex items-start gap-3">
                <div className="bg-yellow-500/20 p-2 rounded-xl border border-yellow-600/40 animate-pulse">
                  <BookOpen size={18} className="text-yellow-300" />
                </div>
                <p className="text-yellow-100 text-xs leading-relaxed flex-1">{chapter.bible_tip}</p>
              </div>
            </div>
          </div>
        )}

        {/* CTA / completed state */}
        {showCta && (
          <div className="mt-6 w-full max-w-md animate-bounce-in">
            {completed ? (
              <div className="bg-green-900/30 border border-green-700/50 rounded-2xl p-5 text-center">
                <CheckCircle2 size={36} className="text-green-400 mx-auto mb-2" />
                <p className="text-green-300 font-bold text-base">¡Ya completaste este capítulo!</p>
                <p className="text-green-200/80 text-sm mt-1">{correctCount} de {totalQuestions} respuestas correctas</p>
                <button onClick={() => router.push('/')}
                  className="mt-4 w-full py-3 rounded-xl bg-yellow-700/40 hover:bg-yellow-700/60 border border-yellow-600/40 text-yellow-100 text-sm font-medium transition-colors">
                  Volver al inicio
                </button>
              </div>
            ) : (
              <button onClick={handleStart}
                className="relative w-full py-4 bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 text-stone-900 font-bold rounded-2xl text-sm shadow-lg shadow-yellow-900/50 transition-all hover:shadow-yellow-900/80 active:scale-[0.98] overflow-hidden group">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  <Sparkles size={16} /> ¡Estoy listo! Comenzar desafío
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
