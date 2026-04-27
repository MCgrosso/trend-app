'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function selectChurch(churchId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const update: { church_id: string | null; clan_id?: null } = { church_id: churchId }
  // If user changes church, clear clan (clans belong to a church).
  if (churchId === null) update.clan_id = null

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
  if (error) return { error: error.message }

  // If switching to a new church, also clear clan_id (in case the old clan
  // belongs to a different church).
  if (churchId !== null) {
    const { data: prof } = await supabase.from('profiles').select('clan_id').eq('id', user.id).single()
    if (prof?.clan_id) {
      const { data: clan } = await supabase.from('clans').select('church_id').eq('id', prof.clan_id).single()
      if (clan && clan.church_id !== churchId) {
        await supabase.from('profiles').update({ clan_id: null }).eq('id', user.id)
      }
    }
  }

  revalidatePath('/profile')
  return { error: null }
}

export async function selectClan(clanId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (clanId !== null) {
    // Verify clan belongs to user's church
    const { data: prof } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()
    if (!prof?.church_id) return { error: 'Tenés que elegir tu iglesia primero' }
    const { data: clan } = await supabase.from('clans').select('church_id').eq('id', clanId).single()
    if (!clan) return { error: 'Clan no encontrado' }
    if (clan.church_id !== prof.church_id) return { error: 'Ese clan no pertenece a tu iglesia' }
  }

  const { error } = await supabase.from('profiles').update({ clan_id: clanId }).eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { error: null }
}

export async function requestNewChurch(input: { name: string; abbreviation?: string; description?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const name = input.name.trim()
  if (name.length < 3) return { error: 'El nombre debe tener al menos 3 caracteres' }
  if (name.length > 80) return { error: 'El nombre es demasiado largo' }

  const { error } = await supabase.from('churches').insert({
    name,
    abbreviation: input.abbreviation?.trim() || null,
    description: input.description?.trim() || null,
    status: 'pending',
    requested_by: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { error: null }
}

export async function createClan(input: {
  name: string
  shield_color: string
  shield_bg: string
  shield_icon: string
  joinAfter?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', clanId: null }

  const name = input.name.trim()
  if (name.length < 3) return { error: 'El nombre debe tener al menos 3 caracteres', clanId: null }
  if (name.length > 40) return { error: 'El nombre es demasiado largo', clanId: null }

  // Determine the user's church (clan must belong to one)
  const { data: prof } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()
  if (!prof?.church_id) return { error: 'Elegí tu iglesia antes de crear un clan', clanId: null }

  const { data: clan, error } = await supabase
    .from('clans')
    .insert({
      name,
      church_id: prof.church_id,
      shield_color: input.shield_color,
      shield_bg: input.shield_bg,
      shield_icon: input.shield_icon,
      created_by: user.id,
      is_predefined: false,
    })
    .select('id')
    .single()
  if (error) return { error: error.message, clanId: null }

  if (input.joinAfter && clan) {
    await supabase.from('profiles').update({ clan_id: clan.id }).eq('id', user.id)
  }

  revalidatePath('/profile')
  return { error: null, clanId: clan?.id ?? null }
}
