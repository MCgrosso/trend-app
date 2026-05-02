export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import Stars from '@/components/Stars'
import PalabraOcultaClient from './PalabraOcultaClient'
import type { WordPuzzle, WordPuzzleAttempt } from '@/lib/types'
import { ChevronLeft } from 'lucide-react'

export default async function PalabraOcultaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

  const { data: puzzle } = await supabase
    .from('word_puzzles')
    .select('*')
    .eq('available_date', today)
    .maybeSingle()

  let attempt: WordPuzzleAttempt | null = null
  if (puzzle) {
    const { data: a } = await supabase
      .from('word_puzzle_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('puzzle_id', puzzle.id)
      .maybeSingle()
    attempt = (a ?? null) as WordPuzzleAttempt | null
  }

  return (
    <div className="min-h-screen relative">
      <Stars count={80} />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-4 max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 text-purple-300/80 hover:text-purple-100 text-sm transition-colors">
            <ChevronLeft size={18} /> Volver
          </Link>
          <Logo size="sm" />
        </header>

        <div className="px-4 max-w-lg mx-auto pb-10 space-y-5">
          <div className="text-center">
            <p className="text-amber-300 text-xs uppercase tracking-[0.3em] font-semibold drop-shadow">🕯️ Modo Diario ✦</p>
            <h1
              className="font-bebas text-4xl sm:text-5xl text-white leading-none mt-1"
              style={{ textShadow: '0 0 20px rgba(251,191,36,0.65), 0 4px 16px rgba(0,0,0,0.95)' }}
            >
              LA PALABRA OCULTA
            </h1>
          </div>

          {!puzzle ? (
            <div className="bg-[#0f0a2e]/80 border border-purple-700/40 rounded-2xl p-6 text-center">
              <p className="text-purple-200">No hay versículo para hoy. Volvé mañana ✨</p>
            </div>
          ) : (
            <PalabraOcultaClient puzzle={puzzle as WordPuzzle} attempt={attempt} />
          )}
        </div>
      </div>
    </div>
  )
}
