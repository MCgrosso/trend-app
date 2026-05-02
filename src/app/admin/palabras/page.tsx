export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import PalabrasAdminClient from './PalabrasAdminClient'

export default async function AdminPalabrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/')

  const { data: puzzlesRaw } = await supabase
    .from('word_puzzles')
    .select('*')
    .order('available_date', { ascending: false })

  const puzzles = puzzlesRaw ?? []

  // Stats por puzzle: cantidad de intentos, completados, errores promedio
  const puzzleIds = puzzles.map(p => p.id)
  const { data: attempts } = puzzleIds.length
    ? await supabase
        .from('word_puzzle_attempts')
        .select('puzzle_id, completed, errors')
        .in('puzzle_id', puzzleIds)
    : { data: [] as Array<{ puzzle_id: string; completed: boolean; errors: number }> }

  const statsByPuzzle = new Map<string, { total: number; won: number; avgErrors: number }>()
  for (const id of puzzleIds) statsByPuzzle.set(id, { total: 0, won: 0, avgErrors: 0 })
  const errorTotals = new Map<string, number>()
  for (const a of attempts ?? []) {
    const s = statsByPuzzle.get(a.puzzle_id)
    if (!s) continue
    s.total += 1
    if (a.completed) s.won += 1
    errorTotals.set(a.puzzle_id, (errorTotals.get(a.puzzle_id) ?? 0) + a.errors)
  }
  for (const [id, s] of statsByPuzzle) {
    s.avgErrors = s.total > 0 ? (errorTotals.get(id) ?? 0) / s.total : 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center justify-between">
        <Logo size="sm" />
        <span className="text-xs text-yellow-400 bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 rounded-full">Panel Admin</span>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-5 pb-8">
        <div>
          <Link href="/admin" className="text-gray-400 text-xs hover:text-gray-200">← Panel</Link>
          <h1 className="text-2xl font-bold text-white mt-1">La Palabra Oculta</h1>
          <p className="text-gray-400 text-sm mt-1">Versículos del juego diario</p>
        </div>

        <PalabrasAdminClient puzzles={puzzles} statsByPuzzle={Array.from(statsByPuzzle.entries())} />
      </div>
    </div>
  )
}
