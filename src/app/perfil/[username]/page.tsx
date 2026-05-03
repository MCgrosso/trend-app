export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicProfile from './PublicProfile'

export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, frame, avatar_bg, title, bio, total_score, streak_days, wins, losses, draws, win_streak, best_streak, created_at, xp, level, favorite_verse, favorite_verse_ref')
    .ilike('username', username)
    .maybeSingle()

  if (!profile) notFound()

  // Weekly score → medal
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday)
  weekStart.setUTCHours(0, 0, 0, 0)

  const { data: weeklyAnswers } = await supabase
    .from('answers')
    .select('is_correct')
    .eq('user_id', profile.id)
    .eq('is_correct', true)
    .gte('answered_at', weekStart.toISOString())

  const weeklyScore = (weeklyAnswers?.length ?? 0) * 10

  const { data: weeklyAll } = await supabase.rpc('get_weekly_ranking')
  const isWeeklyChampion = (weeklyAll?.[0]?.id === profile.id) && weeklyScore > 0

  // Story chapters completed
  const { data: allChapters } = await supabase
    .from('story_chapters')
    .select('id, book, chapter, title, character_emoji')
    .order('week_start', { ascending: true })

  const { data: storyAnswers } = await supabase
    .from('story_answers')
    .select('chapter_id, is_correct')
    .eq('user_id', profile.id)

  const { data: storyQs } = await supabase
    .from('questions')
    .select('story_chapter_id')
    .not('story_chapter_id', 'is', null)

  const qCountByChapter = new Map<string, number>()
  for (const q of storyQs ?? []) {
    const id = q.story_chapter_id as string
    qCountByChapter.set(id, (qCountByChapter.get(id) ?? 0) + 1)
  }

  const statsByChapter = new Map<string, { total: number; correct: number }>()
  for (const a of storyAnswers ?? []) {
    const s = statsByChapter.get(a.chapter_id) ?? { total: 0, correct: 0 }
    s.total++
    if (a.is_correct) s.correct++
    statsByChapter.set(a.chapter_id, s)
  }

  const completedChapters = (allChapters ?? [])
    .filter(c => {
      const total    = qCountByChapter.get(c.id) ?? 0
      const answered = statsByChapter.get(c.id)?.total ?? 0
      return total > 0 && answered >= total
    })
    .map(c => {
      const total   = qCountByChapter.get(c.id) ?? 0
      const correct = statsByChapter.get(c.id)?.correct ?? 0
      return { ...c, total, correct }
    })

  // Global rank
  const { data: ranking } = await supabase
    .from('profiles')
    .select('id')
    .order('total_score', { ascending: false })
  const userRank = (ranking?.findIndex(p => p.id === profile.id) ?? -1) + 1

  // Reflexiones públicas del Valle de Elá. Si soy el dueño, también traigo las
  // privadas para que pueda gestionarlas desde el toggle.
  const isMe = authUser?.id === profile.id
  let reflectionsQuery = supabase
    .from('events_progress')
    .select('id, reflection_answer, is_public, completed_at, challenge:events_challenge(day_number, title, reflection_prompt)')
    .eq('user_id', profile.id)
    .not('reflection_answer', 'is', null)
    .order('completed_at', { ascending: true, nullsFirst: false })
  if (!isMe) reflectionsQuery = reflectionsQuery.eq('is_public', true)
  const { data: reflectionsRaw } = await reflectionsQuery

  // Supabase devuelve `challenge` como array si la relación inferida es to-many;
  // normalizo a objeto único.
  const publicReflections = (reflectionsRaw ?? []).map(r => ({
    id: r.id as string,
    reflection_answer: r.reflection_answer as string,
    is_public: r.is_public as boolean,
    completed_at: r.completed_at as string | null,
    challenge: Array.isArray(r.challenge) ? (r.challenge[0] ?? null) : (r.challenge ?? null),
  }))

  return (
    <PublicProfile
      profile={profile}
      isMe={isMe}
      isLoggedIn={!!authUser}
      weeklyScore={weeklyScore}
      isWeeklyChampion={isWeeklyChampion}
      completedChapters={completedChapters}
      globalRank={userRank}
      publicReflections={publicReflections}
    />
  )
}
