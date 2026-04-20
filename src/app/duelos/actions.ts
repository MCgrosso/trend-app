'use server'

import { createClient } from '@/lib/supabase/server'
import { DUEL_CATEGORIES } from '@/lib/titles'

export async function searchUserByUsername(username: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', data: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, frame, duel_wins, title')
    .ilike('username', username.trim())
    .neq('id', user.id)
    .limit(5)

  if (error) return { error: error.message, data: null }
  return { error: null, data }
}

export async function createDuel(opponentId: string, challengerCategories: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', duelId: null }

  // Check daily limit (3 per day)
  const { data: countData } = await supabase.rpc('get_daily_duel_count', { p_user_id: user.id })
  if ((countData ?? 0) >= 3) return { error: 'Límite de 3 duelos por día alcanzado', duelId: null }

  // Prevent self-duel and duplicate pending
  if (opponentId === user.id) return { error: 'No podés desafiarte a vos mismo', duelId: null }

  const { data: duel, error } = await supabase
    .from('duels')
    .insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      status: 'pending',
      categories: challengerCategories,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, duelId: null }
  return { error: null, duelId: duel.id }
}

export async function acceptDuel(duelId: string, opponentCategories: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: duel, error: fetchErr } = await supabase
    .from('duels')
    .select('*')
    .eq('id', duelId)
    .eq('opponent_id', user.id)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !duel) return { error: 'Duelo no encontrado' }

  // Merge categories: challenger's 2 + opponent's 2 + 1 random from remainder
  const challengerCats: string[] = duel.categories ?? []
  const allChosen = new Set([...challengerCats, ...opponentCategories])
  const remaining = DUEL_CATEGORIES.filter(c => !allChosen.has(c))
  const randomCat = remaining[Math.floor(Math.random() * remaining.length)]
  const finalCats = [...challengerCats, ...opponentCategories, randomCat]

  // Pick 1 question per category
  const questionIds: { id: string; order: number }[] = []
  for (let i = 0; i < finalCats.length; i++) {
    const cat = finalCats[i]
    const { data: qs } = await supabase
      .from('questions')
      .select('id')
      .eq('category', cat)
      .limit(50)

    if (qs && qs.length > 0) {
      const pick = qs[Math.floor(Math.random() * qs.length)]
      questionIds.push({ id: pick.id, order: i + 1 })
    }
  }

  // Fallback: if any category has no questions, pick randoms
  if (questionIds.length < 5) {
    const needed = 5 - questionIds.length
    const usedIds = [...new Set(questionIds.map(q => q.id))]
    let fallbackQuery = supabase.from('questions').select('id').limit(needed + 20)
    if (usedIds.length > 0) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${usedIds.join(',')})`)
    }
    const { data: fallback } = await fallbackQuery
    const fb = fallback ?? []
    for (let i = 0; i < needed && i < fb.length; i++) {
      questionIds.push({ id: fb[i].id, order: questionIds.length + 1 })
    }
  }

  // Update duel
  const { error: updateErr } = await supabase
    .from('duels')
    .update({ status: 'active', categories: finalCats })
    .eq('id', duelId)

  if (updateErr) return { error: updateErr.message }

  // Insert duel questions
  const rows = questionIds.map(q => ({
    duel_id: duelId,
    question_id: q.id,
    question_order: q.order,
  }))
  await supabase.from('duel_questions').insert(rows)

  return { error: null }
}

export async function rejectDuel(duelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  await supabase
    .from('duels')
    .update({ status: 'rejected' })
    .eq('id', duelId)
    .eq('opponent_id', user.id)

  return { error: null }
}

export async function cancelDuel(duelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  await supabase
    .from('duels')
    .update({ status: 'cancelled' })
    .eq('id', duelId)
    .eq('challenger_id', user.id)
    .eq('status', 'pending')

  return { error: null }
}

export async function submitDuelAnswer(
  duelId: string,
  duelQuestionId: string,
  answer: string
): Promise<{ error: string | null; isCorrect: boolean; finished: boolean; result: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', isCorrect: false, finished: false, result: null }

  const { data: duel } = await supabase
    .from('duels')
    .select('challenger_id, opponent_id')
    .eq('id', duelId)
    .single()

  if (!duel) return { error: 'Duelo no encontrado', isCorrect: false, finished: false, result: null }

  const isChallenger = duel.challenger_id === user.id

  // Get question to check correct answer
  const { data: dq } = await supabase
    .from('duel_questions')
    .select('question_id')
    .eq('id', duelQuestionId)
    .single()

  if (!dq) return { error: 'Pregunta no encontrada', isCorrect: false, finished: false, result: null }

  const { data: question } = await supabase
    .from('questions')
    .select('correct_option')
    .eq('id', dq.question_id)
    .single()

  const isCorrect = answer === question?.correct_option

  // Update duel_questions
  const updatePayload = isChallenger
    ? { challenger_answer: answer, challenger_correct: isCorrect }
    : { opponent_answer: answer, opponent_correct: isCorrect }

  await supabase.from('duel_questions').update(updatePayload).eq('id', duelQuestionId)

  // Update score in duel
  if (isCorrect) {
    const scoreField = isChallenger ? 'challenger_score' : 'opponent_score'
    const { data: currentDuel } = await supabase.from('duels').select(scoreField).eq('id', duelId).single()
    const currentScore = (currentDuel as Record<string, number> | null)?.[scoreField] ?? 0
    await supabase.from('duels').update({ [scoreField]: currentScore + 1 }).eq('id', duelId)
  }

  // Check if this player answered all questions
  const answerField = isChallenger ? 'challenger_answer' : 'opponent_answer'
  const { data: allQs } = await supabase
    .from('duel_questions')
    .select(answerField)
    .eq('duel_id', duelId)

  const allAnswered = (allQs ?? []).every(q => (q as Record<string, string | null>)[answerField] !== null)

  let finished = false
  let result: string | null = null

  if (allAnswered) {
    const { data: finishData } = await supabase.rpc('finish_duel', {
      p_duel_id: duelId,
      p_user_id: user.id,
    })
    finished = true
    result = (finishData as { result?: string } | null)?.result ?? null
  }

  return { error: null, isCorrect, finished, result }
}
