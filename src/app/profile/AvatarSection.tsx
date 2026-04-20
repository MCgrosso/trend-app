'use client'

import { useState } from 'react'
import AvatarPicker from '@/components/AvatarPicker'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { SPECIAL_AVATARS } from '@/lib/avatars'

export default function AvatarSection({
  userId,
  avatarUrl,
  firstName,
  unlockedSpecial,
}: {
  userId: string
  avatarUrl: string | null
  firstName: string | null
  unlockedSpecial: string[]
}) {
  const [selected, setSelected] = useState(avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ avatar_url: selected || null })
      .eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const hasChanges = selected !== (avatarUrl ?? '')

  return (
    <div className="space-y-5">
      <Avatar avatarUrl={selected || null} firstName={firstName} size="lg" className="mx-auto" />

      <AvatarPicker selected={selected} onSelect={setSelected} />

      {/* Avatares especiales */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium text-center">Avatares especiales</p>
        <div className="flex gap-4 justify-center flex-wrap">
          {SPECIAL_AVATARS.map(a => {
            const unlocked = unlockedSpecial.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setSelected(a.id)}
                title={unlocked ? a.label : `Bloqueado — ${a.description}`}
                className="flex flex-col items-center gap-1.5 focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150 relative ${
                    !unlocked
                      ? 'opacity-30 grayscale ring-2 ring-white/10'
                      : selected === a.id
                      ? 'ring-4 ring-white/80 scale-110 shadow-lg'
                      : 'ring-2 ring-white/20 opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: unlocked ? a.bg : '#374151' }}
                >
                  {unlocked ? a.emoji : '🔒'}
                </div>
                <span className={`text-[11px] font-medium transition-colors max-w-[60px] text-center leading-tight ${
                  !unlocked ? 'text-gray-600' : selected === a.id ? 'text-white' : 'text-gray-400'
                }`}>
                  {unlocked ? a.label : a.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
      >
        {saving ? 'Guardando...' : saved ? '¡Avatar guardado! ✓' : 'Guardar avatar'}
      </button>
    </div>
  )
}
