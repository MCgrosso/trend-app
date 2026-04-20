'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Check } from 'lucide-react'

const MAX_CHARS = 100

export default function BioEditor({ userId, initialBio }: { userId: string; initialBio: string }) {
  const [bio, setBio]     = useState(initialBio)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState<string | null>(null)

  async function save() {
    if (bio === initialBio) return
    setSaving(true); setErr(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ bio }).eq('id', userId)
    setSaving(false)
    if (error) { setErr(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const remaining = MAX_CHARS - bio.length
  const overLimit = remaining < 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MessageCircle size={14} className="text-purple-400" />
        <h4 className="text-sm font-semibold text-white">Tu bio</h4>
      </div>

      <div className="relative">
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, MAX_CHARS))}
          onBlur={save}
          maxLength={MAX_CHARS}
          rows={2}
          placeholder="Contá algo sobre vos... ej: Fan de los Salmos 🙌"
          className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-cyan-400/70 rounded-xl px-3 py-2 text-white text-sm resize-none outline-none transition-colors placeholder:text-gray-500"
        />
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className={overLimit ? 'text-red-400' : remaining < 20 ? 'text-amber-400' : 'text-gray-500'}>
          {remaining} caracteres restantes
        </span>
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
