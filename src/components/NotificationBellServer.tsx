import { createClient } from '@/lib/supabase/server'
import NotificationBell from './NotificationBell'

export default async function NotificationBellServer({ userId }: { userId: string }) {
  const supabase = await createClient()

  const [{ data: items }, { data: reads }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, title, message, type, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', userId),
  ])

  const list = (items ?? []) as Array<{
    id: string; title: string; message: string
    type: 'info' | 'warning' | 'update' | 'event' | 'maintenance'
    created_at: string
  }>
  const readIds = (reads ?? []).map(r => r.notification_id as string)

  return (
    <NotificationBell
      userId={userId}
      initialItems={list}
      initialReadIds={readIds}
    />
  )
}
