'use client'

import { useState } from 'react'
import AvatarPicker from '@/components/AvatarPicker'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { SPECIAL_AVATARS } from '@/lib/avatars'
import { BASIC_FRAMES, SPECIAL_FRAMES } from '@/lib/frames'
import { BASIC_BGS, SPECIAL_BGS } from '@/lib/avatarBackgrounds'

export default function AvatarSection({
  userId,
  avatarUrl,
  firstName,
  frame: initialFrame,
  avatarBg: initialBg,
  unlockedSpecial,
  unlockedFrames,
  unlockedBgs,
}: {
  userId: string
  avatarUrl: string | null
  firstName: string | null
  frame: string | null
  avatarBg: string | null
  unlockedSpecial: string[]
  unlockedFrames: string[]
  unlockedBgs: string[]
}) {
  const [tab, setTab] = useState<'avatar' | 'marco' | 'fondo'>('avatar')
  const [selectedAvatar, setSelectedAvatar] = useState(avatarUrl ?? '')
  const [selectedFrame,  setSelectedFrame]  = useState(initialFrame ?? 'white')
  const [selectedBg,     setSelectedBg]     = useState(initialBg ?? 'purple')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({
        avatar_url: selectedAvatar || null,
        frame: selectedFrame,
        avatar_bg: selectedBg,
      })
      .eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const hasChanges =
    selectedAvatar !== (avatarUrl ?? '') ||
    selectedFrame  !== (initialFrame ?? 'white') ||
    selectedBg     !== (initialBg ?? 'purple')

  return (
    <div className="space-y-4">
      {/* Vista previa */}
      <Avatar
        avatarUrl={selectedAvatar || null}
        firstName={firstName}
        size="lg"
        frame={selectedFrame}
        bg={selectedBg}
        className="mx-auto"
      />

      {/* Pestañas */}
      <div className="flex gap-1 p-1 bg-gray-900/60 rounded-xl border border-gray-700/50">
        {([
          ['avatar', 'Avatar'],
          ['marco',  'Marco'],
          ['fondo',  'Fondo'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Pestaña Avatar ── */}
      {tab === 'avatar' && (
        <div className="space-y-4">
          <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />

          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium text-center">Avatares especiales</p>
            <div className="flex gap-4 justify-center flex-wrap">
              {SPECIAL_AVATARS.map(a => {
                const unlocked = unlockedSpecial.includes(a.id)
                const lockedLabel = a.chapterUnlock
                  ? `Completá ${a.chapterUnlock.book} ${a.chapterUnlock.chapter}`
                  : a.description
                return (
                  <button
                    key={a.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setSelectedAvatar(a.id)}
                    title={unlocked ? a.label : `Bloqueado — ${lockedLabel}`}
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150 overflow-hidden ${
                        !unlocked
                          ? 'opacity-30 grayscale ring-2 ring-white/10'
                          : selectedAvatar === a.id
                            ? 'ring-4 ring-white/80 scale-110 shadow-lg'
                            : 'ring-2 ring-white/20 opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: unlocked ? a.bg : '#374151' }}
                    >
                      {!unlocked ? (
                        <span>🔒</span>
                      ) : a.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.image} alt={a.label} className="w-full h-full object-cover" />
                      ) : (
                        <span>{a.emoji}</span>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium max-w-[72px] text-center leading-tight ${
                      !unlocked ? 'text-gray-600' : selectedAvatar === a.id ? 'text-white' : 'text-gray-400'
                    }`}>
                      {unlocked ? a.label : lockedLabel}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Pestaña Marco ── */}
      {tab === 'marco' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium text-center">Marcos básicos</p>
            <div className="grid grid-cols-4 gap-3">
              {BASIC_FRAMES.map(f => {
                const active = selectedFrame === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFrame(f.id)}
                    className="flex flex-col items-center gap-2 focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center transition-all duration-150 ${
                        active ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ boxShadow: `0 0 0 ${active ? '4px' : '3px'} ${f.previewColor}` }}
                    >
                      {active && <span className="text-white text-lg font-bold">✓</span>}
                    </div>
                    <span className={`text-[11px] text-center leading-tight ${
                      active ? 'text-white font-semibold' : 'text-gray-500'
                    }`}>
                      {f.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium text-center">Marcos especiales</p>
            <div className="grid grid-cols-3 gap-3">
              {SPECIAL_FRAMES.map(f => {
                const unlocked = unlockedFrames.includes(f.id)
                const active   = selectedFrame === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setSelectedFrame(f.id)}
                    className="flex flex-col items-center gap-2 focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150 ${
                        !unlocked
                          ? 'bg-gray-800 opacity-25 grayscale'
                          : `bg-gray-800 ${f.cssClass} ${active ? 'scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'}`
                      }`}
                    >
                      {!unlocked ? '🔒' : active ? '✓' : f.emoji}
                    </div>
                    <div className="text-center">
                      <p className={`text-[11px] font-medium leading-tight ${
                        !unlocked ? 'text-gray-700' : active ? 'text-white font-semibold' : 'text-gray-400'
                      }`}>
                        {f.emoji} {f.label}
                      </p>
                      {!unlocked && (
                        <p className="text-[10px] text-gray-600 leading-tight mt-0.5">{f.unlock}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Pestaña Fondo ── */}
      {tab === 'fondo' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium text-center">Fondos básicos</p>
            <div className="grid grid-cols-4 gap-3">
              {BASIC_BGS.map(b => {
                const active = selectedBg === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBg(b.id)}
                    className="flex flex-col items-center gap-2 focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 ${b.cssClass} ${
                        active ? 'scale-110 ring-4 ring-white/80 shadow-lg' : 'opacity-80 hover:opacity-100 hover:scale-105 ring-2 ring-white/20'
                      }`}
                    >
                      {active && <span className="text-white text-lg font-bold drop-shadow">✓</span>}
                    </div>
                    <span className={`text-[11px] text-center leading-tight ${
                      active ? 'text-white font-semibold' : 'text-gray-500'
                    }`}>
                      {b.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium text-center">Fondos especiales</p>
            <div className="grid grid-cols-3 gap-3">
              {SPECIAL_BGS.map(b => {
                const unlocked = unlockedBgs.includes(b.id)
                const active   = selectedBg === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setSelectedBg(b.id)}
                    className="flex flex-col items-center gap-2 focus:outline-none"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150 overflow-hidden relative ${
                        !unlocked
                          ? 'bg-gray-800 opacity-25 grayscale'
                          : `${b.cssClass} ${active ? 'scale-110 ring-4 ring-white/80' : 'opacity-80 hover:opacity-100 hover:scale-105 ring-2 ring-white/20'}`
                      }`}
                    >
                      <span className="relative z-10">{!unlocked ? '🔒' : active ? '✓' : b.emoji}</span>
                    </div>
                    <div className="text-center">
                      <p className={`text-[11px] font-medium leading-tight ${
                        !unlocked ? 'text-gray-700' : active ? 'text-white font-semibold' : 'text-gray-400'
                      }`}>
                        {b.emoji} {b.label}
                      </p>
                      {!unlocked && (
                        <p className="text-[10px] text-gray-600 leading-tight mt-0.5">{b.unlock}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
      >
        {saving ? 'Guardando...' : saved ? '¡Guardado! ✓' : 'Guardar cambios'}
      </button>
    </div>
  )
}
