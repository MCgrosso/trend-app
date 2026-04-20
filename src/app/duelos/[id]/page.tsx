export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DuelClient from './DuelClient'

export default async function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: duel } = await supabase
    .from('duels')
    .select(`
      *,
      challenger:profiles!duels_challenger_id_fkey(id, username, first_name, avatar_url, frame, title),
      opponent:profiles!duels_opponent_id_fkey(id, username, first_name, avatar_url, frame, title)
    `)
    .eq('id', id)
    .single()

  if (!duel) notFound()
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) notFound()

  const { data: duelQuestions } = await supabase
    .from('duel_questions')
    .select(`
      *,
      question:questions(id, question, option_a, option_b, option_c, option_d, correct_option, explanation, category)
    `)
    .eq('duel_id', id)
    .order('question_order')

  return (
    <DuelClient
      userId={user.id}
      duel={duel}
      duelQuestions={duelQuestions ?? []}
    />
  )
}
