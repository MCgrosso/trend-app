export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnunciosAdmin from './AnunciosAdmin'

export default async function AdminAnunciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')
  const { data: announcements } = await supabase.from('announcements').select('*').order('date', { ascending: false })
  return <AnunciosAdmin announcements={announcements ?? []} />
}
