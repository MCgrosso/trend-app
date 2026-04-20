export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DuelosClient from './DuelosClient'

export default async function DuelosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayStr = new Date().toISOString().split('T')[0]

  const [
    { data: profile },
    { data: duels },
    { data: dailyCountRaw },
    { data: allPlayers },
    { data: activeTodayRaw },
    { data: challengedTodayRaw },
  ] = await Promise.all([
    // My profile
    supabase
      .from('profiles')
      .select('id, username, first_name, avatar_url, frame, duel_wins, duel_losses, duel_draws, duel_win_streak, duel_best_streak, title')
      .eq('id', user.id)
      .single(),

    // My duels (pending + active + recent finished)
    supabase
      .from('duels')
      .select(`
        *,
        challenger:profiles!duels_challenger_id_fkey(id, username, first_name, avatar_url, frame, title),
        opponent:profiles!duels_opponent_id_fkey(id, username, first_name, avatar_url, frame, title)
      `)
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20),

    // Daily duel count
    supabase.rpc('get_daily_duel_count', { p_user_id: user.id }),

    // All players ordered by total_score
    supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, frame, title, total_score, duel_wins, duel_losses')
      .order('total_score', { ascending: false }),

    // Who answered at least once today (active today)
    supabase
      .from('answers')
      .select('user_id')
      .gte('answered_at', `${todayStr}T00:00:00.000Z`),

    // Opponents challenged today by me (not cancelled/rejected)
    supabase
      .from('duels')
      .select('opponent_id')
      .eq('challenger_id', user.id)
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .not('status', 'in', '(cancelled,rejected)'),
  ])

  const activeTodayIds    = new Set((activeTodayRaw    ?? []).map((a: { user_id: string }) => a.user_id))
  const challengedTodayIds = new Set((challengedTodayRaw ?? []).map((d: { opponent_id: string }) => d.opponent_id))

  return (
    <DuelosClient
      userId={user.id}
      profile={profile}
      duels={duels ?? []}
      dailyCount={dailyCountRaw ?? 0}
      players={allPlayers ?? []}
      activeTodayIds={[...activeTodayIds]}
      challengedTodayIds={[...challengedTodayIds]}
    />
  )
}
