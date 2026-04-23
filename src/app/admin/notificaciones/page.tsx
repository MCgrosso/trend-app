export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificacionesAdmin from './NotificacionesAdmin'

export default async function AdminNotificacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, message, type, is_global, created_at')
    .order('created_at', { ascending: false })

  return <NotificacionesAdmin notifications={notifications ?? []} />
}
