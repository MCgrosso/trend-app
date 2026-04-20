'use client'

import { useState } from 'react'
import { Trophy, Star, Medal } from 'lucide-react'
import Avatar from '@/components/Avatar'
import { getMedal } from '@/lib/medals'
import type { WeeklyProfile } from '@/lib/types'

interface GlobalProfile {
  id: string
  username: string
  first_name: string
  last_name: string
  total_score: number
  avatar_url: string | null
}

interface Props {
  globalTop10: GlobalProfile[]
  weeklyAll: WeeklyProfile[]
  userId: string | null
  userGlobalRank: number
  userGlobalProfile: GlobalProfile | null
}

function getMedalColor(rank: number) {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-gray-300'
  if (rank === 3) return 'text-orange-400'
  return 'text-gray-500'
}

function RankIcon({ rank }: { rank: number }) {
  if (rank <= 3) return <Medal size={18} className={getMedalColor(rank)} />
  return <span className={`text-sm font-bold ${getMedalColor(rank)}`}>#{rank}</span>
}

export default function RankingClient({
  globalTop10,
  weeklyAll,
  userId,
  userGlobalRank,
  userGlobalProfile,
}: Props) {
  const [tab, setTab] = useState<'global' | 'semanal'>('global')

  const weeklyTop10 = weeklyAll.slice(0, 10)
  const weeklyChampionId = weeklyAll.find(p => p.weekly_score > 0)?.id ?? null
  const userWeeklyIdx = weeklyAll.findIndex(p => p.id === userId)
  const userWeeklyRank = userWeeklyIdx >= 0 ? userWeeklyIdx + 1 : -1
  const userWeeklyProfile = userWeeklyIdx >= 0 ? weeklyAll[userWeeklyIdx] : null
  const isUserInWeeklyTop10 = weeklyTop10.some(p => p.id === userId)
  const isUserInGlobalTop10 = globalTop10.some(p => p.id === userId)

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-800/60 rounded-xl border border-gray-700/40 mb-4">
        <button
          onClick={() => setTab('global')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'global'
              ? 'bg-purple-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Global
        </button>
        <button
          onClick={() => setTab('semanal')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'semanal'
              ? 'bg-purple-600 text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Esta semana
        </button>
      </div>

      {/* ── GLOBAL ── */}
      {tab === 'global' && (
        <>
          {globalTop10.length >= 3 && (
            <Podium
              first={{ avatarUrl: globalTop10[0].avatar_url, firstName: globalTop10[0].first_name, username: globalTop10[0].username, score: globalTop10[0].total_score }}
              second={{ avatarUrl: globalTop10[1].avatar_url, firstName: globalTop10[1].first_name, username: globalTop10[1].username, score: globalTop10[1].total_score }}
              third={{ avatarUrl: globalTop10[2].avatar_url, firstName: globalTop10[2].first_name, username: globalTop10[2].username, score: globalTop10[2].total_score }}
            />
          )}

          <div className="space-y-2">
            {globalTop10.map((p, idx) => {
              const isMe = p.id === userId
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    isMe
                      ? 'bg-purple-900/40 border-purple-500/60 shadow-lg shadow-purple-900/20'
                      : 'bg-gray-800/40 border-gray-700/40'
                  }`}
                >
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <RankIcon rank={idx + 1} />
                  </div>
                  <Avatar avatarUrl={p.avatar_url} firstName={p.first_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isMe ? 'text-purple-200' : 'text-white'}`}>
                      {p.first_name} {p.last_name}
                      {isMe && <span className="text-purple-400 text-xs ml-2">(vos)</span>}
                    </p>
                    <p className="text-gray-400 text-xs">@{p.username}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star size={14} className="text-yellow-400" />
                    <span className="text-yellow-300 font-bold">{p.total_score}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {userId && !isUserInGlobalTop10 && userGlobalProfile && userGlobalRank > 0 && (
            <OutOfTopCard
              rank={userGlobalRank}
              profile={userGlobalProfile}
              score={userGlobalProfile.total_score}
              scoreLabel="pts globales"
            />
          )}
        </>
      )}

      {/* ── SEMANAL ── */}
      {tab === 'semanal' && (
        <>
          {weeklyTop10.filter(p => p.weekly_score > 0).length >= 3 && (
            <Podium
              first={{ avatarUrl: weeklyTop10[0].avatar_url, firstName: weeklyTop10[0].first_name, username: weeklyTop10[0].username, score: weeklyTop10[0].weekly_score }}
              second={{ avatarUrl: weeklyTop10[1].avatar_url, firstName: weeklyTop10[1].first_name, username: weeklyTop10[1].username, score: weeklyTop10[1].weekly_score }}
              third={{ avatarUrl: weeklyTop10[2].avatar_url, firstName: weeklyTop10[2].first_name, username: weeklyTop10[2].username, score: weeklyTop10[2].weekly_score }}
            />
          )}

          {weeklyTop10.every(p => p.weekly_score === 0) ? (
            <p className="text-center text-gray-500 text-sm py-6">Nadie jugó esta semana todavía</p>
          ) : (
            <div className="space-y-2">
              {weeklyTop10.map((p, idx) => {
                const isMe = p.id === userId
                const medal = getMedal(p.weekly_score, p.id === weeklyChampionId)
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      isMe
                        ? 'bg-purple-900/40 border-purple-500/60 shadow-lg shadow-purple-900/20'
                        : 'bg-gray-800/40 border-gray-700/40'
                    }`}
                  >
                    <div className="w-8 flex items-center justify-center flex-shrink-0">
                      <RankIcon rank={idx + 1} />
                    </div>
                    <Avatar avatarUrl={p.avatar_url} firstName={p.first_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isMe ? 'text-purple-200' : 'text-white'}`}>
                        {p.first_name} {p.last_name}
                        {isMe && <span className="text-purple-400 text-xs ml-2">(vos)</span>}
                      </p>
                      <p className="text-gray-400 text-xs">@{p.username}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {medal && (
                        <span title={medal.label} className="text-lg leading-none">{medal.icon}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-400" />
                        <span className="text-yellow-300 font-bold">{p.weekly_score}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {userId && !isUserInWeeklyTop10 && userWeeklyProfile && userWeeklyRank > 0 && (
            <OutOfTopCard
              rank={userWeeklyRank}
              profile={userWeeklyProfile}
              score={userWeeklyProfile.weekly_score}
              scoreLabel="pts esta semana"
              medal={getMedal(userWeeklyProfile.weekly_score, userWeeklyProfile.id === weeklyChampionId) ?? undefined}
            />
          )}

          {/* Leyenda de medallas */}
          <div className="mt-4 p-3 bg-gray-800/30 rounded-xl border border-gray-700/30">
            <p className="text-gray-500 text-xs mb-2 font-medium">Medallas semanales</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-400">
              <span>👑 Campeón — 1.º lugar</span>
              <span>🥇 Oro — 150+ pts</span>
              <span>🥈 Plata — 100+ pts</span>
              <span>🥉 Bronce — 50+ pts</span>
            </div>
          </div>
        </>
      )}

      {!userId && (
        <div className="text-center py-4 bg-purple-900/20 rounded-xl border border-purple-700/30">
          <p className="text-gray-400 text-sm">
            <a href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Ingresá</a> para ver tu posición
          </p>
        </div>
      )}
    </>
  )
}

function Podium({
  first, second, third,
}: {
  first: { avatarUrl: string | null; firstName: string; username: string; score: number }
  second: { avatarUrl: string | null; firstName: string; username: string; score: number }
  third: { avatarUrl: string | null; firstName: string; username: string; score: number }
}) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-6 pt-2">
      <div className="flex flex-col items-center pt-6">
        <Avatar avatarUrl={second.avatarUrl} firstName={second.firstName} size="md" className="shadow-lg" />
        <Medal size={20} className="text-gray-300 mt-1" />
        <p className="text-xs text-gray-300 font-medium mt-0.5 text-center truncate w-full px-1">{second.username}</p>
        <p className="text-xs text-yellow-400 font-bold">{second.score} pts</p>
      </div>
      <div className="flex flex-col items-center">
        <div className="ring-4 ring-yellow-400/30 rounded-full shadow-xl">
          <Avatar avatarUrl={first.avatarUrl} firstName={first.firstName} size="lg" />
        </div>
        <Trophy size={22} className="text-yellow-400 mt-1" />
        <p className="text-sm text-white font-bold mt-0.5 text-center truncate w-full px-1">{first.username}</p>
        <p className="text-sm text-yellow-400 font-bold">{first.score} pts</p>
      </div>
      <div className="flex flex-col items-center pt-8">
        <Avatar avatarUrl={third.avatarUrl} firstName={third.firstName} size="md" className="shadow-lg" />
        <Medal size={20} className="text-orange-400 mt-1" />
        <p className="text-xs text-gray-300 font-medium mt-0.5 text-center truncate w-full px-1">{third.username}</p>
        <p className="text-xs text-yellow-400 font-bold">{third.score} pts</p>
      </div>
    </div>
  )
}

function OutOfTopCard({
  rank, profile, score, scoreLabel, medal,
}: {
  rank: number
  profile: { avatar_url: string | null; first_name: string; last_name: string; username: string }
  score: number
  scoreLabel: string
  medal?: { icon: string; label: string } | null
}) {
  return (
    <div className="mt-4">
      <div className="border-t border-gray-700/50 pt-3 mb-3 text-center">
        <span className="text-gray-500 text-xs">Tu posición</span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-purple-900/40 border-purple-500/60">
        <div className="w-8 flex items-center justify-center">
          <span className="text-gray-400 text-sm font-bold">#{rank}</span>
        </div>
        <Avatar avatarUrl={profile.avatar_url} firstName={profile.first_name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-purple-200 truncate">
            {profile.first_name} {profile.last_name}
            <span className="text-purple-400 text-xs ml-2">(vos)</span>
          </p>
          <p className="text-gray-400 text-xs">@{profile.username}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {medal && <span className="text-lg leading-none">{medal.icon}</span>}
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400" />
            <span className="text-yellow-300 font-bold">{score}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
