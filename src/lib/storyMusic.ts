// Soft chime for "chapter complete" — short, generated tone (no asset needed)

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    ctx = new Ctx()
  }
  return ctx
}

export function playChime() {
  if (typeof window === 'undefined') return
  const c = getCtx()
  if (c.state === 'suspended') c.resume()
  const now = c.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  notes.forEach((f, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(0, now + i * 0.12)
    g.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.9)
    o.connect(g).connect(c.destination)
    o.start(now + i * 0.12)
    o.stop(now + i * 0.12 + 1)
  })
}
