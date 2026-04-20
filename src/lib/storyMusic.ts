// Soft ambient pad — sustained C major triad with slow LFO movement.
// Pure Web Audio, no external files.

let ctx:        AudioContext | null = null
let oscs:       OscillatorNode[]    = []
let gains:      GainNode[]          = []
let masterGain: GainNode | null     = null
let lfoOsc:     OscillatorNode | null = null
let lfoGain:    GainNode | null     = null
let isPlaying = false

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    ctx = new Ctx()
  }
  return ctx
}

export function startAmbient(volume = 0.06) {
  if (typeof window === 'undefined') return
  if (isPlaying) return
  const c = getCtx()
  if (c.state === 'suspended') c.resume()

  masterGain = c.createGain()
  masterGain.gain.value = 0
  masterGain.connect(c.destination)

  // C3, E3, G3 = C major triad pad
  const freqs = [130.81, 164.81, 196.0]
  oscs = []
  gains = []
  freqs.forEach((f, i) => {
    const osc = c.createOscillator()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.value = f
    const g = c.createGain()
    g.gain.value = 1 / freqs.length
    osc.connect(g).connect(masterGain!)
    osc.start()
    oscs.push(osc); gains.push(g)
  })

  // Subtle LFO on master gain for breathing
  lfoOsc  = c.createOscillator()
  lfoGain = c.createGain()
  lfoOsc.frequency.value = 0.12
  lfoGain.gain.value = 0.02
  lfoOsc.connect(lfoGain).connect(masterGain.gain)
  lfoOsc.start()

  // Fade in
  masterGain.gain.linearRampToValueAtTime(volume, c.currentTime + 2)
  isPlaying = true
}

export function stopAmbient() {
  if (!isPlaying || !ctx || !masterGain) return
  const c = ctx
  masterGain.gain.cancelScheduledValues(c.currentTime)
  masterGain.gain.linearRampToValueAtTime(0, c.currentTime + 1.2)

  setTimeout(() => {
    oscs.forEach(o => { try { o.stop() } catch {} })
    if (lfoOsc) { try { lfoOsc.stop() } catch {} }
    oscs = []; gains = []
    masterGain = null; lfoOsc = null; lfoGain = null
    isPlaying = false
  }, 1300)
}

// Soft chime for "chapter complete"
export function playChime() {
  if (typeof window === 'undefined') return
  const c = getCtx()
  if (c.state === 'suspended') c.resume()
  const now = c.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
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
