'use server'

import { createClient } from '@/lib/supabase/server'
import { computePvpRank, isSameRank, rankMultiplier, rankOrder } from '@/lib/pvpRanks'

export type BlitzMode = 'blitz' | 'dynamic'

export async function createBlitzDuel(opponentId: string, mode: BlitzMode) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', duelId: null }
  if (opponentId === user.id) return { error: 'No podés desafiarte a vos mismo', duelId: null }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, pvp_rank, pvp_points')
    .in('id', [user.id, opponentId])

  const me = profiles?.find(p => p.id === user.id)
  const opp = profiles?.find(p => p.id === opponentId)
  if (!me || !opp) return { error: 'Perfil no encontrado', duelId: null }

  const myRank = me.pvp_rank ?? computePvpRank(me.pvp_points ?? 0).id
  const oppRank = opp.pvp_rank ?? computePvpRank(opp.pvp_points ?? 0).id
  const sameRank = isSameRank(myRank, oppRank)
  const multiplier = rankMultiplier(myRank, oppRank)

  const { data: duel, error } = await supabase
    .from('blitz_duels')
    .insert({
      challenger_id: user.id,
      opponent_id: opponentId,
      mode,
      challenger_rank: myRank,
      opponent_rank: oppRank,
      same_rank: sameRank,
      rank_multiplier: multiplier,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return { error: error.message, duelId: null }
  return { error: null, duelId: duel.id }
}

export async function acceptBlitzDuel(duelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: duel } = await supabase
    .from('blitz_duels')
    .select('*')
    .eq('id', duelId)
    .eq('opponent_id', user.id)
    .eq('status', 'pending')
    .single()

  if (!duel) return { error: 'Duelo no encontrado' }

  const { error } = await supabase
    .from('blitz_duels')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', duelId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function rejectBlitzDuel(duelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  await supabase.from('blitz_duels').delete().eq('id', duelId).eq('opponent_id', user.id).eq('status', 'pending')
  return { error: null }
}

export async function cancelBlitzDuel(duelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  await supabase.from('blitz_duels').delete().eq('id', duelId).eq('challenger_id', user.id).eq('status', 'pending')
  return { error: null }
}

export interface BlitzQuestion {
  id: string
  question: string
  option_a: string; option_b: string; option_c: string; option_d: string
  correct_option: string
  explanation: string
  category: string
}

// Devuelve N preguntas aleatorias para el modo contrarreloj. Cada jugador
// pide su propio stream — no se sincronizan preguntas entre rivales.
export async function getBlitzQuestions(limit: number = 40): Promise<{ questions: BlitzQuestion[]; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { questions: [], error: 'No autenticado' }

  const { data, error } = await supabase
    .from('questions')
    .select('id, question, option_a, option_b, option_c, option_d, correct_option, explanation, category')
    .limit(300)

  if (error || !data) return { questions: [], error: error?.message ?? 'Error consultando preguntas' }

  // Shuffle Fisher-Yates y cortar
  const arr = [...data]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return { questions: arr.slice(0, limit) as BlitzQuestion[], error: null }
}

