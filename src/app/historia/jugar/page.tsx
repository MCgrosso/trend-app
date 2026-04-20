export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StoryGameClient from './StoryGameClient'

export default async function StoryGamePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: chapter } = await supabase
    .from('story_chapters')
    .select('*')
    .eq('is_active', true)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!chapter) notFound()

  const [
    { data: questions },
    { data: myAnswers },
  ] = await Promise.all([
    supabase
      .from('questions')
      .select('id, question, option_a, option_b, option_c, option_d, correct_option, explanation')
      .eq('story_chapter_id', chapter.id)
      .order('created_at'),
    supabase
      .from('story_answers')
      .select('question_id, is_correct')
      .eq('user_id', user.id)
      .eq('chapter_id', chapter.id),
  ])

  return (
    <StoryGameClient
      chapter={chapter}
      questions={questions ?? []}
      previousAnswers={myAnswers ?? []}
    />
  )
}
