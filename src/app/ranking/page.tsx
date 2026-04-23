export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/Logo'
import Stars from '@/components/Stars'
import { Trophy } from 'lucide-react'
import RankingClient from './RankingClient'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: globalTop10 } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, total_score, avatar_url, frame, avatar_bg')
    .order('total_score', { ascending: false })
    .limit(10)

  const { data: weeklyAll } = await supabase.rpc('get_weekly_ranking')

  let userGlobalRank = -1
  let userGlobalProfile = null

  if (user) {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, total_score, avatar_url, frame, avatar_bg')
      .order('total_score', { ascending: false })

    userGlobalRank = (allProfiles?.findIndex(p => p.id === user.id) ?? -1) + 1
    userGlobalProfile = allProfiles?.find(p => p.id === user.id) ?? null
  }

  return (
    <div className="min-h-screen relative">
      <Stars count={70} />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-4 max-w-lg mx-auto">
          <Logo size="sm" />
          <div className="flex items-center gap-2 mt-4">
            <Trophy size={26} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <h1 className="font-bebas text-4xl text-white leading-none">RANKING</h1>
          </div>
          <p className="text-purple-300/70 text-xs uppercase tracking-widest font-semibold mt-1">Top jugadores del grupo</p>
        </header>

        <div className="px-4 max-w-lg mx-auto pb-8 space-y-3">
          <RankingClient
            globalTop10={globalTop10 ?? []}
            weeklyAll={weeklyAll ?? []}
            userId={user?.id ?? null}
            userGlobalRank={userGlobalRank}
            userGlobalProfile={userGlobalProfile}
          />
        </div>
      </div>
    </div>
  )
}
