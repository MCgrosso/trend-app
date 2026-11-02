'use client'

import { useState } from 'react'
import { Check, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import FullBodyAvatar from '@/components/FullBodyAvatar'
import type { Character, FullBodyState } from '@/lib/character'

const OPTIONS: { value: Character; label: string }[] = [
  { value: 'chico', label: 'Chico' },
  { value: 'chica', label: 'Chica' },
]

export default function CharacterPicker({
  userId,
  initialCharacter,
}: {
  userId: string
  initialCharacter: Character
}) {
  const [character, setCharacter] = useState<Character>(initialCharacter)
  const [anim, setAnim]     = useState<FullBodyState>('idle')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [err, setErr]       = useState<string | null>(null)

  async function choose(value: Character) {
    if (value === character || saving) return
    const prev = character
    setCharacter(value)
    setAnim('win')
    setTimeout(() => setAnim('idle'), 900)
    setSaving(true); setErr(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ character: value })
      .eq('id', userId)
    setSaving(false)
    if (error) { setErr(error.message); setCharacter(prev); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <User size={14} className="text-amber-400" />
        <h4 className="text-sm font-semibold text-white">Tu personaje en los duelos</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(opt => {
          const active = character === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              aria-pressed={active}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 pt-4 pb-2 transition-all ${
                active
                  ? 'border-amber-400/80 bg-amber-400/10'
                  : 'border-purple-700/40 bg-[#0a071e] hover:border-purple-500/70 opacity-70 hover:opacity-100'
              }`}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                  <Check size={12} className="text-[#0a071e]" />
                </span>
              )}
              <FullBodyAvatar character={opt.value} state={active ? anim : 'idle'} scale={2} />
              <span className={`text-sm font-semibold ${active ? 'text-amber-300' : 'text-gray-300'}`}>{opt.label}</span>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end items-center text-xs h-4">
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
