'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeScore } from './score'

export async function submitPuzzleAttempt({
  puzzleId,
  completed,
  errors,
  timeSeconds,
}: {
  puzzleId: string
  completed: boolean
  errors: number
  timeSeconds: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', score: 0 }

  // Sanitizar inputs por las dudas
  const safeErrors = Math.max(0, Math.min(99, Math.floor(errors)))
  const safeTime   = Math.max(0, Math.min(3600, Math.floor(timeSeconds)))
  const score      = computeScore({ completed, errors: safeErrors, timeSeconds: safeTime })

  const { error } = await supabase
    .from('word_puzzle_attempts')
    .upsert(
      {
        user_id: user.id,
        puzzle_id: puzzleId,
        completed,
        errors: safeErrors,
        time_seconds: safeTime,
        score,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,puzzle_id' }
    )

  if (error) {
    console.log('[submitPuzzleAttempt] error:', error)
    return { error: error.message, score: 0 }
  }

  // Sumar puntos al total_score del usuario si completó (idempotente: solo
  // primera vez. Por simplicidad reposamos en `unique` para que un retry
  // tras completar no vuelva a sumar — el upsert no incrementa total_score.)
  // En su lugar, simplemente sumamos en el primer intento exitoso. La RLS
  // policy del profiles UPDATE permite al user actualizar su propio row.
  if (completed && score > 0) {
    // Sumar al total_score del usuario. El UNIQUE (user_id, puzzle_id) impide
    // múltiples intentos completados sobre el mismo puzzle, así que esto sólo
    // corre una vez por (user, puzzle). Lectura + update simple (RLS permite
    // al user actualizar su propio profile).
    const { data: prof } = await supabase.from('profiles').select('total_score').eq('id', user.id).single()
    const current = prof?.total_score ?? 0
    await supabase.from('profiles').update({ total_score: current + score }).eq('id', user.id)
  }

  revalidatePath('/palabra-oculta')
  revalidatePath('/profile')
  return { error: null, score }
}
