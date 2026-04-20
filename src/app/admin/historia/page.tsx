export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoriaAdmin from './HistoriaAdmin'

export default async function HistoriaAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/')

  const { data: chapters } = await supabase
    .from('story_chapters')
    .select('*')
    .order('week_start', { ascending: false })

  const { data: questions } = await supabase
    .from('questions')
    .select('id, question, story_chapter_id, category')
    .order('created_at', { ascending: false })

  return <HistoriaAdmin chapters={chapters ?? []} questions={questions ?? []} />
}
