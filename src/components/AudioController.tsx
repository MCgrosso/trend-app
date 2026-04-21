'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getAudioManager, BgTrack } from '@/lib/audioManager'

function trackForRoute(pathname: string): BgTrack | 'duel-page' {
  if (pathname.startsWith('/historia')) return 'historia'
  if (pathname.startsWith('/duelos/'))  return 'duel-page'  // DuelClient owns audio
  return 'main'                                              // everything else
}

export default function AudioController() {
  const pathname = usePathname()

  useEffect(() => {
    const am = getAudioManager()
    if (!am) return
    const target = trackForRoute(pathname)
    // For /duelos/[id], DuelClient is responsible — don't touch
    if (target === 'duel-page') return
    am.setBackgroundTrack(target)
  }, [pathname])

  return null
}