// Resultado individual del jugador. Si ambos ya enviaron, finaliza el duelo
// y aplica la actualización de rangos vía RPC apply_blitz_result.
//
// Score = correctas. timeSurvived = segundos sobrevividos (modo dynamic; en
// blitz pasamos un "tie-breaker": menor tiempo total invertido en responder
// para desempatar — pero acá lo guardamos siempre para flexibilidad).
export async function submitBlitzResult(
  duelId: string,
  score: number,
  timeSurvived: number,
): Promise<{
  error: string | null
  finished: boolean
  myWon: boolean | null
  isDraw: boolean
  myDelta: number | null
  oppDelta: number | null
  oldRank: string | null
  newRank: string | null
  rankedUp: boolean
  oppScore: number | null
  oppTimeSurvived: number | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return blankErr('No autenticado')

  const { data: duel } = await supabase
    .from('blitz_duels')
    .select('*')
    .eq('id', duelId)
    .single()
  if (!duel) return blankErr('Duelo no encontrado')

  const isChallenger = duel.challenger_id === user.id
  if (!isChallenger && duel.opponent_id !== user.id) return blankErr('No participás en este duelo')

  const updatePayload: Record<string, number | boolean | string> = isChallenger
    ? { challenger_score: score, challenger_time_survived: timeSurvived, challenger_finished: true }
    : { opponent_score: score, opponent_time_survived: timeSurvived, opponent_finished: true }

  console.log('[submitBlitzResult] update', { duelId, userId: user.id, isChallenger, payload: updatePayload })

  const { data: updRow, error: updErr } = await supabase
    .from('blitz_duels')
    .update(updatePayload)
    .eq('id', duelId)
    .select('id, challenger_score, opponent_score, challenger_finished, opponent_finished, challenger_time_survived, opponent_time_survived')
    .maybeSingle()

  if (updErr) {
    console.error('[submitBlitzResult] update FAIL:', updErr)
    return blankErr(`Error al guardar puntaje: ${updErr.message}`)
  }
  if (!updRow) {
    console.error('[submitBlitzResult] update no devolvió fila — posible RLS bloqueando o duelo inexistente')
    return blankErr('No se pudo guardar el puntaje (RLS o duelo inexistente)')
  }
  console.log('[submitBlitzResult] update ✓ row:', updRow)

  // Re-fetch state to see if both done
  const { data: refreshed } = await supabase
    .from('blitz_duels')
    .select('*')
    .eq('id', duelId)
    .single()
  if (!refreshed) return blankErr('Error releyendo duelo')

  const bothDone = !!refreshed.challenger_finished && !!refreshed.opponent_finished

  if (!bothDone) {
    return {
      error: null, finished: false,
      myWon: null, isDraw: false, myDelta: null, oppDelta: null,
      oldRank: null, newRank: null, rankedUp: false,
      oppScore: null, oppTimeSurvived: null,
    }
  }

  // Ambos terminaron — calcular ganador (idempotente: si ya estaba finished,
  // el RPC apply_blitz_result devuelve already_applied y leemos los deltas
  // ya guardados)
  let winnerId: string | null = null

  if (refreshed.status !== 'finished') {
    const chS = refreshed.challenger_score
    const opS = refreshed.opponent_score
    const chT = refreshed.challenger_time_survived
    const opT = refreshed.opponent_time_survived

    if (refreshed.mode === 'blitz') {
      // Mayor score gana; empate → menor tiempo (tie-breaker)
      if (chS > opS) winnerId = refreshed.challenger_id
      else if (opS > chS) winnerId = refreshed.opponent_id
      else if (chT > 0 && opT > 0 && chT !== opT) winnerId = chT < opT ? refreshed.challenger_id : refreshed.opponent_id
      else winnerId = null
    } else {
      // dynamic: gana quien sobrevivió más; si empata, gana quien más correctas
      if (chT > opT) winnerId = refreshed.challenger_id
      else if (opT > chT) winnerId = refreshed.opponent_id
      else if (chS > opS) winnerId = refreshed.challenger_id
      else if (opS > chS) winnerId = refreshed.opponent_id
      else winnerId = null
    }

    await supabase
      .from('blitz_duels')
      .update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() })
      .eq('id', duelId)
      .eq('status', 'active')
  } else {
    winnerId = refreshed.winner_id
  }

  await supabase.rpc('apply_blitz_result', { p_duel_id: duelId })

  // Releer el duelo final con los deltas persistidos
  const { data: finalDuel } = await supabase
    .from('blitz_duels')
    .select('*')
    .eq('id', duelId)
    .single()

  const myDelta = isChallenger ? finalDuel?.challenger_points_delta ?? 0 : finalDuel?.opponent_points_delta ?? 0
  const oppDelta = isChallenger ? finalDuel?.opponent_points_delta ?? 0 : finalDuel?.challenger_points_delta ?? 0
  const oppScore = isChallenger ? finalDuel?.opponent_score ?? 0 : finalDuel?.challenger_score ?? 0
  const oppTimeSurvived = isChallenger ? finalDuel?.opponent_time_survived ?? 0 : finalDuel?.challenger_time_survived ?? 0
  const winner = finalDuel?.winner_id ?? null
  const isDraw = winner === null
  const myWon = winner !== null && winner === user.id

  // Calcular rankedUp desde el rango pre-duelo (almacenado al crear) vs el rango actual.
  // Esto funciona tanto para el primer-finalizador como para el segundo (que ve already_applied).
  const myRankBefore = (isChallenger ? finalDuel?.challenger_rank : finalDuel?.opponent_rank) as string | null
  const { data: meProfile } = await supabase
    .from('profiles')
    .select('pvp_rank')
    .eq('id', user.id)
    .single()
  const myRankAfter = (meProfile?.pvp_rank as string | null) ?? null

  const rankedUp = myWon && !!myRankBefore && !!myRankAfter
    && rankOrder(myRankAfter) > rankOrder(myRankBefore)
  const newRank = rankedUp ? myRankAfter : null
  const oldRank = rankedUp ? myRankBefore : null

  // Insertar notificación personal solo cuando se detecta el cambio de rango.
  // Se evita el duplicado para el primer-finalizador haciendo el chequeo idempotente:
  // si ya existe una notificación con el mismo title para este user dentro del último
  // minuto, no se inserta otra.
  if (rankedUp && newRank) {
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString()
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('title', `¡Subiste a ${newRank}!`)
      .gte('created_at', oneMinAgo)
      .limit(1)

    if (!existing || existing.length === 0) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: `¡Subiste a ${newRank}!`,
        message: `Acabás de alcanzar el rango ${newRank} en duelos PVP. ¡Seguí así!`,
        type: 'event',
        is_global: false,
      })
    }
  }

  return {
    error: null,
    finished: true,
    myWon,
    isDraw,
    myDelta,
    oppDelta,
    oldRank,
    newRank,
    rankedUp,
    oppScore,
    oppTimeSurvived,
  }
}

function blankErr(msg: string) {
  return {
    error: msg, finished: false,
    myWon: null, isDraw: false, myDelta: null, oppDelta: null,
    oldRank: null, newRank: null, rankedUp: false,
    oppScore: null, oppTimeSurvived: null,
  }
}
