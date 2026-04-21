'use client'

import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { getAudioManager } from '@/lib/audioManager'

export default function MusicToggle() {
  const [muted, setMuted]     = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const am = getAudioManager()
    if (!am) return
    setMuted(am.isMuted())
    setMounted(true)
    return am.subscribe(() => setMuted(am.isMuted()))
  }, [])

  if (!mounted) return null

  function toggle() {
    const am = getAudioManager()
    am?.setMuted(!am.isMuted())
  }

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Activar música' : 'Silenciar música'}
      className="fixed top-4 right-4 z-40 w-9 h-9 rounded-full bg-[#0f0a2e]/85 backdrop-blur-md border border-purple-500/40 flex items-center justify-center text-purple-300 hover:text-cyan-300 hover:border-cyan-400/60 transition-all shadow-lg shadow-purple-900/30"
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </button>
  )
}
