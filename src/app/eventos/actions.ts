'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Marca el día como completado y otorga la recompensa (frame del día + avatar
// David si es el día 7). Idempotente: si ya estaba completo, no re-otorga.
export async function completeDayChallenge({
  challengeId,
  score,
}: {
  challengeId: string
  score: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: challenge, error: cErr } = await supabase
    .from('events_challenge')
    .select('id, day_number, frame_reward, event_name')
    .eq('id', challengeId)
    .single()
  if (cErr || !challenge) return { error: 'Desafío no encontrado' }

  // Upsert progress (puede existir si abrió y guardó reflexión sin completar)
  const { error: upErr } = await supabase
    .from('events_progress')
    .upsert(
      {
        user_id: user.id,
        challenge_day_id: challengeId,
        completed: true,
        score,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,challenge_day_id' }
    )
  if (upErr) {
    console.log('[completeDayChallenge] upsert error:', upErr)
    return { error: upErr.message }
  }

  // Otorgar marco del día (auto-equip)
  if (challenge.frame_reward) {
    await supabase.from('profiles').update({ frame: challenge.frame_reward }).eq('id', user.id)
  }

  // Si todos los 7 días del Valle de Elá están completos → desbloquear avatar David
  const { data: progressAll } = await supabase
    .from('events_progress')
    .select('completed, challenge:events_challenge!inner(event_name)')
    .eq('user_id', user.id)
    .eq('challenge.event_name', challenge.event_name)
  const completedCount = (progressAll ?? []).filter(p => p.completed).length
  if (completedCount >= 7) {
    await supabase.from('profiles').update({ avatar_url: 'avatar_david' }).eq('id', user.id)
  }

  revalidatePath('/eventos')
  revalidatePath(`/eventos/dia/${challenge.day_number}`)
  revalidatePath('/profile')

  return { error: null, dayCompleted: true, allComplete: completedCount >= 7 }
}

export async function saveReflection({
  challengeId,
  answer,
  isPublic,
}: {
  challengeId: string
  answer: string
  isPublic: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const trimmed = answer.trim()
  if (trimmed.length < 20) return { error: 'La reflexión debe tener al menos 20 caracteres' }
  if (trimmed.length > 2000) return { error: 'La reflexión es demasiado larga' }

  const { error } = await supabase
    .from('events_progress')
    .upsert(
      {
        user_id: user.id,
        challenge_day_id: challengeId,
        reflection_answer: trimmed,
        is_public: isPublic,
      },
      { onConflict: 'user_id,challenge_day_id' }
    )
  if (error) {
    console.log('[saveReflection] upsert error:', error)
    return { error: error.message }
  }

  revalidatePath('/eventos')
  revalidatePath('/perfil/[username]', 'page')
  return { error: null }
}

export async function toggleReflectionPublic({
  progressId,
  isPublic,
}: {
  progressId: string
  isPublic: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('events_progress')
    .update({ is_public: isPublic })
    .eq('id', progressId)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/perfil/[username]', 'page')
  return { error: null }
}
