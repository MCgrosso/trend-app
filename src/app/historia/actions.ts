'use server'

import { createClient } from '@/lib/supabase/server'
import { awardXpTo } from '@/lib/awardXp'
import { XP_REWARDS } from '@/lib/xp'

export async function submitStoryAnswer(
  chapterId: string,
  questionId: string,
  answer: string
): Promise<{ error: string | null; isCorrect: boolean; chapterCompleted?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', isCorrect: false }

  const { data: question } = await supabase
    .from('questions')
    .select('correct_option')
    .eq('id', questionId)
    .single()

  if (!question) return { error: 'Pregunta no encontrada', isCorrect: false }

  const isCorrect = answer === question.correct_option

  // Snapshot: ¿existía ya una respuesta a esta pregunta? Sirve para garantizar
  // que el bonus de capítulo solo se otorga la primera vez que cubrís todas.
  const { data: previous } = await supabase
    .from('story_answers')
    .select('question_id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .maybeSingle()
  const wasAlreadyAnswered = !!previous

  const { error } = await supabase.from('story_answers').upsert(
    {
      user_id: user.id,
      chapter_id: chapterId,
      question_id: questionId,
      is_correct: isCorrect,
    },
    { onConflict: 'user_id,question_id' }
  )

  if (error) return { error: error.message, isCorrect: false }

  // total_score: 10 pts por respuesta correcta. XP: +5 / +1 según resultado.
  if (isCorrect) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_score')
      .eq('id', user.id)
      .single()
    await supabase
      .from('profiles')
      .update({ total_score: (profile?.total_score ?? 0) + 10 })
      .eq('id', user.id)
  }
  await awardXpTo(user.id, isCorrect ? XP_REWARDS.TRIVIA_CORRECT : XP_REWARDS.TRIVIA_WRONG)

  // Detectar si el capítulo se completó con esta respuesta → bonus +25 XP
  let chapterCompleted = false
  const { data: chapterQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('story_chapter_id', chapterId)
  const totalQs = chapterQuestions?.length ?? 0
  if (totalQs > 0) {
    const { count: answeredCount } = await supabase
      .from('story_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
    if ((answeredCount ?? 0) >= totalQs) {
      chapterCompleted = true
      // Bonus solo cuando esta es la respuesta que justo cierra el capítulo
      // (no la había contestado antes — la cuenta sube por primera vez).
      if (!wasAlreadyAnswered) {
        await awardXpTo(user.id, XP_REWARDS.STORY_CHAPTER)
      }
    }
  }

  return { error: null, isCorrect, chapterCompleted }
}
