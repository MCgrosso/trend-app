'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitStoryAnswer(
  chapterId: string,
  questionId: string,
  answer: string
): Promise<{ error: string | null; isCorrect: boolean }> {
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

  // Also award points to total_score for correct answers (10 pts like trivia mode)
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

  return { error: null, isCorrect }
}
