'use server'

import { createClient } from '@/lib/supabase/server'
import { awardXpTo } from '@/lib/awardXp'
import { XP_REWARDS } from '@/lib/xp'

export async function submitAnswer(questionId: string, selectedOption: string): Promise<{
  error: string | null
  isCorrect: boolean
  allDailyDone?: boolean
  streakBonus?: number
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado. Recargá la página.', isCorrect: false }
  }

  const { data: question } = await supabase
    .from('questions')
    .select('correct_option, available_date')
    .eq('id', questionId)
    .single()

  if (!question) {
    return { error: 'Pregunta no encontrada.', isCorrect: false }
  }

  const isCorrect = selectedOption === question.correct_option

  // Snapshot del streak ANTES de insertar (necesario para detectar el cruce a 3/7)
  const { data: profileBefore } = await supabase
    .from('profiles')
    .select('streak_days, last_played_at')
    .eq('id', user.id)
    .single()
  const prevStreak = profileBefore?.streak_days ?? 0
  const prevLastPlayed = profileBefore?.last_played_at as string | null

  const { error } = await supabase.from('answers').insert({
    user_id: user.id,
    question_id: questionId,
    selected_option: selectedOption,
    is_correct: isCorrect,
  })

  if (error) {
    return { error: error.message, isCorrect: false }
  }

  // ── XP por respuesta (5 si correcta, 1 si incorrecta) ──
  await awardXpTo(user.id, isCorrect ? XP_REWARDS.TRIVIA_CORRECT : XP_REWARDS.TRIVIA_WRONG)

  // ── Bonus de racha: solo si esta es la primera respuesta del día ──
  // (es decir, last_played_at antes era distinto de hoy)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  let streakBonus = 0
  if (prevLastPlayed !== todayStr) {
    // El trigger de Supabase actualiza streak_days al hacer la 1° respuesta del día.
    // Releo el streak post-insert.
    const { data: profileAfter } = await supabase
      .from('profiles')
      .select('streak_days')
      .eq('id', user.id)
      .single()
    const newStreak = profileAfter?.streak_days ?? 0
    if (newStreak >= 7 && prevStreak < 7) {
      streakBonus = XP_REWARDS.STREAK_7_BONUS
      await awardXpTo(user.id, streakBonus)
    } else if (newStreak >= 3 && prevStreak < 3) {
      streakBonus = XP_REWARDS.STREAK_3_BONUS
      await awardXpTo(user.id, streakBonus)
    }
  }

  // ── Bonus por completar todas las trivias del día ──
  let allDailyDone = false
  const { count: totalToday } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('available_date', todayStr)

  if (totalToday && totalToday > 0) {
    // Cuántas distintas respondió de hoy (incluyendo esta)
    const { data: answersToday } = await supabase
      .from('answers')
      .select('question_id, questions!inner(available_date)')
      .eq('user_id', user.id)
    const answeredTodayCount = (answersToday ?? []).filter(
      (a: { questions: { available_date: string } | { available_date: string }[] }) => {
        const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
        return q?.available_date === todayStr
      }
    ).length
    if (answeredTodayCount >= totalToday) {
      allDailyDone = true
      // Idempotencia: solo si la pregunta de esta llamada fue la última (no hubo
      // entrada previa para esta question). El insert sin upsert garantiza que si
      // ya estaba respondida fallaba antes con conflict — así que llegar acá significa
      // que esta es la primera vez. Damos el bonus.
      await awardXpTo(user.id, XP_REWARDS.ALL_DAILIES_BONUS)
    }
  }

  return { error: null, isCorrect, allDailyDone, streakBonus }
}
