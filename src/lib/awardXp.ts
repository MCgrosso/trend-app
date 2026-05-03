'use server'

import { createClient } from '@/lib/supabase/server'

export type AwardXpResult = {
  ok: boolean
  newXp: number
  newLevel: number
  levelsGained: number
  error?: string
}

// Wrapper sobre la RPC `award_xp`. Pensado para ser llamado desde otros
// server actions (no es un endpoint expuesto al cliente directamente).
export async function awardXpTo(userId: string, amount: number): Promise<AwardXpResult> {
  if (amount <= 0) return { ok: true, newXp: 0, newLevel: 0, levelsGained: 0 }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_amount: amount,
  })

  if (error) {
    console.log('[awardXpTo] error:', error)
    return { ok: false, newXp: 0, newLevel: 0, levelsGained: 0, error: error.message }
  }
  const obj = (data ?? {}) as { ok?: boolean; new_xp?: number; new_level?: number; levels_gained?: number; error?: string }
  if (obj.error) return { ok: false, newXp: 0, newLevel: 0, levelsGained: 0, error: obj.error }
  return {
    ok: true,
    newXp: obj.new_xp ?? 0,
    newLevel: obj.new_level ?? 1,
    levelsGained: obj.levels_gained ?? 0,
  }
}
