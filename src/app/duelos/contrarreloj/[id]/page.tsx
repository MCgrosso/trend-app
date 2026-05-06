export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getBlitzQuestions } from '../actions'
import BlitzGameClient from './BlitzGameClient'

export default async function BlitzGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: duel } = await supabase
    .from('blitz_duels')
    .select(`
      *,
      challenger:profiles!blitz_duels_challenger_id_fkey(id, username, first_name, avatar_url, frame, avatar_bg, pvp_rank, pvp_points),
      opponent:profiles!blitz_duels_opponent_id_fkey(id, username, first_name, avatar_url, frame, avatar_bg, pvp_rank, pvp_points)
    `)
    .eq('id', id)
    .single()

  if (!duel) notFound()
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) notFound()

  const { questions } = await getBlitzQuestions(40)

  return (
    <BlitzGameClient
      userId={user.id}
      duel={duel}
      questions={questions}
    />
  )
}
