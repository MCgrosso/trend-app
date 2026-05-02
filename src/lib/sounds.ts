let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function playSuccess() {
  const c = getCtx()
  if (!c) return
  try {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = c.currentTime + i * 0.12
      gain.gain.setValueAtTime(0.22, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      osc.start(t)
      osc.stop(t + 0.25)
    })
  } catch {}
}

export function playError() {
  const c = getCtx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(280, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.4)
    gain.gain.setValueAtTime(0.18, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + 0.4)
  } catch {}
}

export function playTick() {
  const c = getCtx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'square'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.07, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + 0.06)
  } catch {}
}

// ── Sonidos del evento Valle de Elá (RPG batalla) ──────────────────────────
export function playDamageDealt() {
  const c = getCtx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(660, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, c.currentTime + 0.15)
    gain.gain.setValueAtTime(0.22, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + 0.18)
  } catch {}
}

export function playDamageTaken() {
  const c = getCtx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(110, c.currentTime + 0.25)
    gain.gain.setValueAtTime(0.2, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + 0.3)
  } catch {}
}

export function playBattleVictory() {
  const c = getCtx()
  if (!c) return
  try {
    // Arpegio C-E-G-C-E ascendente
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      osc.type = i < 3 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      const t = c.currentTime + i * 0.14
      gain.gain.setValueAtTime(0.22, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
      osc.start(t)
      osc.stop(t + 0.32)
    })
  } catch {}
}

export function playBattleDefeat() {
  const c = getCtx()
  if (!c) return
  try {
    // Acorde menor descendente
    [392.0, 311.13, 261.63].forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      const t = c.currentTime + i * 0.18
      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
      osc.start(t)
      osc.stop(t + 0.45)
    })
  } catch {}
}

export function playReflectionSaved() {
  const c = getCtx()
  if (!c) return
  try {
    [783.99, 1046.5].forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = c.currentTime + i * 0.1
      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch {}
}
