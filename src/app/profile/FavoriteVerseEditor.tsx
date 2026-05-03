'use client'

import { useState } from 'react'
import { BookOpen, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MAX_VERSE = 280
const MAX_REF   = 60

export default function FavoriteVerseEditor({
  userId,
  initialVerse,
  initialRef,
}: {
  userId: string
  initialVerse: string
  initialRef: string
}) {
  const [verse, setVerse] = useState(initialVerse)
  const [ref, setRef]     = useState(initialRef)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [err, setErr]       = useState<string | null>(null)

  async function save() {
    if (verse === initialVerse && ref === initialRef) return
    setSaving(true); setErr(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ favorite_verse: verse.trim(), favorite_verse_ref: ref.trim() })
      .eq('id', userId)
    setSaving(false)
    if (error) { setErr(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <BookOpen size={14} className="text-amber-400" />
        <h4 className="text-sm font-semibold text-white">Tu versículo favorito</h4>
      </div>

      <textarea
        value={verse}
        onChange={e => setVerse(e.target.value.slice(0, MAX_VERSE))}
        onBlur={save}
        rows={2}
        placeholder='Ej: "Todo lo puedo en Cristo que me fortalece"'
        className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-amber-400/70 rounded-xl px-3 py-2 text-white text-sm resize-none outline-none placeholder:text-gray-500"
        style={{ fontFamily: 'serif' }}
      />
      <input
        value={ref}
        onChange={e => setRef(e.target.value.slice(0, MAX_REF))}
        onBlur={save}
        placeholder="Referencia (ej: Filipenses 4:13)"
        className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-amber-400/70 rounded-xl px-3 py-2 text-white text-sm outline-none placeholder:text-gray-500"
      />

      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500">{verse.length}/{MAX_VERSE} · ref {ref.length}/{MAX_REF}</span>
        {saving && <span className="text-purple-300">Guardando...</span>}
        {saved && (
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Check size={12} /> Guardado
          </span>
        )}
        {err && <span className="text-red-400">{err}</span>}
      </div>
    </div>
  )
}
