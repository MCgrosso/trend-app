export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Swords } from 'lucide-react'
import ContrarrelojClient from './ContrarrelojClient'

export default async function ContrarrelojPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: blitzDuels },
    { data: players },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, frame, avatar_bg, pvp_rank, pvp_points, pvp_win_streak, pvp_best_streak, pvp_total_games, pvp_win_percentage, blitz_wins, blitz_best_score, dynamic_wins, dynamic_best_time')
      .eq('id', user.id)
      .single(),

    supabase
      .from('blitz_duels')
      .select(`
        *,
        challenger:profiles!blitz_duels_challenger_id_fkey(id, username, first_name, avatar_url, frame, avatar_bg, pvp_rank, pvp_points),
        opponent:profiles!blitz_duels_opponent_id_fkey(id, username, first_name, avatar_url, frame, avatar_bg, pvp_rank, pvp_points)
      `)
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url, frame, avatar_bg, pvp_rank, pvp_points, pvp_total_games, pvp_win_percentage, blitz_wins, dynamic_wins')
      .order('pvp_points', { ascending: false }),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center gap-2 flex-wrap">
        <Swords size={22} className="text-purple-400" />
        <h1 className="text-xl font-bold text-white">Duelos</h1>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-400/60 text-amber-200 px-2 py-0.5 rounded-full">
          Contrarreloj
        </span>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-4 pb-8">
        <div className="flex gap-1 p-1 bg-[#0f0a2e]/80 rounded-xl border border-purple-700/40">
          <Link
            href="/duelos"
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white text-center"
          >
            ⚔️ Clásico
          </Link>
          <button
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]"
          >
            ⚡ Contrarreloj
          </button>
        </div>

        <ContrarrelojClient
          userId={user.id}
          profile={profile}
          blitzDuels={blitzDuels ?? []}
          players={players ?? []}
        />
      </div>
    </div>
  )
}
