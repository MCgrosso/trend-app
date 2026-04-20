'use client'

import { useState } from 'react'
import AvatarPicker from '@/components/AvatarPicker'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { SPECIAL_AVATARS } from '@/lib/avatars'
import { BASIC_FRAMES, SPECIAL_FRAMES } from '@/lib/frames'

export default function AvatarSection({
  userId,
  avatarUrl,
  firstName,
  frame: initialFrame,
  unlockedSpecial,
  unlockedFrames,
}: {
  userId: string
  avatarUrl: string | null
  firstName: string | null
  frame: string | null
  unlockedSpecial: string[]
  unlockedFrames: string[]
}) {
  const [selectedAvatar, setSelectedAvatar] = useState(avatarUrl ?? '')
  const [selectedFrame,  setSelectedFrame]  = useState(initialFrame ?? 'white')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ avatar_url: selectedAvatar || null, frame: selectedFrame })
      .eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const hasChanges =
    selectedAvatar !== (avatarUrl ?? '') ||
    selectedFrame  !== (initialFrame  ?? 'white')

  return (
    <div className="space-y-5">
      <Avatar
        avatarUrl={selectedAvatar || null}
        firstName={firstName}
        size="lg"
        frame={selectedFrame}
        className="mx-auto"
      />

      {/* Avatares regulares */}
      <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />

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
                onClick={() => unlocked && setSelectedAvatar(a.id)}
                title={unlocked ? a.label : `Bloqueado — ${a.description}`}
                className="flex flex-col items-center gap-1.5 focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150 ${
                    !unlocked
                      ? 'opacity-30 grayscale ring-2 ring-white/10'
                      : selectedAvatar === a.id
                        ? 'ring-4 ring-white/80 scale-110 shadow-lg'
                        : 'ring-2 ring-white/20 opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: unlocked ? a.bg : '#374151' }}
                >
                  {unlocked ? a.emoji : '🔒'}
                </div>
                <span className={`text-[11px] font-medium max-w-[60px] text-center leading-tight ${
                  !unlocked ? 'text-gray-600' : selectedAvatar === a.id ? 'text-white' : 'text-gray-400'
                }`}>
                  {unlocked ? a.label : a.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Marcos básicos */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium text-center">Marcos</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {BASIC_FRAMES.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFrame(f.id)}
              title={f.label}
              className="flex flex-col items-center gap-1 focus:outline-none"
            >
              <div
                className={`w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center transition-all duration-150 ${f.cssClass} ${
                  selectedFrame === f.id
                    ? 'scale-125 brightness-110'
                    : 'opacity-60 hover:opacity-90 hover:scale-110'
                }`}
              />
              <span className={`text-[10px] max-w-[44px] text-center leading-tight ${
                selectedFrame === f.id ? 'text-white' : 'text-gray-500'
              }`}>
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Marcos especiales */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium text-center">Marcos especiales</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {SPECIAL_FRAMES.map(f => {
            const unlocked = unlockedFrames.includes(f.id)
            return (
              <button
                key={f.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && setSelectedFrame(f.id)}
                title={unlocked ? f.label : `Bloqueado — ${f.unlock}`}
                className="flex flex-col items-center gap-1 focus:outline-none"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all duration-150 ${
                    !unlocked
                      ? 'bg-gray-800 opacity-25 grayscale'
                      : `bg-gray-700 ${f.cssClass} ${
                          selectedFrame === f.id
                            ? 'scale-125 brightness-110'
                            : 'opacity-75 hover:opacity-100 hover:scale-110'
                        }`
                  }`}
                >
                  {unlocked ? f.emoji : '🔒'}
                </div>
                <span className={`text-[10px] max-w-[48px] text-center leading-tight ${
                  !unlocked ? 'text-gray-700' : selectedFrame === f.id ? 'text-white' : 'text-gray-500'
                }`}>
                  {unlocked ? f.label : f.unlock}
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
        {saving ? 'Guardando...' : saved ? '¡Guardado! ✓' : 'Guardar avatar y marco'}
      </button>
    </div>
  )
}
