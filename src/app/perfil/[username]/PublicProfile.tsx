'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Stars from '@/components/Stars'
import Logo from '@/components/Logo'
import Avatar from '@/components/Avatar'
import { getTitle } from '@/lib/titles'
import { getMedal } from '@/lib/medals'
import { ChevronLeft, Star, Flame, Swords, Trophy, Calendar, Scroll, MessageCircle } from 'lucide-react'

interface ProfileRow {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  frame: string | null
  title: string | null
  bio: string | null
  total_score: number
  streak_days: number
  wins: number
  losses: number
  draws: number
  win_streak: number
  best_streak: number
  created_at: string
}

interface ChapterRow {
  id: string
  book: string
  chapter: number
  title: string
  character_emoji: string
}

export default function PublicProfile({
  profile, isMe, isLoggedIn, weeklyScore, isWeeklyChampion, completedChapters, globalRank,
}: {
  profile: ProfileRow
  isMe: boolean
  isLoggedIn: boolean
  weeklyScore: number
  isWeeklyChampion: boolean
  completedChapters: ChapterRow[]
  globalRank: number
}) {
  const router = useRouter()
  const title = getTitle(profile.title)
  const medal = getMedal(weeklyScore, isWeeklyChampion)
  const wlTotal = profile.wins + profile.losses
  const wr = wlTotal > 0 ? Math.round((profile.wins / wlTotal) * 100) : null

  return (
    <div className="min-h-screen relative">
      <Stars count={70} />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-4 flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => router.back()}
            className="flex items-center gap-1 text-purple-300/70 hover:text-purple-200 text-sm transition-colors">
            <ChevronLeft size={18} /> Volver
          </button>
          <Logo size="sm" />
        </header>

        <div className="px-4 max-w-lg mx-auto space-y-4 pb-8">

          {/* ── Hero card ── */}
          <div className="relative bg-gradient-to-br from-[#1a0a4e] via-[#0f0a2e] to-[#1a0a4e] rounded-3xl p-6 border border-purple-500/40 text-center overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex justify-center mb-3">
                <div className="animate-float">
                  <Avatar
                    avatarUrl={profile.avatar_url}
                    firstName={profile.first_name}
                    size="lg"
                    frame={profile.frame ?? 'white'}
                  />
                </div>
              </div>

              <h1 className="font-bebas text-3xl text-white leading-none">
                {profile.first_name?.toUpperCase()} {profile.last_name?.toUpperCase()}
              </h1>
              <p className="text-cyan-300 text-sm mt-1">@{profile.username}</p>

              {/* Title badge */}
              <div className="flex justify-center mt-3">
                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 text-sm font-bold ${title.bgColor} ${title.borderColor}`}>
                  <span className="text-base">⚔️</span>
                  <span className={title.specialClass ? title.specialClass : title.color}>{title.label}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${title.rarityColor}`}>({title.rarity})</span>
                </span>
              </div>

              {/* Bio */}
              {profile.bio && profile.bio.trim() !== '' && (
                <div className="mt-4 mx-auto max-w-md">
                  <div className="flex items-start gap-2 bg-purple-950/40 border border-purple-700/40 rounded-2xl px-4 py-3 text-left">
                    <MessageCircle size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-purple-100 text-sm leading-relaxed italic">{profile.bio}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-5 flex gap-2 justify-center">
                {isMe ? (
                  <Link href="/profile" className="px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold text-sm rounded-full hover:brightness-110 transition-all">
                    Editar mi perfil
                  </Link>
                ) : isLoggedIn ? (
                  <Link
                    href={`/duelos?challenge=${profile.id}`}
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-sm rounded-full hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    <Swords size={14} /> Retar
                  </Link>
                ) : (
                  <Link href="/login" className="px-5 py-2 bg-purple-700/40 border border-purple-500/40 text-purple-200 font-bold text-sm rounded-full hover:bg-purple-700/60 transition-all">
                    Ingresar para retar
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Star size={20} />}     value={profile.total_score} label="Puntaje total"   color="amber"   />
            <StatCard icon={<Flame size={20} />}    value={profile.streak_days} label="Días seguidos"   color="orange"  />
            <StatCard icon={<Trophy size={20} />}   value={`#${globalRank > 0 ? globalRank : '—'}`} label="Posición global" color="cyan"  />
            <StatCard icon={<Calendar size={20} />} value={weeklyScore} label="Pts esta semana" color="purple" />
          </div>

          {/* ── Medalla semanal ── */}
          {medal && (
            <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 ${medal.bgColor} ${medal.borderColor}`}>
              <span className="text-4xl">{medal.icon}</span>
              <div>
                <p className={`font-bebas text-xl leading-none ${medal.textColor}`}>{medal.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{weeklyScore} pts esta semana</p>
              </div>
            </div>
          )}

          {/* ── Duel stats ── */}
          <div className="bg-[#0f0a2e]/80 border border-purple-700/40 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Swords size={16} className="text-purple-400" />
              <h3 className="font-bebas text-2xl text-white leading-none">DUELOS PVP</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="font-bebas text-3xl text-emerald-400 leading-none">{profile.wins}</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Victorias</p>
              </div>
              <div className="text-center">
                <p className="font-bebas text-3xl text-red-400 leading-none">{profile.losses}</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Derrotas</p>
              </div>
              <div className="text-center">
                <p className="font-bebas text-3xl text-yellow-400 leading-none">{profile.draws}</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Empates</p>
              </div>
            </div>
            <div className="flex justify-between text-sm border-t border-purple-800/40 pt-3">
              <div>
                <span className="text-gray-400">Racha actual </span>
                <span className={`font-bold ${profile.win_streak > 0 ? 'text-orange-400' : 'text-gray-500'}`}>{profile.win_streak}🔥</span>
              </div>
              <div>
                <span className="text-gray-400">Mejor racha </span>
                <span className="font-bold text-purple-400">{profile.best_streak}⚡</span>
              </div>
              {wr !== null && (
                <div>
                  <span className="text-gray-400">Winrate </span>
                  <span className="font-bold text-cyan-400">{wr}%</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Mi viaje bíblico ── */}
          <div className="relative bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border border-yellow-700/40 rounded-2xl p-5 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-yellow-500/10 blur-2xl rounded-full pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Scroll size={16} className="text-yellow-400" />
                <h3 className="font-bebas text-2xl text-yellow-100 leading-none">VIAJE BÍBLICO</h3>
              </div>
              <p className="text-yellow-200/70 text-xs mb-4">{completedChapters.length} capítulos completados</p>

              {completedChapters.length === 0 ? (
                <p className="text-yellow-200/60 text-xs text-center py-4">Sin capítulos completados aún</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {completedChapters.map(c => (
                    <div
                      key={c.id}
                      title={`${c.book} ${c.chapter} — ${c.title}`}
                      className="flex items-center gap-1.5 bg-yellow-900/30 border border-yellow-600/40 rounded-full pl-1 pr-3 py-1"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 border border-yellow-400/60 flex items-center justify-center text-xs">
                        {c.character_emoji}
                      </div>
                      <span className="text-yellow-100 text-xs font-semibold">{c.book} {c.chapter}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Member since ── */}
          <div className="text-center text-gray-500 text-xs pt-2">
            Miembro desde {new Date(profile.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color }: {
  icon: React.ReactNode; value: number | string; label: string
  color: 'amber' | 'orange' | 'cyan' | 'purple'
}) {
  const styles = {
    amber:  { bg: 'bg-amber-900/30 border-amber-700/40',     text: 'text-amber-300',  ic: 'text-amber-400'  },
    orange: { bg: 'bg-orange-900/30 border-orange-700/40',   text: 'text-orange-300', ic: 'text-orange-400' },
    cyan:   { bg: 'bg-cyan-900/30 border-cyan-700/40',       text: 'text-cyan-300',   ic: 'text-cyan-400'   },
    purple: { bg: 'bg-purple-900/30 border-purple-700/40',   text: 'text-purple-200', ic: 'text-purple-400' },
  }[color]
  return (
    <div className={`${styles.bg} border-2 rounded-2xl p-4 text-center`}>
      <span className={styles.ic}>{icon}</span>
      <p className={`font-bebas text-3xl mt-1 leading-none ${styles.text}`}>{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}
