'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitAnswer(questionId: string, selectedOption: string): Promise<{ error: string | null; isCorrect: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado. Recargá la página.', isCorrect: false }
  }

  const { data: question } = await supabase
    .from('questions')
    .select('correct_option')
    .eq('id', questionId)
    .single()

  if (!question) {
    return { error: 'Pregunta no encontrada.', isCorrect: false }
  }

  const isCorrect = selectedOption === question.correct_option

  const { error } = await supabase.from('answers').insert({
    user_id: user.id,
    question_id: questionId,
    selected_option: selectedOption,
    is_correct: isCorrect,
  })

  if (error) {
    return { error: error.message, isCorrect: false }
  }

  return { error: null, isCorrect }
}
