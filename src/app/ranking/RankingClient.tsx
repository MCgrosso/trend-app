'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Star, Medal, Users, Zap, Hourglass, Timer } from 'lucide-react'
import Avatar from '@/components/Avatar'
import ClanShield from '@/components/ClanShield'
import ChurchBadge from '@/components/ChurchBadge'
import PvpRankBadge from '@/components/PvpRankBadge'
import { getMedal } from '@/lib/medals'
import type { WeeklyProfile, ChurchRankingRow } from '@/lib/types'

interface GlobalProfile {
  id: string
  username: string
  first_name: string
  last_name: string
  total_score: number
  avatar_url: string | null
  frame: string | null
  avatar_bg: string | null
  clan_id?: string | null
  church_id?: string | null
  level?: number | null
}

interface ClanLookup { id: string; name: string; shield_color: string | null; shield_bg: string | null; shield_icon: string | null }
interface ChurchLookup { id: string; name: string; abbreviation: string | null; icon_emoji: string | null }

interface PvpRow {
  id: string; username: string; first_name: string; last_name: string
  avatar_url: string | null; frame: string | null; avatar_bg: string | null
  pvp_rank: string | null; pvp_points: number | null
  pvp_total_games: number | null; pvp_win_percentage: number | null
  pvp_win_streak: number | null; pvp_best_streak: number | null
  blitz_wins: number | null; dynamic_wins: number | null
}

interface BlitzRow {
  id: string; username: string; first_name: string; last_name: string
  avatar_url: string | null; frame: string | null; avatar_bg: string | null
  pvp_rank: string | null
  blitz_wins: number | null; blitz_best_score: number | null
}

interface DynamicRow {
  id: string; username: string; first_name: string; last_name: string
  avatar_url: string | null; frame: string | null; avatar_bg: string | null
  pvp_rank: string | null
  dynamic_wins: number | null; dynamic_best_time: number | null
}

interface Props {
  globalTop10: GlobalProfile[]
  weeklyAll: WeeklyProfile[]
  churchRanking: ChurchRankingRow[]
  pvpTop: PvpRow[]
  blitzTop: BlitzRow[]
  dynamicTop: DynamicRow[]
  clansLookup: ClanLookup[]
  churchesLookup: ChurchLookup[]
  userId: string | null
  userGlobalRank: number
  userGlobalProfile: GlobalProfile | null
}

