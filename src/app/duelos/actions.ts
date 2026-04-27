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

// Like searchUserByUsername but restricted to players from a *different* church
// (and excludes anyone with no church assigned).
export async function searchInterChurchOpponent(username: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', data: null }

  const { data: me } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()
  if (!me?.church_id) return { error: 'Elegí tu iglesia en /profile primero', data: null }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, frame, wins, title, church_id')
    .ilike('username', username.trim())
    .neq('id', user.id)
    .neq('church_id', me.church_id)
    .not('church_id', 'is', null)
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

  // Determine inter-church flag: true only when both have a church and they differ
  const { data: bothProfiles } = await supabase
    .from('profiles')
    .select('id, church_id')
    .in('id', [user.id, opponentId])
  const myChurch = bothProfiles?.find(p => p.id === user.id)?.church_id ?? null
  const opChurch = bothProfiles?.find(p => p.id === opponentId)?.church_id ?? null
  const isInterChurch = !!myChurch && !!opChurch && myChurch !== opChurch

  const { data: duel, error } = await supabase
    .from('duels')
    .insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      status: 'pending',
      categories: challengerCategories,
      is_inter_church: isInterChurch,
    })
    .select('id')
    .single()

  if (error) {
    console.log('[createDuel] insert error:', error)
    return { error: error.message, duelId: null }
  }
  console.log('[createDuel] inserted duel', duel.id, 'challenger=', user.id, 'opponent=', opponentId, 'interChurch=', isInterChurch)
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

// ─── Diagnostic — dumps actual schema + rows of duel_questions for a duel ───
export async function diagnoseDuelQuestions(duelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', columns: [], rows: [], hasAnswerColumns: false }

  const { data: rows, error } = await supabase
    .from('duel_questions')
    .select('*')
    .eq('duel_id', duelId)

  if (error) {
    return { error: error.message, columns: [], rows: [], hasAnswerColumns: false }
  }

  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : []
  const hasAnswerColumns =
    columns.includes('challenger_answer') &&
    columns.includes('opponent_answer') &&
    columns.includes('challenger_correct') &&
    columns.includes('opponent_correct')

  console.log('[diagnose:server] duelId=', duelId, 'rowCount=', rows?.length ?? 0)
  console.log('[diagnose:server] columns:', columns)
  console.log('[diagnose:server] hasAnswerColumns:', hasAnswerColumns)
  console.log('[diagnose:server] rows:', rows)

  return { error: null, columns, rows: rows ?? [], hasAnswerColumns }
}

