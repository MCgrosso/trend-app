'use client'

import { useEffect } from 'react'
import { getAudioManager } from '@/lib/audioManager'

export default function EventosMusic() {
  useEffect(() => {
    const am = getAudioManager()
    if (!am) return
    // Switch to the event track. The AudioManager handles autoplay policy
    // internally: if the browser blocks playback before any user gesture,
    // it waits for the next click/touch/keydown and resumes.
    am.setBackgroundTrack('dyg')

    // Restore the default track when the user leaves /eventos.
    return () => {
      const am2 = getAudioManager()
      am2?.setBackgroundTrack('main')
    }
  }, [])

  return null
}
