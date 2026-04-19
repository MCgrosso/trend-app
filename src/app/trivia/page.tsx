export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TriviaClient from './TriviaClient'
import Logo from '@/components/Logo'

export default async function TriviaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('available_date', today)
    .order('created_at')

  console.log('[trivia] today:', today)
  console.log('[trivia] questions count:', questions?.length ?? 0)
  console.log('[trivia] questions error:', JSON.stringify(questionsError, null, 2))
  console.log('[trivia] supabase url:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...')
  console.log('[trivia] anon key present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const { data: answeredRaw } = await supabase
    .from('answers')
    .select('question_id, selected_option, is_correct')
    .eq('user_id', user.id)

  const answeredMap: Record<string, { selected_option: string; is_correct: boolean }> = {}
  for (const a of answeredRaw ?? []) {
    answeredMap[a.question_id] = { selected_option: a.selected_option, is_correct: a.is_correct }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Logo size="sm" />
        <h1 className="text-2xl font-bold text-white mt-4">Trivias de hoy</h1>
        <p className="text-gray-400 text-sm">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      <div className="px-4 max-w-lg mx-auto pb-8">
        {!questions || questions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📖</div>
            <h2 className="text-xl font-semibold text-white mb-2">No hay preguntas hoy</h2>
            <p className="text-gray-400 text-sm">El admin todavía no cargó las trivias de hoy. ¡Volvé más tarde!</p>
          </div>
        ) : (
          <TriviaClient
            questions={questions}
            answeredMap={answeredMap}
          />
        )}
      </div>
    </div>
  )
}
