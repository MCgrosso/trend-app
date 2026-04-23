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
    { data: challengedTodayRaw },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, first_name, avatar_url, frame, avatar_bg, wins, losses, draws, win_streak, best_streak, title')
      .eq('id', user.id)
      .single(),

    supabase
      .from('duels')
      .select(`
        *,
        challenger:profiles!duels_challenger_id_fkey(id, username, first_name, avatar_url, frame, avatar_bg, title),
        opponent:profiles!duels_opponent_id_fkey(id, username, first_name, avatar_url, frame, avatar_bg, title)
      `)
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase.rpc('get_daily_duel_count', { p_user_id: user.id }),

    supabase
      .from('duels')
      .select('opponent_id')
      .eq('challenger_id', user.id)
      .gte('created_at', `${todayStr}T00:00:00.000Z`)
      .not('status', 'in', '(cancelled,rejected)'),
  ])

  const challengedTodayIds = (challengedTodayRaw ?? []).map(
    (d: { opponent_id: string }) => d.opponent_id
  )

  return (
    <DuelosClient
      userId={user.id}
      profile={profile}
      duels={duels ?? []}
      dailyCount={dailyCountRaw ?? 0}
      challengedTodayIds={challengedTodayIds}
    />
  )
}
