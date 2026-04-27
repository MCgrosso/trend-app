export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import IglesiasClient from './IglesiasClient'

export default async function AdminIglesiasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/')

  const [
    { data: pendingChurches },
    { data: rejectedChurches },
    { data: ranking },
    { data: predefinedClans },
    { data: requestedByProfiles },
  ] = await Promise.all([
    supabase.from('churches').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('churches').select('*').eq('status', 'rejected').order('created_at', { ascending: false }),
    supabase.rpc('get_church_ranking'),
    supabase.from('clans').select('*').eq('is_predefined', true).order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, username, first_name'),
  ])

  // Build a quick lookup for the requester profiles (small set is fine)
  const profileMap = new Map<string, { username: string; first_name: string }>()
  for (const p of requestedByProfiles ?? []) {
    profileMap.set(p.id, { username: p.username, first_name: p.first_name })
  }

  const pendingWithRequester = (pendingChurches ?? []).map(c => ({
    ...c,
    requester: c.requested_by ? profileMap.get(c.requested_by) ?? null : null,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center justify-between">
        <Logo size="sm" />
        <span className="text-xs text-yellow-400 bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 rounded-full">
          Panel Admin
        </span>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-5 pb-8">
        <div>
          <Link href="/admin" className="text-gray-400 text-xs hover:text-gray-200">← Panel</Link>
          <h1 className="text-2xl font-bold text-white mt-1">Iglesias y Clanes</h1>
          <p className="text-gray-400 text-sm mt-1">Solicitudes, ranking de iglesias y clanes oficiales</p>
        </div>

        <IglesiasClient
          pending={pendingWithRequester}
          rejected={rejectedChurches ?? []}
          ranking={ranking ?? []}
          predefinedClans={predefinedClans ?? []}
        />
      </div>
    </div>
  )
}