type RankingTab = 'global' | 'semanal' | 'iglesias' | 'pvp' | 'blitz' | 'dinamico'

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
  churchRanking,
  pvpTop,
  blitzTop,
  dynamicTop,
  clansLookup,
  churchesLookup,
  userId,
  userGlobalRank,
  userGlobalProfile,
}: Props) {
  const [tab, setTab] = useState<RankingTab>('global')

  const clanById   = new Map(clansLookup.map(c => [c.id, c]))
  const churchById = new Map(churchesLookup.map(c => [c.id, c]))

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
      <div className="flex flex-wrap gap-1 p-1 bg-[#0f0a2e]/80 rounded-xl border border-purple-700/40 mb-4">
        <TabBtn active={tab === 'global'} onClick={() => setTab('global')} variant="purple">Global</TabBtn>
        <TabBtn active={tab === 'semanal'} onClick={() => setTab('semanal')} variant="purple">Semana</TabBtn>
        <TabBtn active={tab === 'iglesias'} onClick={() => setTab('iglesias')} variant="emerald">Iglesias</TabBtn>
        <TabBtn active={tab === 'pvp'} onClick={() => setTab('pvp')} variant="amber">PVP</TabBtn>
        <TabBtn active={tab === 'blitz'} onClick={() => setTab('blitz')} variant="orange">Blitz</TabBtn>
        <TabBtn active={tab === 'dinamico'} onClick={() => setTab('dinamico')} variant="cyan">Dinámico</TabBtn>
      </div>

      {/* ── GLOBAL ── */}
      {tab === 'global' && (
        <>
          {globalTop10.length >= 3 && (
            <Podium
              first={{ avatarUrl: globalTop10[0].avatar_url, frame: globalTop10[0].frame, bg: globalTop10[0].avatar_bg, firstName: globalTop10[0].first_name, username: globalTop10[0].username, score: globalTop10[0].total_score }}
              second={{ avatarUrl: globalTop10[1].avatar_url, frame: globalTop10[1].frame, bg: globalTop10[1].avatar_bg, firstName: globalTop10[1].first_name, username: globalTop10[1].username, score: globalTop10[1].total_score }}
              third={{ avatarUrl: globalTop10[2].avatar_url, frame: globalTop10[2].frame, bg: globalTop10[2].avatar_bg, firstName: globalTop10[2].first_name, username: globalTop10[2].username, score: globalTop10[2].total_score }}
            />
          )}

          <div className="space-y-2">
            {globalTop10.map((p, idx) => {
              const isMe = p.id === userId
              const clan   = p.clan_id   ? clanById.get(p.clan_id)     : null
              const church = p.church_id ? churchById.get(p.church_id) : null
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${
                    isMe
                      ? 'bg-gradient-to-r from-purple-900/60 to-[#1a0a4e] border-purple-400/70 shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                      : 'bg-[#0f0a2e]/70 border-purple-800/30'
                  }`}
                >
                  <div className="w-8 flex items-center justify-center flex-shrink-0">
                    <RankIcon rank={idx + 1} />
                  </div>
                  <Link href={`/perfil/${p.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                    <Avatar avatarUrl={p.avatar_url} firstName={p.first_name} size="sm" frame={p.frame} bg={p.avatar_bg} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`font-semibold truncate group-hover:text-cyan-300 transition-colors ${isMe ? 'text-purple-200' : 'text-white'}`}>
                          {p.first_name} {p.last_name}
                          {isMe && <span className="text-purple-400 text-xs ml-2">(vos)</span>}
                        </p>
                        {p.level && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 px-1.5 py-0.5 rounded-full">
                            Lv {p.level}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-gray-400 text-xs group-hover:text-cyan-400/80 transition-colors">@{p.username}</span>
                        {church && (
                          <ChurchBadge
                            icon_emoji={church.icon_emoji}
                            name={church.name}
                            abbreviation={church.abbreviation}
                            size="xs"
                            highlight={church.abbreviation === 'MVDA'}
                          />
                        )}
                      </div>
                    </div>
                  </Link>
                  {clan && (
                    <span title={clan.name} className="flex-shrink-0">
                      <ClanShield
                        shield_bg={clan.shield_bg}
                        shield_color={clan.shield_color}
                        shield_icon={clan.shield_icon}
                        size="xs"
                        glow={false}
                      />
                    </span>
                  )}
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
              first={{ avatarUrl: weeklyTop10[0].avatar_url, frame: weeklyTop10[0].frame, bg: weeklyTop10[0].avatar_bg, firstName: weeklyTop10[0].first_name, username: weeklyTop10[0].username, score: weeklyTop10[0].weekly_score }}
              second={{ avatarUrl: weeklyTop10[1].avatar_url, frame: weeklyTop10[1].frame, bg: weeklyTop10[1].avatar_bg, firstName: weeklyTop10[1].first_name, username: weeklyTop10[1].username, score: weeklyTop10[1].weekly_score }}
              third={{ avatarUrl: weeklyTop10[2].avatar_url, frame: weeklyTop10[2].frame, bg: weeklyTop10[2].avatar_bg, firstName: weeklyTop10[2].first_name, username: weeklyTop10[2].username, score: weeklyTop10[2].weekly_score }}
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
                    <Avatar avatarUrl={p.avatar_url} firstName={p.first_name} size="sm" frame={p.frame} bg={p.avatar_bg} />
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

      {/* ── IGLESIAS ── */}
      {tab === 'iglesias' && (
        <>
          {churchRanking.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aún no hay iglesias registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {churchRanking.map((c, idx) => {
                const isMVDA = c.abbreviation === 'MVDA'
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${
                      isMVDA
                        ? 'bg-gradient-to-r from-amber-900/30 to-yellow-900/20 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                        : 'bg-[#0f0a2e]/70 border-purple-800/30'
                    }`}
                  >
                    <div className="w-8 flex items-center justify-center flex-shrink-0">
                      <RankIcon rank={idx + 1} />
                    </div>
                    <span className="text-3xl flex-shrink-0">{c.icon_emoji ?? '⛪'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isMVDA ? 'text-amber-200' : 'text-white'}`}>
                        {c.name}
                        {c.abbreviation && <span className="text-gray-400 text-xs ml-2">({c.abbreviation})</span>}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {c.member_count} {c.member_count === 1 ? 'miembro' : 'miembros'}
                        {isMVDA && <span className="text-amber-400 ml-2">🦅 Casa Águila</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star size={14} className="text-yellow-400" />
                      <span className="text-yellow-300 font-bold">{c.total_score}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── PVP ── */}
      {tab === 'pvp' && (
        <PvpTab rows={pvpTop} userId={userId} />
      )}

      {/* ── BLITZ ── */}
      {tab === 'blitz' && (
        <BlitzTab rows={blitzTop} userId={userId} />
      )}

      {/* ── DINÁMICO ── */}
      {tab === 'dinamico' && (
        <DynamicTab rows={dynamicTop} userId={userId} />
      )}

      {!userId && tab !== 'iglesias' && (
        <div className="text-center py-4 bg-purple-900/20 rounded-xl border border-purple-700/30">
          <p className="text-gray-400 text-sm">
            <a href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Ingresá</a> para ver tu posición
          </p>
        </div>
      )}
    </>
  )
}

function TabBtn({
  active, onClick, variant, children,
}: {
  active: boolean; onClick: () => void
  variant: 'purple' | 'emerald' | 'amber' | 'orange' | 'cyan'
  children: React.ReactNode
}) {
  const activeStyle = {
    purple:  'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-[0_0_14px_rgba(124,58,237,0.5)]',
    emerald: 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.5)]',
    amber:   'bg-gradient-to-r from-amber-600 to-yellow-500 text-stone-900 shadow-[0_0_14px_rgba(245,158,11,0.5)]',
    orange:  'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-[0_0_14px_rgba(249,115,22,0.5)]',
    cyan:    'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_14px_rgba(34,211,238,0.5)]',
  }[variant]
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[60px] py-2 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
        active ? activeStyle : 'text-gray-500 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function PvpTab({ rows, userId }: { rows: PvpRow[]; userId: string | null }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap size={32} className="text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Aún nadie jugó duelos contrarreloj</p>
        <p className="text-gray-500 text-xs mt-1">Sé el primero en <Link href="/duelos/contrarreloj" className="text-purple-400 underline">/duelos/contrarreloj</Link></p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {rows.map((p, i) => {
        const isMe = p.id === userId
        const top = i < 3
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${
              isMe
                ? 'bg-gradient-to-r from-purple-900/60 to-[#1a0a4e] border-purple-400/70 shadow-[0_0_18px_rgba(124,58,237,0.4)]'
                : top
                  ? 'bg-gradient-to-r from-amber-900/30 to-[#0f0a2e] border-amber-500/50'
                  : 'bg-[#0f0a2e]/70 border-purple-800/30'
            }`}
          >
            <div className="w-7 flex items-center justify-center flex-shrink-0">
              {top ? <span className="text-lg">{['🥇','🥈','🥉'][i]}</span> : <span className="text-gray-400 text-xs font-bold">#{i+1}</span>}
            </div>
            <Link href={`/perfil/${p.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
              <Avatar avatarUrl={p.avatar_url} firstName={p.first_name} size="sm" frame={p.frame} bg={p.avatar_bg} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`font-semibold truncate ${isMe ? 'text-purple-200' : 'text-white'} group-hover:text-cyan-300`}>
                    {p.first_name} {p.last_name}
                    {isMe && <span className="text-purple-400 text-xs ml-2">(vos)</span>}
                  </p>
                  <PvpRankBadge rank={p.pvp_rank} size="xs" />
                </div>
                <p className="text-gray-400 text-xs">
                  @{p.username} · {(p.blitz_wins ?? 0) + (p.dynamic_wins ?? 0)}V · {p.pvp_win_percentage ?? 0}% wr
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={14} className="text-amber-400" />
              <span className="text-amber-300 font-bold">{p.pvp_points ?? 0}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BlitzTab({ rows, userId }: { rows: BlitzRow[]; userId: string | null }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <Timer size={32} className="text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Aún nadie ganó duelos Blitz</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {rows.map((p, i) => {
        const isMe = p.id === userId
        const top = i < 3
        return (
          <div key={p.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${
              isMe
                ? 'bg-gradient-to-r from-purple-900/60 to-[#1a0a4e] border-purple-400/70'
                : top
                  ? 'bg-gradient-to-r from-orange-900/30 to-[#0f0a2e] border-orange-500/50'
                  : 'bg-[#0f0a2e]/70 border-purple-800/30'
            }`}
          >
            <div className="w-7 flex items-center justify-center">
              {top ? <span className="text-lg">{['🥇','🥈','🥉'][i]}</span> : <span className="text-gray-400 text-xs font-bold">#{i+1}</span>}
            </div>
            <Link href={`/perfil/${p.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
              <Avatar avatarUrl={p.avatar_url} firstName={p.first_name} size="sm" frame={p.frame} bg={p.avatar_bg} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`font-semibold truncate ${isMe ? 'text-purple-200' : 'text-white'} group-hover:text-cyan-300`}>
                    {p.first_name} {p.last_name}{isMe && <span className="text-purple-400 text-xs ml-2">(vos)</span>}
                  </p>
                  <PvpRankBadge rank={p.pvp_rank} size="xs" />
                </div>
                <p className="text-gray-400 text-xs">@{p.username} · {p.blitz_wins ?? 0}V</p>
              </div>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Timer size={14} className="text-orange-300" />
              <span className="text-orange-200 font-bold">{p.blitz_best_score ?? 0}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DynamicTab({ rows, userId }: { rows: DynamicRow[]; userId: string | null }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <Hourglass size={32} className="text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Aún nadie ganó duelos Dinámicos</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {rows.map((p, i) => {
        const isMe = p.id === userId
        const top = i < 3
        return (
          <div key={p.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${
              isMe
                ? 'bg-gradient-to-r from-purple-900/60 to-[#1a0a4e] border-purple-400/70'
                : top
                  ? 'bg-gradient-to-r from-cyan-900/30 to-[#0f0a2e] border-cyan-500/50'
                  : 'bg-[#0f0a2e]/70 border-purple-800/30'
            }`}
          >
            <div className="w-7 flex items-center justify-center">
              {top ? <span className="text-lg">{['🥇','🥈','🥉'][i]}</span> : <span className="text-gray-400 text-xs font-bold">#{i+1}</span>}
            </div>
            <Link href={`/perfil/${p.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
              <Avatar avatarUrl={p.avatar_url} firstName={p.first_name} size="sm" frame={p.frame} bg={p.avatar_bg} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`font-semibold truncate ${isMe ? 'text-purple-200' : 'text-white'} group-hover:text-cyan-300`}>
                    {p.first_name} {p.last_name}{isMe && <span className="text-purple-400 text-xs ml-2">(vos)</span>}
                  </p>
                  <PvpRankBadge rank={p.pvp_rank} size="xs" />
                </div>
                <p className="text-gray-400 text-xs">@{p.username} · {p.dynamic_wins ?? 0}V</p>
              </div>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Hourglass size={14} className="text-cyan-300" />
              <span className="text-cyan-200 font-bold">{p.dynamic_best_time ?? 0}s</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Podium({
  first, second, third,
}: {
  first:  { avatarUrl: string | null; frame: string | null; bg: string | null; firstName: string; username: string; score: number }
  second: { avatarUrl: string | null; frame: string | null; bg: string | null; firstName: string; username: string; score: number }
  third:  { avatarUrl: string | null; frame: string | null; bg: string | null; firstName: string; username: string; score: number }
}) {
  return (
    <div className="relative mb-6 pt-4">
      <div className="absolute inset-x-0 -top-4 h-32 bg-gradient-radial from-amber-500/15 to-transparent blur-2xl pointer-events-none" />

      <div className="relative grid grid-cols-3 gap-2 items-end">
        {/* 2nd */}
        <Link href={`/perfil/${second.username}`} className="animate-podium-2 flex flex-col items-center group">
          <Avatar avatarUrl={second.avatarUrl} firstName={second.firstName} size="md" frame={second.frame} bg={second.bg} />
          <p className="text-xs text-gray-200 font-bold mt-1 text-center truncate w-full px-1 group-hover:text-cyan-300 transition-colors">{second.username}</p>
          <p className="text-xs text-amber-300 font-bold">{second.score} pts</p>
          <div className="mt-2 w-full h-16 rounded-t-xl bg-gradient-to-b from-gray-300 via-gray-400 to-gray-600 flex flex-col items-center justify-center border-2 border-gray-300/50 shadow-[0_0_18px_rgba(229,231,235,0.4)]">
            <Medal size={20} className="text-white drop-shadow" />
            <span className="font-bebas text-2xl text-white leading-none">2</span>
          </div>
        </Link>

        {/* 1st */}
        <Link href={`/perfil/${first.username}`} className="animate-podium-1 flex flex-col items-center group">
          <div className="relative">
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl animate-spark">👑</span>
            <div className="rounded-full ring-4 ring-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.6)]">
              <Avatar avatarUrl={first.avatarUrl} firstName={first.firstName} size="lg" frame={first.frame} bg={first.bg} />
            </div>
          </div>
          <p className="text-sm font-bold mt-1 text-center truncate w-full px-1 animate-shimmer font-bebas text-base">{first.username}</p>
          <p className="text-sm text-amber-300 font-bold">{first.score} pts</p>
          <div className="mt-2 w-full h-24 rounded-t-xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 flex flex-col items-center justify-center border-2 border-amber-300/70 shadow-[0_0_28px_rgba(245,158,11,0.6)]">
            <Trophy size={26} className="text-white drop-shadow" />
            <span className="font-bebas text-3xl text-white leading-none">1</span>
          </div>
        </Link>

        {/* 3rd */}
        <Link href={`/perfil/${third.username}`} className="animate-podium-3 flex flex-col items-center group">
          <Avatar avatarUrl={third.avatarUrl} firstName={third.firstName} size="md" frame={third.frame} bg={third.bg} />
          <p className="text-xs text-gray-200 font-bold mt-1 text-center truncate w-full px-1 group-hover:text-cyan-300 transition-colors">{third.username}</p>
          <p className="text-xs text-amber-300 font-bold">{third.score} pts</p>
          <div className="mt-2 w-full h-12 rounded-t-xl bg-gradient-to-b from-orange-400 via-orange-600 to-orange-800 flex flex-col items-center justify-center border-2 border-orange-400/50 shadow-[0_0_18px_rgba(249,115,22,0.4)]">
            <Medal size={18} className="text-white drop-shadow" />
            <span className="font-bebas text-xl text-white leading-none">3</span>
          </div>
        </Link>
      </div>
    </div>
  )
}

function OutOfTopCard({
  rank, profile, score, scoreLabel, medal,
}: {
  rank: number
  profile: { avatar_url: string | null; frame?: string | null; avatar_bg?: string | null; first_name: string; last_name: string; username: string }
  score: number
  scoreLabel: string
  medal?: { icon: string; label: string } | null
}) {
  return (
    <div className="mt-4">
      <div className="border-t border-gray-700/50 pt-3 mb-3 text-center">
        <span className="text-gray-500 text-xs">Tu posición</span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 bg-gradient-to-r from-purple-900/60 to-[#1a0a4e] border-purple-400/70 shadow-[0_0_20px_rgba(124,58,237,0.4)]">
        <div className="w-8 flex items-center justify-center">
          <span className="text-gray-400 text-sm font-bold">#{rank}</span>
        </div>
        <Link href={`/perfil/${profile.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <Avatar avatarUrl={profile.avatar_url} firstName={profile.first_name} size="sm" frame={profile.frame} bg={profile.avatar_bg} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-purple-200 truncate group-hover:text-cyan-300 transition-colors">
              {profile.first_name} {profile.last_name}
              <span className="text-purple-400 text-xs ml-2">(vos)</span>
            </p>
            <p className="text-gray-400 text-xs group-hover:text-cyan-400/80 transition-colors">@{profile.username}</p>
          </div>
        </Link>
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
