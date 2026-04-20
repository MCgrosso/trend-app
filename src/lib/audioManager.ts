// Global audio manager — single instance lives in the browser, survives
// route changes, handles autoplay policy + mute persistence.

export type BgTrack  = 'main' | 'historia' | 'batalla' | null
export type OneShot  = 'victoria' | 'derrota'

const VOLUME: Record<Exclude<BgTrack, null> | OneShot, number> = {
  main:     0.30,
  historia: 0.30,
  batalla:  0.40,
  victoria: 0.70,
  derrota:  0.50,
}

const MUTE_KEY = 'trend-audio-muted'

class AudioManager {
  private bgEl:        HTMLAudioElement | null = null
  private oneShotEl:   HTMLAudioElement | null = null
  private currentTrack: BgTrack = null
  private muted = false
  private listeners = new Set<() => void>()
  private interactionWaiter: (() => void) | null = null

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1'
    } catch { /* ignore */ }
  }

  // ── Background music ─────────────────────────────────────────────────────
  setBackgroundTrack(track: BgTrack) {
    if (track === this.currentTrack) return

    // Tear down previous
    if (this.bgEl) {
      this.bgEl.pause()
      this.bgEl.src = ''
      this.bgEl = null
    }

    this.currentTrack = track
    if (!track || this.muted) return

    const el = new Audio(`/${track}.mp3`)
    el.loop    = true
    el.volume  = VOLUME[track]
    el.preload = 'auto'
    this.bgEl  = el
    this.tryPlay(el)
  }

  // ── One-shot SFX ─────────────────────────────────────────────────────────
  playOneShot(name: OneShot, onEnded?: () => void) {
    // Stop any prior one-shot
    if (this.oneShotEl) {
      this.oneShotEl.pause()
      this.oneShotEl.src = ''
      this.oneShotEl = null
    }
    if (this.muted) { onEnded?.(); return }

    // Duck the background while one-shot plays
    if (this.bgEl) this.bgEl.pause()

    const el = new Audio(`/${name}.mp3`)
    el.volume = VOLUME[name]
    this.oneShotEl = el

    el.addEventListener('ended', () => {
      this.oneShotEl = null
      // Resume background if same track is still set
      if (this.bgEl && !this.muted) this.bgEl.play().catch(() => {})
      onEnded?.()
    })

    this.tryPlay(el)
  }

  // ── Mute toggle ──────────────────────────────────────────────────────────
  setMuted(muted: boolean) {
    this.muted = muted
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch {}

    if (muted) {
      this.bgEl?.pause()
      this.oneShotEl?.pause()
    } else if (this.currentTrack) {
      // Recreate background if it was torn down
      if (!this.bgEl) {
        const t = this.currentTrack
        this.currentTrack = null
        this.setBackgroundTrack(t)
      } else {
        this.tryPlay(this.bgEl)
      }
    }
    this.notify()
  }

  isMuted() { return this.muted }

  // ── Subscriptions (for React UI) ─────────────────────────────────────────
  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  private notify() { this.listeners.forEach(fn => fn()) }

  // ── Autoplay policy handling ─────────────────────────────────────────────
  private tryPlay(el: HTMLAudioElement) {
    const p = el.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // Autoplay blocked — wait for first user interaction
        if (this.interactionWaiter) return
        const handler = () => {
          this.interactionWaiter = null
          document.removeEventListener('click',     handler)
          document.removeEventListener('touchstart', handler)
          document.removeEventListener('keydown',    handler)
          if (!this.muted && this.bgEl) this.bgEl.play().catch(() => {})
        }
        this.interactionWaiter = handler
        document.addEventListener('click',     handler, { once: true })
        document.addEventListener('touchstart', handler, { once: true })
        document.addEventListener('keydown',    handler, { once: true })
      })
    }
  }
}

let _instance: AudioManager | null = null

export function getAudioManager(): AudioManager | null {
  if (typeof window === 'undefined') return null
  if (!_instance) _instance = new AudioManager()
  return _instance
}
