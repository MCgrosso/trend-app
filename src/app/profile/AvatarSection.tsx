'use client'

import { useState } from 'react'
import AvatarPicker from '@/components/AvatarPicker'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'

export default function AvatarSection({
  userId,
  avatarUrl,
  firstName,
}: {
  userId: string
  avatarUrl: string | null
  firstName: string | null
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
