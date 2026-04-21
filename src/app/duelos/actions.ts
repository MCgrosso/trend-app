'use server'

import { createClient } from '@/lib/supabase/server'
import { DUEL_CATEGORIES } from '@/lib/titles'

export async function searchUserByUsername(username: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', data: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, frame, wins, title')
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

  if (error) {
    console.log('[createDuel] insert error:', error)
    return { error: error.message, duelId: null }
  }
  console.log('[createDuel] inserted duel', duel.id, 'challenger=', user.id, 'opponent=', opponentId)
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
  const randomCat = remaining[Math.floor(Math.random() * remaining.length)] ?? challengerCats[0]
  const finalCats = [...challengerCats, ...opponentCategories, randomCat]

  console.log('[acceptDuel] finalCats (5 categorías a buscar):', finalCats)

  // Single query — fetch all questions whose category matches any of the chosen 5
  const { data: matched, error: matchedErr } = await supabase
    .from('questions')
    .select('id, category')
    .in('category', finalCats)

  if (matchedErr) {
    console.log('[acceptDuel] error consultando preguntas por categoría:', matchedErr)
    return { error: `Error consultando preguntas: ${matchedErr.message}` }
  }

  // Group by category to see how many we have for each
  const byCategory = new Map<string, string[]>()
  for (const q of matched ?? []) {
    const k = q.category as string
    const list = byCategory.get(k) ?? []
    list.push(q.id)
    byCategory.set(k, list)
  }
  console.log('[acceptDuel] preguntas encontradas por categoría:',
    finalCats.map(c => ({ categoria: c, cantidad: byCategory.get(c)?.length ?? 0 }))
  )

  // Pick 1 question per category (no duplicates)
  const questionIds: { id: string; order: number }[] = []
  const usedIds = new Set<string>()
  for (let i = 0; i < finalCats.length; i++) {
    const cat  = finalCats[i]
    const pool = (byCategory.get(cat) ?? []).filter(id => !usedIds.has(id))
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)]
      questionIds.push({ id: pick, order: i + 1 })
      usedIds.add(pick)
    }
  }

  // Fallback — if we still don't have 5, pick from ANY question
  if (questionIds.length < 5) {
    const needed = 5 - questionIds.length
    console.log('[acceptDuel] fallback: faltan', needed, 'preguntas, busco de cualquier categoría')

    const { data: anyQs, error: anyErr } = await supabase
      .from('questions')
      .select('id')
      .limit(100)

    if (anyErr) console.log('[acceptDuel] error fallback:', anyErr)

    const pool = (anyQs ?? []).filter(q => !usedIds.has(q.id)).map(q => q.id)
    console.log('[acceptDuel] tamaño del pool de fallback (excluyendo ya elegidas):', pool.length)

    while (questionIds.length < 5 && pool.length > 0) {
      const idx  = Math.floor(Math.random() * pool.length)
      const pick = pool.splice(idx, 1)[0]
      questionIds.push({ id: pick, order: questionIds.length + 1 })
      usedIds.add(pick)
    }
  }

  console.log('[acceptDuel] preguntas finales seleccionadas:', questionIds.length, questionIds)

  if (questionIds.length === 0) {
    return { error: 'No hay preguntas en la base de datos. El admin debe cargar preguntas desde /admin/preguntas.' }
  }

  // Insert duel questions FIRST so we never end up active without questions
  const rows = questionIds.map(q => ({
    duel_id: duelId,
    question_id: q.id,
    question_order: q.order,
  }))
  const { error: insertErr } = await supabase.from('duel_questions').insert(rows)
  if (insertErr) {
    console.log('[acceptDuel] duel_questions insert error:', insertErr)
    return { error: `Error al crear preguntas: ${insertErr.message}` }
  }
  console.log('[acceptDuel] inserted', rows.length, 'duel_questions for duel', duelId)

  // Now activate the duel
  const { error: updateErr } = await supabase
    .from('duels')
    .update({ status: 'active', categories: finalCats })
    .eq('id', duelId)

  if (updateErr) {
    console.log('[acceptDuel] duel activation error:', updateErr)
    // Roll back the questions to keep state consistent
    await supabase.from('duel_questions').delete().eq('duel_id', duelId)
    return { error: updateErr.message }
  }

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
