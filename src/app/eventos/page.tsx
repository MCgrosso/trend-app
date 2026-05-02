export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import EventosClient from './EventosClient'
import EventosMusic from './EventosMusic'
import type { EventChallenge, EventProgress } from '@/lib/types'

export default async function EventosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: challengesRaw } = await supabase
    .from('events_challenge')
    .select('*')
    .eq('event_name', 'Valle de Elá')
    .order('day_number', { ascending: true })

  const challenges = (challengesRaw ?? []) as EventChallenge[]

  let progress: EventProgress[] = []
  if (user) {
    const { data: progressRaw } = await supabase
      .from('events_progress')
      .select('*')
      .eq('user_id', user.id)
      .in('challenge_day_id', challenges.map(c => c.id))
    progress = (progressRaw ?? []) as EventProgress[]
  }

  return (
    <>
      <EventosMusic />
      <EventosClient
        challenges={challenges}
        progress={progress}
        isLoggedIn={!!user}
      />
    </>
  )
}
