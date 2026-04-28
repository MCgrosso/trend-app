'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import Confetti from '@/components/Confetti'
import { createClient } from '@/lib/supabase/client'
import type { SpecialAvatar } from '@/lib/avatars'

export default function AvatarUnlockedModal({
  avatar,
  userId,
  onClose,
  onEquipped,
}: {
  avatar: SpecialAvatar
  userId: string
  onClose: () => void
  onEquipped?: (avatarId: string) => void
}) {
  const [equipping, setEquipping] = useState(false)
  const [equipped,  setEquipped]  = useState(false)

  async function equip() {
    setEquipping(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ avatar_url: avatar.id }).eq('id', userId)
    setEquipping(false)
    setEquipped(true)
    onEquipped?.(avatar.id)
    setTimeout(onClose, 900)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Confetti active />
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#1a0a4e] via-[#0f0a2e] to-[#1a0a4e] border-2 border-amber-400/60 rounded-3xl p-6 text-center animate-bounce-in shadow-[0_0_60px_rgba(245,158,11,0.45)]">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-amber-500 text-stone-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
          <Sparkles size={12} /> Nuevo desbloqueo
        </div>

        <h2 className="font-bebas text-3xl text-white leading-none mt-3">¡NUEVO AVATAR DESBLOQUEADO! 🎉</h2>

        {/* Big avatar */}
        <div className="mt-5 flex justify-center">
          <div
            className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-amber-400/70 shadow-[0_0_40px_rgba(245,158,11,0.6)] animate-float relative"
            style={{ backgroundColor: avatar.bg }}
          >
            {avatar.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.image} alt={avatar.label} className="w-full h-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-6xl">{avatar.emoji}</span>
            )}
          </div>
        </div>

        <p className="mt-4 text-amber-200 font-bold text-2xl" style={{ fontFamily: 'serif' }}>{avatar.label}</p>
        {avatar.chapterUnlock && (
          <p className="text-amber-300/70 text-xs mt-1">Recompensa por completar {avatar.chapterUnlock.book} {avatar.chapterUnlock.chapter}</p>
        )}

        <div className="mt-6 space-y-2">
          <button
            onClick={equip}
            disabled={equipping || equipped}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-60 text-stone-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-900/40"
          >
            {equipped ? '¡Equipado! ✓' : equipping ? 'Equipando…' : '✨ Equipar ahora'}
          </button>
          <button
            onClick={onClose}
            disabled={equipping}
            className="w-full text-amber-200/70 hover:text-amber-100 text-sm py-2 transition-colors"
          >
            Ver después
          </button>
        </div>
      </div>
    </div>
  )
}
