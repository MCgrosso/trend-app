export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/Logo'
import Avatar from '@/components/Avatar'
import { Trophy, Star, Medal } from 'lucide-react'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: top } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, total_score, streak_days, avatar_url')
    .order('total_score', { ascending: false })
    .limit(10)

  let userRank = -1
  let userProfile = null

  if (user) {
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, total_score, avatar_url')
      .order('total_score', { ascending: false })

    userRank = (allProfiles?.findIndex(p => p.id === user.id) ?? -1) + 1
    userProfile = allProfiles?.find(p => p.id === user.id)
  }

  const isUserInTop10 = top?.some(p => p.id === user?.id)

  function getMedalColor(rank: number) {
    if (rank === 1) return 'text-yellow-400'
    if (rank === 2) return 'text-gray-300'
    if (rank === 3) return 'text-orange-400'
    return 'text-gray-500'
  }

  function getRankIcon(rank: number) {
    if (rank <= 3) return <Medal size={18} className={getMedalColor(rank)} />
    return <span className={`text-sm font-bold ${getMedalColor(rank)}`}>#{rank}</span>
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
        {/* Podio top 3 */}
        {top && top.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 mb-6 pt-2">
            {/* 2do lugar */}
            <div className="flex flex-col items-center pt-6">
              <Avatar avatarUrl={top[1].avatar_url} firstName={top[1].first_name} size="md" className="shadow-lg" />
              <Medal size={20} className="text-gray-300 mt-1" />
              <p className="text-xs text-gray-300 font-medium mt-0.5 text-center truncate w-full px-1">{top[1].username}</p>
              <p className="text-xs text-yellow-400 font-bold">{top[1].total_score} pts</p>
            </div>
            {/* 1er lugar */}
            <div className="flex flex-col items-center">
              <div className="ring-4 ring-yellow-400/30 rounded-full shadow-xl">
                <Avatar avatarUrl={top[0].avatar_url} firstName={top[0].first_name} size="lg" />
              </div>
              <Trophy size={22} className="text-yellow-400 mt-1" />
              <p className="text-sm text-white font-bold mt-0.5 text-center truncate w-full px-1">{top[0].username}</p>
              <p className="text-sm text-yellow-400 font-bold">{top[0].total_score} pts</p>
            </div>
            {/* 3er lugar */}
            <div className="flex flex-col items-center pt-8">
              <Avatar avatarUrl={top[2].avatar_url} firstName={top[2].first_name} size="md" className="shadow-lg" />
              <Medal size={20} className="text-orange-400 mt-1" />
              <p className="text-xs text-gray-300 font-medium mt-0.5 text-center truncate w-full px-1">{top[2].username}</p>
              <p className="text-xs text-yellow-400 font-bold">{top[2].total_score} pts</p>
            </div>
          </div>
        )}

        {/* Lista completa top 10 */}
        <div className="space-y-2">
          {top?.map((profile, idx) => {
            const rank = idx + 1
            const isMe = profile.id === user?.id
            return (
              <div
                key={profile.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-purple-900/40 border-purple-500/60 shadow-lg shadow-purple-900/20'
                    : 'bg-gray-800/40 border-gray-700/40'
                }`}
              >
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(rank)}
                </div>
                <Avatar avatarUrl={profile.avatar_url} firstName={profile.first_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isMe ? 'text-purple-200' : 'text-white'}`}>
                    {profile.first_name} {profile.last_name}
                    {isMe && <span className="text-purple-400 text-xs ml-2">(vos)</span>}
                  </p>
                  <p className="text-gray-400 text-xs">@{profile.username}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star size={14} className="text-yellow-400" />
                  <span className="text-yellow-300 font-bold">{profile.total_score}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Posición del usuario si no está en top 10 */}
        {user && !isUserInTop10 && userProfile && userRank > 0 && (
          <div className="mt-4">
            <div className="border-t border-gray-700/50 pt-3 mb-3 text-center">
              <span className="text-gray-500 text-xs">Tu posición</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-purple-900/40 border-purple-500/60">
              <div className="w-8 flex items-center justify-center">
                <span className="text-gray-400 text-sm font-bold">#{userRank}</span>
              </div>
              <Avatar avatarUrl={userProfile.avatar_url} firstName={userProfile.first_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-purple-200 truncate">
                  {userProfile.first_name} {userProfile.last_name}
                  <span className="text-purple-400 text-xs ml-2">(vos)</span>
                </p>
                <p className="text-gray-400 text-xs">@{userProfile.username}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400" />
                <span className="text-yellow-300 font-bold">{userProfile.total_score}</span>
              </div>
            </div>
          </div>
        )}

        {!user && (
          <div className="text-center py-4 bg-purple-900/20 rounded-xl border border-purple-700/30">
            <p className="text-gray-400 text-sm">
              <a href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Ingresá</a> para ver tu posición
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
