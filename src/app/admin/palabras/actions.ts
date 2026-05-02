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

export async function createWordPuzzle(input: {
  verse: string
  reference: string
  hidden_words: string[]
  hint: string
  available_date: string
  difficulty: 'easy' | 'medium' | 'hard'
}) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }

  const verse = input.verse.trim()
  const reference = input.reference.trim()
  const hint = input.hint.trim()
  const hidden = input.hidden_words.map(w => w.trim()).filter(Boolean)
  if (verse.length < 10) return { error: 'El versículo es muy corto' }
  if (reference.length === 0) return { error: 'Falta la referencia' }
  if (hidden.length === 0) return { error: 'Agregá al menos 1 palabra a ocultar' }

  const { error: e } = await supabase.from('word_puzzles').insert({
    verse, reference, hidden_words: hidden, hint,
    available_date: input.available_date,
    difficulty: input.difficulty,
  })
  if (e) return { error: e.message }
  revalidatePath('/admin/palabras')
  return { error: null }
}

export async function deleteWordPuzzle(id: string) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { error: e } = await supabase.from('word_puzzles').delete().eq('id', id)
  if (e) return { error: e.message }
  revalidatePath('/admin/palabras')
  return { error: null }
}
