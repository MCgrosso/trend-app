export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/Logo'
import { Trophy } from 'lucide-react'
import RankingClient from './RankingClient'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: globalTop10 } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, total_score, avatar_url, frame')
    .order('total_score', { ascending: false })
    .limit(10)

  const { data: weeklyAll } = await supabase.rpc('get_weekly_ranking')

  let userGlobalRank = -1
  let userGlobalProfile = null

  if (user) {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, total_score, avatar_url, frame')
      .order('total_score', { ascending: false })

    userGlobalRank = (allProfiles?.findIndex(p => p.id === user.id) ?? -1) + 1
    userGlobalProfile = allProfiles?.find(p => p.id === user.id) ?? null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Logo size="sm" />
        <div className="flex items-center gap-2 mt-4">
          <Trophy size={24} className="text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">Tabla de posiciones</h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">Top jugadores del grupo</p>
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
  )
}
