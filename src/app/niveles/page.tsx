export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NivelesClient from './NivelesClient'

export default async function NivelesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, level')
    .eq('id', user.id)
    .single()

  return (
    <NivelesClient
      totalXp={profile?.xp ?? 0}
      currentLevel={profile?.level ?? 1}
    />
  )
}