// ─── Idempotent finish-checker — calculates winner & awards points if both done ───
export async function checkAndFinishDuel(duelId: string): Promise<{
  error: string | null
  finished: boolean
  result: 'challenger' | 'opponent' | 'draw' | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', finished: false, result: null }

  // 1. Fetch duel
  const { data: duel, error: dErr } = await supabase
    .from('duels')
    .select('id, challenger_id, opponent_id, status, winner_id')
    .eq('id', duelId)
    .single()

  if (dErr || !duel) {
    console.log('[checkAndFinishDuel] duel fetch error:', dErr)
    return { error: dErr?.message ?? 'Duelo no encontrado', finished: false, result: null }
  }

  // 2. Already finished — return current state, idempotent
  if (duel.status === 'finished') {
    let result: 'challenger' | 'opponent' | 'draw'
    if (!duel.winner_id) result = 'draw'
    else if (duel.winner_id === duel.challenger_id) result = 'challenger'
    else result = 'opponent'
    return { error: null, finished: true, result }
  }

  // 3. Fetch all duel_questions
  const { data: dqs, error: qErr } = await supabase
    .from('duel_questions')
    .select('challenger_answer, challenger_correct, opponent_answer, opponent_correct')
    .eq('duel_id', duelId)

  if (qErr || !dqs) {
    console.log('[checkAndFinishDuel] dq fetch error:', qErr)
    return { error: qErr?.message ?? 'Error consultando preguntas', finished: false, result: null }
  }

  const isAnswered = (v: unknown) => typeof v === 'string' && v.trim() !== ''
  const allChDone = dqs.length > 0 && dqs.every(q => isAnswered(q.challenger_answer))
  const allOpDone = dqs.length > 0 && dqs.every(q => isAnswered(q.opponent_answer))

  console.log('[checkAndFinishDuel]', {
    duelId, qCount: dqs.length, allChDone, allOpDone,
  })

  // 4. Update partial finish flags (always — so other player sees waiting state correctly)
  await supabase
    .from('duels')
    .update({
      challenger_finished: allChDone,
      opponent_finished:   allOpDone,
    })
    .eq('id', duelId)
    .eq('status', 'active')

  if (!allChDone || !allOpDone) {
    return { error: null, finished: false, result: null }
  }

  // 5. Both finished — compute result
  const chScore = dqs.filter(q => q.challenger_correct === true).length
  const opScore = dqs.filter(q => q.opponent_correct === true).length

  let winnerId: string | null = null
  let result: 'challenger' | 'opponent' | 'draw'
  if      (chScore > opScore) { winnerId = duel.challenger_id; result = 'challenger' }
  else if (opScore > chScore) { winnerId = duel.opponent_id;   result = 'opponent'   }
  else                        { result = 'draw' }

  // 6. Atomic transition to finished — only if still active (race protection)
  const { data: updated, error: updErr } = await supabase
    .from('duels')
    .update({
      status: 'finished',
      challenger_score: chScore,
      opponent_score:   opScore,
      winner_id:        winnerId,
      challenger_finished: true,
      opponent_finished:   true,
      finished_at:      new Date().toISOString(),
    })
    .eq('id', duelId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle()

  if (updErr) {
    console.log('[checkAndFinishDuel] activation update error:', updErr)
    return { error: updErr.message, finished: false, result: null }
  }

  // Another concurrent call already finalized — skip profile updates
  if (!updated) {
    console.log('[checkAndFinishDuel] race — already finished by another caller')
    return { error: null, finished: true, result }
  }

  console.log('[checkAndFinishDuel] finalized:', {
    duelId, result, chScore, opScore, winnerId,
    challengerId: duel.challenger_id, opponentId: duel.opponent_id,
  })

  // 7. Award points + update profile stats via SECURITY DEFINER RPC.
  //    Can't do this from a user-scoped client: the profiles RLS policy
  //    "users can update own profile" blocks writes on the opponent's row,
  //    so only one player would have their wins/losses counted.
  const profilesBefore = await supabase
    .from('profiles')
    .select('id, wins, losses, draws, total_score')
    .in('id', [duel.challenger_id, duel.opponent_id])
  console.log('[checkAndFinishDuel] profiles BEFORE apply_duel_result:', profilesBefore.data)

  const { data: applyData, error: applyErr } = await supabase.rpc('apply_duel_result', {
    p_duel_id: duelId,
  })
  console.log('[checkAndFinishDuel] apply_duel_result response:', { applyData, applyErr })

  if (applyErr) {
    console.log('[checkAndFinishDuel] apply_duel_result FAILED:', applyErr)
  }

  const profilesAfter = await supabase
    .from('profiles')
    .select('id, wins, losses, draws, total_score')
    .in('id', [duel.challenger_id, duel.opponent_id])
  console.log('[checkAndFinishDuel] profiles AFTER apply_duel_result:', profilesAfter.data)

  return { error: null, finished: true, result }
}

export async function submitDuelAnswer(
  duelId: string,
  duelQuestionId: string,
  answer: string
): Promise<{
  error: string | null
  isCorrect: boolean
  finished: boolean
  result: string | null
  _debug?: Record<string, unknown>
}> {
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

  // Update duel_questions — names are challenger_answer / opponent_answer (see migration 004 + 011)
  const updatePayload = isChallenger
    ? { challenger_answer: answer, challenger_correct: isCorrect }
    : { opponent_answer:   answer, opponent_correct:   isCorrect }

  console.log('[submitDuelAnswer] UPDATE duel_questions', {
    duelQuestionId, isChallenger, payload: updatePayload,
  })

  // Pre-update: snapshot the row to compare schemas
  const { data: rowBefore } = await supabase
    .from('duel_questions')
    .select('*')
    .eq('id', duelQuestionId)
    .maybeSingle()

  const { data: updatedRow, error: updErr } = await supabase
    .from('duel_questions')
    .update(updatePayload)
    .eq('id', duelQuestionId)
    .select('*')
    .maybeSingle()

  console.log('[submitDuelAnswer] UPDATE result:', { updatedRow, updErr })

  if (updErr) {
    console.log('[submitDuelAnswer] UPDATE ERROR:', updErr)
    return {
      error: `UPDATE falló: ${updErr.message}. Asegurate de correr migration 011.`,
      isCorrect: false, finished: false, result: null,
      _debug: { stage: 'update-error', error: updErr, payload: updatePayload, rowBefore },
    }
  }

  // Verify the value actually persisted
  const myField = isChallenger ? 'challenger_answer' : 'opponent_answer'
  const persistedVal = (updatedRow as Record<string, unknown> | null)?.[myField]
  const columnsInRow = updatedRow ? Object.keys(updatedRow) : []

  if (typeof persistedVal !== 'string' || persistedVal !== answer) {
    return {
      error: `La columna "${myField}" no se actualizó. Valor leído: ${JSON.stringify(persistedVal)}. Columnas en la fila: ${columnsInRow.join(', ')}. Corré la migration 011 en Supabase.`,
      isCorrect: false, finished: false, result: null,
      _debug: {
        stage: 'value-not-persisted',
        myField,
        persistedVal,
        columnsInRow,
        hasAnswerColumns: columnsInRow.includes('challenger_answer') && columnsInRow.includes('opponent_answer'),
        payload: updatePayload,
        rowBefore,
        updatedRow,
      },
    }
  }

  // Update score in duel
  if (isCorrect) {
    const scoreField = isChallenger ? 'challenger_score' : 'opponent_score'
    const { data: currentDuel } = await supabase.from('duels').select(scoreField).eq('id', duelId).single()
    const currentScore = (currentDuel as Record<string, number> | null)?.[scoreField] ?? 0
    await supabase.from('duels').update({ [scoreField]: currentScore + 1 }).eq('id', duelId)
  }

  // After every answer, ask the finisher whether the duel is now complete
  const finishCheck = await checkAndFinishDuel(duelId)

  return {
    error: null,
    isCorrect,
    finished: finishCheck.finished,
    result:   finishCheck.result,
    _debug: {
      stage: 'success',
      myField,
      persistedVal,
      columnsInRow,
      payload: updatePayload,
      updatedRow,
      finishCheck,
    },
  }
}
