'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'No autenticado' as const }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role !== 'admin') return { supabase, error: 'No autorizado' as const }
  return { supabase, error: null as null }
}

export async function approveChurch(id: string) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { error: e } = await supabase.from('churches').update({ status: 'approved' }).eq('id', id)
  if (e) return { error: e.message }
  revalidatePath('/admin/iglesias')
  revalidatePath('/profile')
  return { error: null }
}

export async function rejectChurch(id: string) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { error: e } = await supabase.from('churches').update({ status: 'rejected' }).eq('id', id)
  if (e) return { error: e.message }
  revalidatePath('/admin/iglesias')
  return { error: null }
}

export async function deleteChurch(id: string) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { error: e } = await supabase.from('churches').delete().eq('id', id)
  if (e) return { error: e.message }
  revalidatePath('/admin/iglesias')
  return { error: null }
}

export async function createPredefinedClan(input: {
  name: string
  church_id: string
  shield_color: string
  shield_bg: string
  shield_icon: string
}) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { data: { user } } = await supabase.auth.getUser()
  const { error: e } = await supabase.from('clans').insert({
    name: input.name.trim(),
    church_id: input.church_id,
    shield_color: input.shield_color,
    shield_bg: input.shield_bg,
    shield_icon: input.shield_icon,
    is_predefined: true,
    created_by: user?.id ?? null,
  })
  if (e) return { error: e.message }
  revalidatePath('/admin/iglesias')
  return { error: null }
}

export async function deleteClan(id: string) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { error: e } = await supabase.from('clans').delete().eq('id', id)
  if (e) return { error: e.message }
  revalidatePath('/admin/iglesias')
  return { error: null }
}
