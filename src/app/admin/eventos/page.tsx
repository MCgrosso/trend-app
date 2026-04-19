export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventosAdmin from './EventosAdmin'

export default async function AdminEventosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')
  const { data: events } = await supabase.from('events').select('*').order('event_date', { ascending: false })
  return <EventosAdmin events={events ?? []} />
}
