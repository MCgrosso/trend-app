export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StoryIntro from '../../StoryIntro'

export default async function ChapterIntroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: chapter } = await supabase
    .from('story_chapters')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!chapter) notFound()

  // Block entry to locked (future) chapters
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  if (chapter.week_start > today) {
    redirect('/historia')
  }

  const [
    { count: totalQs },
    { data: myAnswers },
  ] = await Promise.all([
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('story_chapter_id', chapter.id),
    supabase
      .from('story_answers')
      .select('question_id, is_correct')
      .eq('user_id', user.id)
      .eq('chapter_id', chapter.id),
  ])

  const answered = myAnswers?.length ?? 0
  const correctCount = myAnswers?.filter(a => a.is_correct).length ?? 0
  const completed = (totalQs ?? 0) > 0 && answered >= (totalQs ?? 0)

  return (
    <StoryIntro
      chapter={chapter}
      completed={completed}
      correctCount={correctCount}
      totalQuestions={totalQs ?? 0}
    />
  )
}
