export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DuelosClient from './DuelosClient'

export default async function DuelosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, first_name, avatar_url, frame, duel_wins, duel_losses, duel_draws, duel_win_streak, duel_best_streak, title')
    .eq('id', user.id)
    .single()

  // Duels involving this user (last 20)
  const { data: duels } = await supabase
    .from('duels')
    .select(`
      *,
      challenger:profiles!duels_challenger_id_fkey(id, username, first_name, avatar_url, frame, title),
      opponent:profiles!duels_opponent_id_fkey(id, username, first_name, avatar_url, frame, title)
    `)
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(20)

  // Daily count
  const { data: dailyCount } = await supabase.rpc('get_daily_duel_count', { p_user_id: user.id })

  return (
    <DuelosClient
      userId={user.id}
      profile={profile}
      duels={duels ?? []}
      dailyCount={dailyCount ?? 0}
    />
  )
}
