export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import RpgBattleClient from './RpgBattleClient'
import NarrativeClient from './NarrativeClient'
import UnlockClient from './UnlockClient'
import type { EventChallenge, EventProgress } from '@/lib/types'

export default async function DayChallengePage({
  params,
}: {
  params: Promise<{ day: string }>
}) {
  const { day } = await params
  const dayNum = Number(day)
  if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 7) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: challengeRaw } = await supabase
    .from('events_challenge')
    .select('*')
    .eq('event_name', 'Valle de Elá')
    .eq('day_number', dayNum)
    .maybeSingle()

  if (!challengeRaw) notFound()
  const challenge = challengeRaw as EventChallenge

  // Si todavía no se desbloqueó → volver a /eventos
  const unlockMs = new Date(challenge.unlock_date).getTime()
  if (unlockMs > Date.now()) redirect('/eventos')

  const { data: progressRaw } = await supabase
    .from('events_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('challenge_day_id', challenge.id)
    .maybeSingle()
  const progress = (progressRaw ?? null) as EventProgress | null

  if (challenge.format === 'rpg') {
    return <RpgBattleClient challenge={challenge} progress={progress} />
  }
  if (challenge.format === 'narrative') {
    return <NarrativeClient challenge={challenge} progress={progress} />
  }
  return <UnlockClient challenge={challenge} progress={progress} userId={user.id} />
}
