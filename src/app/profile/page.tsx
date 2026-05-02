export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'
import AvatarSection from './AvatarSection'
import BioEditor from './BioEditor'
import ChurchSection from './ChurchSection'
import { SPECIAL_AVATARS } from '@/lib/avatars'
import { Star, Flame, Calendar, Shield, Swords, Trophy, Scroll, BookOpen } from 'lucide-react'
import Logo from '@/components/Logo'
import Stars from '@/components/Stars'
import Avatar from '@/components/Avatar'
import ClanShield from '@/components/ClanShield'
import ChurchBadge from '@/components/ChurchBadge'
import Link from 'next/link'
import { getMedal } from '@/lib/medals'
import { getTitle, getNextTitle, TITLES } from '@/lib/titles'
import { computeUnlockedBgs } from '@/lib/avatarBackgrounds'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: answers } = await supabase
    .from('answers')
    .select('is_correct, answered_at')
    .eq('user_id', user.id)
    .order('answered_at', { ascending: false })

  const totalAnswers = answers?.length ?? 0
  const correctAnswers = answers?.filter(a => a.is_correct).length ?? 0
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

  // Puntaje semanal (lunes-domingo UTC)
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday)
  weekStart.setUTCHours(0, 0, 0, 0)

  const weeklyCorrect = answers?.filter(
    a => a.is_correct && new Date(a.answered_at) >= weekStart
  ).length ?? 0
  const weeklyScore = weeklyCorrect * 10

  // ¿Es campeón semanal?
  const { data: weeklyAll } = await supabase.rpc('get_weekly_ranking')
  const isWeeklyChampion = (weeklyAll?.[0]?.id === user.id) && weeklyScore > 0
  const medal = getMedal(weeklyScore, isWeeklyChampion)

  // Ranking global
  const { data: ranking } = await supabase
    .from('profiles')
    .select('id, total_score')
    .order('total_score', { ascending: false })

  const userRank = (ranking?.findIndex(p => p.id === user.id) ?? -1) + 1

  // Avatares especiales desbloqueados
  const unlockedSpecial: string[] = []
  if (correctAnswers >= 20) unlockedSpecial.push('guerrero')
  if ((profile?.streak_days ?? 0) >= 5) unlockedSpecial.push('profeta')
  if ((profile?.total_score ?? 0) >= 200) unlockedSpecial.push('apostol')
  if ((profile?.win_streak ?? 0) >= 3 || (profile?.best_streak ?? 0) >= 3) unlockedSpecial.push('campeon')

  // Marcos desbloqueados (básicos siempre disponibles)
  const unlockedFrames = ['white', 'blue', 'emerald', 'red', 'orange', 'purple', 'pink']
  if ((profile?.streak_days ?? 0) >= 3)   unlockedFrames.push('flames')
  if ((profile?.total_score  ?? 0) >= 100) unlockedFrames.push('galaxia')
  if ((profile?.streak_days ?? 0) >= 5)   unlockedFrames.push('rainbow')
  if (isWeeklyChampion)                    unlockedFrames.push('golden')
  if ((profile?.total_score  ?? 0) >= 300) unlockedFrames.push('divine')

  // Title & progress
  const duelWins   = profile?.wins   ?? 0
  const duelStreak = profile?.win_streak ?? 0
  const title     = getTitle(profile?.title)
  const nextTitle  = getNextTitle(duelWins, duelStreak)

  // Mi viaje bíblico — story chapters + answers
  const { data: allChapters } = await supabase
    .from('story_chapters')
    .select('id, book, chapter, title, character_emoji')
    .order('week_start', { ascending: true })

  const { data: myStoryAnswers } = await supabase
    .from('story_answers')
    .select('chapter_id, question_id, is_correct')
    .eq('user_id', user.id)

  // Group answers by chapter
  const answersByChapter = new Map<string, { total: number; correct: number }>()
  for (const a of myStoryAnswers ?? []) {
    const s = answersByChapter.get(a.chapter_id) ?? { total: 0, correct: 0 }
    s.total += 1
    if (a.is_correct) s.correct += 1
    answersByChapter.set(a.chapter_id, s)
  }

  // Count questions per chapter to know if completed
  const { data: storyQs } = await supabase
    .from('questions')
    .select('story_chapter_id')
    .not('story_chapter_id', 'is', null)
  const qCountByChapter = new Map<string, number>()
  for (const q of storyQs ?? []) {
    const id = q.story_chapter_id as string
    qCountByChapter.set(id, (qCountByChapter.get(id) ?? 0) + 1)
  }

  const completedChapters = (allChapters ?? []).filter(c => {
    const answered = answersByChapter.get(c.id)?.total ?? 0
    const total    = qCountByChapter.get(c.id) ?? 0
    return total > 0 && answered >= total
  })

  // Story-chapter avatar unlocks — retroactive: scans story_answers above and
  // unlocks any avatar whose chapterUnlock matches a completed chapter.
  for (const sa of SPECIAL_AVATARS) {
    if (!sa.chapterUnlock) continue
    const done = completedChapters.some(
      c => c.book === sa.chapterUnlock!.book && c.chapter === sa.chapterUnlock!.chapter
    )
    if (done) unlockedSpecial.push(sa.id)
  }

  // ── La Palabra Oculta: stats ──
  const { data: puzzleAttemptsRaw } = await supabase
    .from('word_puzzle_attempts')
    .select('completed, errors, time_seconds, score, completed_at, puzzle:word_puzzles(available_date)')
    .eq('user_id', user.id)

  const puzzleAttempts = (puzzleAttemptsRaw ?? []) as Array<{
    completed: boolean; errors: number; time_seconds: number | null
    score: number; completed_at: string | null
    puzzle: { available_date: string } | { available_date: string }[] | null
  }>

  const palabraStats = (() => {
    const completed = puzzleAttempts.filter(a => a.completed)
    const total = completed.length
    if (total === 0) return { total: 0, bestTime: null as number | null, avgErrors: null as number | null, streak: 0 }
    const bestTime = completed.reduce((min, a) => {
      const t = a.time_seconds ?? Infinity
      return t < min ? t : min
    }, Infinity)
    const avgErrors = completed.reduce((sum, a) => sum + a.errors, 0) / total

    // Racha: días consecutivos a partir de hoy hacia atrás con un attempt completado en ese available_date
    const dates = new Set(
      completed
        .map(a => Array.isArray(a.puzzle) ? a.puzzle[0]?.available_date : a.puzzle?.available_date)
        .filter(Boolean) as string[]
    )
    let streak = 0
    const cursor = new Date()
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const iso = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
      if (dates.has(iso)) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else break
    }
    return { total, bestTime: bestTime === Infinity ? null : bestTime, avgErrors, streak }
  })()

  // ── Evento Valle de Elá: marcos desbloqueados + avatar_david ──
  const { data: eventChallenges } = await supabase
    .from('events_challenge')
    .select('id, day_number, frame_reward')
    .eq('event_name', 'Valle de Elá')
    .order('day_number', { ascending: true })

  const { data: eventProgress } = await supabase
    .from('events_progress')
    .select('challenge_day_id, completed')
    .eq('user_id', user.id)

  const completedEventDayIds = new Set(
    (eventProgress ?? []).filter(p => p.completed).map(p => p.challenge_day_id)
  )

  const unlockedEventFrames: string[] = []
  for (const c of eventChallenges ?? []) {
    if (c.frame_reward && completedEventDayIds.has(c.id)) {
      unlockedEventFrames.push(c.frame_reward)
    }
  }

  // Avatar David se desbloquea cuando los 7 días están completos
  const valleElaComplete = (eventChallenges?.length ?? 0) > 0
    && (eventChallenges ?? []).every(c => completedEventDayIds.has(c.id))
  for (const sa of SPECIAL_AVATARS) {
    if (sa.eventUnlock === 'valle_ela_complete' && valleElaComplete) {
      unlockedSpecial.push(sa.id)
    }
  }

  // Fondos de avatar desbloqueados
  const unlockedBgs = computeUnlockedBgs({
    totalScore: profile?.total_score ?? 0,
    streakDays: profile?.streak_days ?? 0,
    isWeeklyChampion,
    duelWins:   profile?.wins ?? 0,
    completedStoryChapters: completedChapters.length,
  })

  // Total Bible chapters approximation (OT + NT = 1189)
  const BIBLE_TOTAL_CHAPTERS = 1189
  const biblePct = Math.round((completedChapters.length / BIBLE_TOTAL_CHAPTERS) * 10000) / 100

  // ── Iglesias y clanes ──
  const { data: approvedChurchesRaw } = await supabase
    .from('churches')
    .select('id, name, abbreviation, icon_emoji, icon_url, description, status, requested_by, created_at')
    .eq('status', 'approved')
    .order('name', { ascending: true })

  const approvedChurches = approvedChurchesRaw ?? []

  let clansForMyChurch: Array<{
    id: string; name: string; church_id: string | null;
    shield_color: string | null; shield_bg: string | null; shield_icon: string | null;
    created_by: string | null; is_predefined: boolean; created_at: string
  }> = []
  if (profile?.church_id) {
    const { data: clansData } = await supabase
      .from('clans')
      .select('*')
      .eq('church_id', profile.church_id)
      .order('is_predefined', { ascending: false })
      .order('name', { ascending: true })
    clansForMyChurch = clansData ?? []
  }

  const myChurch = approvedChurches.find(c => c.id === profile?.church_id) ?? null
  const myClan   = clansForMyChurch.find(c => c.id === profile?.clan_id) ?? null

  return (
    <div className="min-h-screen relative">
      <Stars count={70} />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-4 flex items-center justify-between max-w-lg mx-auto">
          <Logo size="sm" />
          <LogoutButton />
        </header>

      <div className="px-4 max-w-lg mx-auto space-y-5 pb-8">
        {/* Avatar + info */}
        <div className="relative bg-gradient-to-br from-[#1a0a4e] via-[#0f0a2e] to-[#1a0a4e] rounded-3xl p-6 border border-purple-500/40 text-center overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex justify-center mb-3">
              <div className="animate-float">
                <Avatar
                  avatarUrl={profile?.avatar_url}
                  firstName={profile?.first_name}
                  size="lg"
                  frame={profile?.frame ?? 'white'}
                  bg={profile?.avatar_bg ?? 'purple'}
                />
              </div>
            </div>

            <h2 className="font-bebas text-3xl text-white leading-none">{profile?.first_name?.toUpperCase()} {profile?.last_name?.toUpperCase()}</h2>
            <p className="text-cyan-300 text-sm mt-1">@{profile?.username}</p>
            <p className="text-gray-400 text-xs mt-1">{user.email}</p>

            {/* Iglesia + clan */}
            {(myChurch || myClan) && (
              <div className="flex items-center justify-center flex-wrap gap-2 mt-3">
                {myChurch && (
                  <ChurchBadge
                    icon_emoji={myChurch.icon_emoji}
                    name={myChurch.name}
                    abbreviation={myChurch.abbreviation}
                    highlight={myChurch.abbreviation === 'MVDA'}
                    showFullName
                  />
                )}
                {myClan && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-purple-500/40 bg-purple-500/15 text-purple-100 text-xs">
                    <ClanShield
                      shield_bg={myClan.shield_bg}
                      shield_color={myClan.shield_color}
                      shield_icon={myClan.shield_icon}
                      size="xs"
                      glow={false}
                    />
                    {myClan.name}
                  </span>
                )}
              </div>
            )}

            {/* Title badge with rarity color */}
            <div className="flex justify-center mt-3">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 text-sm font-bold ${title.bgColor} ${title.borderColor}`}>
                <span className="text-base">⚔️</span>
                <span className={title.specialClass ? title.specialClass : title.color}>{title.label}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${title.rarityColor}`}>({title.rarity})</span>
              </span>
            </div>

            {profile?.role === 'admin' && (
              <Link href="/admin" className="inline-flex items-center gap-1 mt-3 bg-yellow-500/20 text-yellow-300 text-xs px-3 py-1 rounded-full border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors">
                <Shield size={12} /> Panel Admin
              </Link>
            )}
          </div>
        </div>

        {/* Personalizar avatar y marco */}
        <div className="bg-[#0f0a2e]/80 border border-purple-700/40 rounded-2xl p-5 space-y-5">
          <h3 className="font-bebas text-2xl text-white text-center leading-none">PERSONALIZAR PERFIL</h3>

          <BioEditor userId={user.id} initialBio={profile?.bio ?? ''} />

          <ChurchSection
            churches={approvedChurches}
            clans={clansForMyChurch}
            currentChurchId={profile?.church_id ?? null}
            currentClanId={profile?.clan_id ?? null}
          />

          <div className="border-t border-purple-800/40 pt-4">
            <AvatarSection
              userId={user.id}
              avatarUrl={profile?.avatar_url ?? null}
              firstName={profile?.first_name ?? null}
              frame={profile?.frame ?? 'white'}
              avatarBg={profile?.avatar_bg ?? 'purple'}
              unlockedSpecial={unlockedSpecial}
              unlockedFrames={unlockedFrames}
              unlockedEventFrames={unlockedEventFrames}
              unlockedBgs={unlockedBgs}
            />
          </div>
        </div>

        {/* Medalla semanal */}
        {medal ? (
          <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${medal.bgColor} ${medal.borderColor}`}>
            <span className="text-4xl">{medal.icon}</span>
            <div>
              <p className={`font-bold text-lg ${medal.textColor}`}>{medal.label}</p>
              <p className="text-gray-400 text-xs">{weeklyScore} pts esta semana</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-gray-700/30 bg-gray-800/20">
            <span className="text-4xl opacity-40">🏅</span>
            <div>
              <p className="text-gray-500 font-medium">Sin medalla esta semana</p>
              <p className="text-gray-600 text-xs">Jugá para ganar — Bronce desde 50 pts</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-2xl p-4 text-center">
            <Star size={22} className="text-yellow-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-300">{profile?.total_score ?? 0}</p>
            <p className="text-xs text-gray-400">Puntaje total</p>
          </div>
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-2xl p-4 text-center">
            <Flame size={22} className="text-orange-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-300">{profile?.streak_days ?? 0}</p>
            <p className="text-xs text-gray-400">Días seguidos</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4 text-center">
            <span className="text-blue-400 text-xl">🏆</span>
            <p className="text-2xl font-bold text-blue-300">#{userRank > 0 ? userRank : '—'}</p>
            <p className="text-xs text-gray-400">Posición global</p>
          </div>
          <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4 text-center">
            <Calendar size={22} className="text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-300">{accuracy}%</p>
            <p className="text-xs text-gray-400">Precisión</p>
          </div>
        </div>

        {/* ── Duel stats ── */}
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Swords size={16} className="text-purple-400" />
            <h3 className="font-semibold text-white">Estadísticas de Duelos</h3>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xl font-bold text-green-400">{profile?.wins ?? 0}</p>
              <p className="text-xs text-gray-500">Victorias</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-400">{profile?.losses ?? 0}</p>
              <p className="text-xs text-gray-500">Derrotas</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-400">{profile?.draws ?? 0}</p>
              <p className="text-xs text-gray-500">Empates</p>
            </div>
          </div>

          <div className="flex justify-between text-sm mb-4">
            <div>
              <span className="text-gray-400">Racha actual </span>
              <span className={`font-bold ${duelStreak > 0 ? 'text-orange-400' : 'text-gray-500'}`}>{duelStreak}🔥</span>
            </div>
            <div>
              <span className="text-gray-400">Mejor racha </span>
              <span className="font-bold text-purple-400">{profile?.best_streak ?? 0}⚡</span>
            </div>
          </div>

          {/* Title progress */}
          {nextTitle ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Próximo título: <span className={nextTitle.title.color}>{nextTitle.title.label}</span></span>
                <span className="text-gray-500">{nextTitle.progress}/{nextTitle.target} {nextTitle.label}</span>
              </div>
              <div className="h-2 bg-gray-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${nextTitle.title.bgColor.replace('/30', '')}`}
                  style={{ width: `${Math.min(100, Math.round((nextTitle.progress / nextTitle.target) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">{nextTitle.title.requirement}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-yellow-300 text-sm font-bold">👑 Título máximo desbloqueado</p>
            </div>
          )}
        </div>

        {/* ── Mi viaje bíblico ── */}
        <div className="relative bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border border-yellow-700/40 rounded-2xl p-5 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-yellow-500/10 blur-2xl rounded-full pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Scroll size={16} className="text-yellow-400" />
              <h3 className="font-semibold text-yellow-100">Mi viaje bíblico</h3>
            </div>
            <p className="text-yellow-200/70 text-xs mb-4">Modo Historia · {completedChapters.length} capítulos completados</p>

            {/* Bible progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-yellow-300/80">Progreso de la Biblia</span>
                <span className="text-yellow-200 font-bold">{biblePct.toFixed(2)}%</span>
              </div>
              <div className="h-2 bg-yellow-900/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-700"
                  style={{ width: `${Math.max(1, biblePct)}%` }}
                />
              </div>
              <p className="text-yellow-300/50 text-[10px] mt-1">{completedChapters.length} de {BIBLE_TOTAL_CHAPTERS} capítulos</p>
            </div>

            {/* Timeline */}
            {completedChapters.length === 0 ? (
              <div className="text-center py-6">
                <BookOpen size={28} className="text-yellow-700/60 mx-auto mb-2" />
                <p className="text-yellow-200/70 text-xs">Aún no completaste ningún capítulo</p>
                <Link href="/historia" className="inline-block mt-3 px-4 py-2 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/40 text-yellow-100 text-xs font-medium rounded-xl transition-colors">
                  📜 Empezar mi viaje
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {completedChapters.map((c, i) => {
                  const stats   = answersByChapter.get(c.id)
                  const correct = stats?.correct ?? 0
                  const total   = stats?.total ?? 0
                  return (
                    <div key={c.id} className="relative flex items-center gap-3">
                      {/* Vertical line */}
                      {i < completedChapters.length - 1 && (
                        <span className="absolute left-[18px] top-9 bottom-[-12px] w-0.5 bg-yellow-700/40" />
                      )}
                      {/* Badge */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 border-2 border-yellow-400/60 flex items-center justify-center text-base flex-shrink-0 shadow-lg shadow-yellow-900/50 z-10">
                        {c.character_emoji}
                      </div>
                      <div className="flex-1 bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-3 py-2">
                        <p className="text-yellow-100 text-sm font-semibold" style={{ fontFamily: 'serif' }}>{c.book} {c.chapter}</p>
                        <p className="text-yellow-300/70 text-xs">{c.title} · {correct}/{total} correctas</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Titles showcase */}
        <div className="bg-[#0f0a2e]/80 border border-purple-700/40 rounded-2xl p-5">
          <h3 className="font-bebas text-2xl text-white mb-3 flex items-center gap-2 leading-none">
            <Trophy size={18} className="text-amber-400" />
            TODOS LOS TÍTULOS
          </h3>
          <div className="space-y-2">
            {TITLES.map(t => {
              const unlocked = title.id === t.id || duelWins >= (t.winsRequired ?? 0) || (t.streakRequired && duelStreak >= t.streakRequired)
              return (
                <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all ${
                  unlocked ? `${t.bgColor} ${t.borderColor}` : 'bg-gray-900/30 border-gray-800/30 opacity-40'
                }`}>
                  <span className={`text-sm font-bold ${t.specialClass ?? t.color}`}>{t.label}</span>
                  <span className={`text-[10px] ml-auto uppercase tracking-wider font-bold ${t.rarityColor}`}>{t.rarity}</span>
                  {!unlocked && <span className="text-gray-600 text-xs">🔒</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* La Palabra Oculta — stats */}
        <div className="relative bg-gradient-to-br from-amber-900/30 to-purple-900/20 border border-amber-700/40 rounded-2xl p-5 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500/15 blur-2xl rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-amber-100 flex items-center gap-2">
                <Scroll size={16} className="text-amber-400" /> La Palabra Oculta
              </h3>
              <Link href="/palabra-oculta" className="text-amber-300 hover:text-amber-100 text-xs underline">Jugar →</Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3 text-center">
                <p className="text-amber-300/80 text-[10px] uppercase tracking-wider">Resueltos</p>
                <p className="font-bebas text-2xl text-amber-100 leading-none mt-0.5">{palabraStats.total}</p>
              </div>
              <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3 text-center">
                <p className="text-amber-300/80 text-[10px] uppercase tracking-wider">Racha</p>
                <p className="font-bebas text-2xl text-amber-100 leading-none mt-0.5">{palabraStats.streak} 🔥</p>
              </div>
              <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3 text-center">
                <p className="text-amber-300/80 text-[10px] uppercase tracking-wider">Mejor tiempo</p>
                <p className="font-bebas text-2xl text-amber-100 leading-none mt-0.5">
                  {palabraStats.bestTime === null
                    ? '—'
                    : `${Math.floor(palabraStats.bestTime / 60)}:${(palabraStats.bestTime % 60).toString().padStart(2, '0')}`}
                </p>
              </div>
              <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3 text-center">
                <p className="text-amber-300/80 text-[10px] uppercase tracking-wider">Errores promedio</p>
                <p className="font-bebas text-2xl text-amber-100 leading-none mt-0.5">
                  {palabraStats.avgErrors === null ? '—' : palabraStats.avgErrors.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Historial resumen */}
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3">Resumen general</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Preguntas respondidas</span>
              <span className="text-white font-medium">{totalAnswers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Respuestas correctas</span>
              <span className="text-green-400 font-medium">{correctAnswers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Respuestas incorrectas</span>
              <span className="text-red-400 font-medium">{totalAnswers - correctAnswers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Miembro desde</span>
              <span className="text-white font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
