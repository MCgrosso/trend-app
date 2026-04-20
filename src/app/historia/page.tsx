export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoryIntro from './StoryIntro'
import Link from 'next/link'
import { Scroll } from 'lucide-react'

export default async function HistoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get the active chapter
  const { data: chapter } = await supabase
    .from('story_chapters')
    .select('*')
    .eq('is_active', true)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!chapter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0f0a] via-[#2a1a0f] to-[#0f0a05] flex flex-col items-center justify-center px-6 text-center">
        <Scroll size={48} className="text-yellow-500/60 mb-4" />
        <h1 className="text-2xl font-bold text-yellow-200">Sin capítulo esta semana</h1>
        <p className="text-yellow-200/70 text-sm mt-2 max-w-xs">
          El próximo capítulo del Modo Historia estará disponible pronto. Volvé en unos días 📜
        </p>
        <Link href="/" className="mt-6 px-5 py-2.5 bg-yellow-700/40 hover:bg-yellow-700/60 border border-yellow-600/40 text-yellow-100 rounded-xl text-sm font-medium transition-colors">
          Volver al inicio
        </Link>
      </div>
    )
  }

  // How many questions does this chapter have, and how many has the user answered
  const [
    { count: totalQs },
    { data: myAnswers },
  ] = await Promise.all([
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('story_chapter_id', chapter.id),
    supabase
      .from('story_answers')
      .select('question_id, is_correct')
      .eq('user_id', user.id)
      .eq('chapter_id', chapter.id),
  ])

  const answered     = myAnswers?.length ?? 0
  const correctCount = myAnswers?.filter(a => a.is_correct).length ?? 0
  const completed    = (totalQs ?? 0) > 0 && answered >= (totalQs ?? 0)

  return (
    <StoryIntro
      chapter={chapter}
      completed={completed}
      correctCount={correctCount}
      totalQuestions={totalQs ?? 0}
    />
  )
}
