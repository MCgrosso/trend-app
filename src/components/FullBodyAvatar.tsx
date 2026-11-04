'use client'

/**
 * Personaje de cuerpo entero (sprite LPC 64x64).
 *
 * Reproduce animaciones cuadro a cuadro desde el spritesheet
 * /public/personajes/{chico,chica}-sheet.png (layout Universal LPC, 13 columnas)
 * usando background-position + CSS steps(). Mientras la hoja carga, o si falla,
 * cae al PNG estático /public/personajes/{chico,chica}.png con las animaciones
 * CSS de transformaciones de siempre.
 */

import { useSyncExternalStore } from 'react'
import type { Character, FullBodyState } from '@/lib/character'

// El personaje ocupa aprox. x 16–48, y 12–62 dentro del frame de 64x64.
// La caja de layout recorta ese padding transparente (sin overflow:hidden,
// así las animaciones de salto/giro no se cortan).
const FRAME = 64
const SHEET_COLS = 13
const BOX_X = 12
const BOX_Y = 11
const BOX_W = 40
const BOX_H = 52

// ── Spritesheet ──────────────────────────────────────────────────────────────
type Facing = 'up' | 'left' | 'down' | 'right'
const DIR_OFFSET: Record<Facing, number> = { up: 0, left: 1, down: 2, right: 3 }

/** Primera fila (mirando arriba) de cada animación; hurt solo existe de frente. */
const BASE_ROW = { spellcast: 0, thrust: 4, walk: 8, hurt: 20, idle: 22, jump: 26 } as const
type SheetAnim = keyof typeof BASE_ROW

interface Clip {
  anim: SheetAnim
  /** cuadro inicial y cantidad de cuadros a reproducir */
  start: number
  frames: number
  durationMs: number
  /** loop = ciclo infinito; once = una pasada y se queda en el último cuadro */
  mode: 'loop' | 'once'
  iterations?: number
  alternate?: boolean
}

function clipFor(state: FullBodyState, character: Character): Clip {
  switch (state) {
    case 'attack': return { anim: 'thrust', start: 0, frames: 8, durationMs: 700, mode: 'once' }
    // se dobla y vuelve a enderezarse (cuadros 0-2 de hurt, ida y vuelta)
    case 'hit':    return { anim: 'hurt', start: 0, frames: 3, durationMs: 300, mode: 'once', iterations: 2, alternate: true }
    // cae y se queda en el piso
    case 'lose':   return { anim: 'hurt', start: 0, frames: 6, durationMs: 700, mode: 'once' }
    // la chica no tiene ropa exportada en jump/emote → festeja con spellcast
    case 'win':    return character === 'chica'
      ? { anim: 'spellcast', start: 0, frames: 7, durationMs: 800, mode: 'once' }
      : { anim: 'jump', start: 0, frames: 5, durationMs: 450, mode: 'once', iterations: 2 }
    case 'enter':  return { anim: 'walk', start: 1, frames: 8, durationMs: 640, mode: 'loop' }
    case 'idle':
    default:       return { anim: 'idle', start: 0, frames: 2, durationMs: 1000, mode: 'loop' }
  }
}

// ── Carga de la hoja (con caché por URL, segura para SSR/hidratación) ────────
type SheetStatus = 'loading' | 'ok' | 'error'
const sheetStatus = new Map<string, SheetStatus>()
const listeners = new Set<() => void>()

function loadSheet(src: string) {
  if (sheetStatus.has(src)) return
  sheetStatus.set(src, 'loading')
  const img = new Image()
  img.onload = () => { sheetStatus.set(src, 'ok'); listeners.forEach(l => l()) }
  img.onerror = () => { sheetStatus.set(src, 'error'); listeners.forEach(l => l()) }
  img.src = src
}

function useSheetStatus(src: string): SheetStatus {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); loadSheet(src); return () => { listeners.delete(cb) } },
    () => sheetStatus.get(src) ?? 'loading',
    () => 'loading',
  )
}

export default function FullBodyAvatar({
  character,
  state = 'idle',
  scale = 4,
  flip = false,
  from = 'left',
  facing,
  className = '',
}: {
  character: Character
  state?: FullBodyState
  scale?: number
  /** Espeja horizontalmente (para que el rival mire hacia el otro lado) */
  flip?: boolean
  /** Lado desde el que entra deslizando en el estado 'enter' */
  from?: 'left' | 'right'
  /** Hacia dónde mira en el spritesheet. Por defecto mira al rival: izquierda si flip, si no derecha. */
  facing?: Facing
  className?: string
}) {
  const sheetSrc = `/personajes/${character}-sheet.png`
  const useSprite = useSheetStatus(sheetSrc) === 'ok'
  const dir: Facing = facing ?? (flip ? 'left' : 'right')
  const clip = clipFor(state, character)
  const row = clip.anim === 'hurt' ? BASE_ROW.hurt : BASE_ROW[clip.anim] + DIR_OFFSET[dir]

  const px = FRAME * scale
  const x0 = -clip.start * px
  // loop: steps(n, end) hasta n cuadros después (el último valor nunca se ve).
  // once: steps(n, jump-none) termina exactamente en el último cuadro y lo mantiene.
  const x1 = clip.mode === 'loop' ? -(clip.start + clip.frames) * px : -(clip.start + clip.frames - 1) * px
  const timing = clip.mode === 'loop' ? `steps(${clip.frames}, end)` : `steps(${clip.frames}, jump-none)`
  const iterations = clip.mode === 'loop' ? 'infinite' : String(clip.iterations ?? 1)

  return (
    <div
      className={`fullbody fullbody-${state} ${useSprite ? 'fullbody-sprite' : ''} ${from === 'right' ? 'fullbody-from-right' : ''} ${className}`}
      style={{
        width: BOX_W * scale,
        height: BOX_H * scale,
        position: 'relative',
        // dirección "hacia atrás" para el golpe: el rival (espejado) retrocede a la derecha
        ['--fb-back' as string]: flip ? '1' : '-1',
      }}
    >
      {/* sombra en el piso */}
      <div
        className="fullbody-shadow"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -1 * scale,
          width: 22 * scale,
          height: 5 * scale,
          marginLeft: -11 * scale,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.35)',
          filter: 'blur(2px)',
        }}
      />
      <div className="fullbody-body" style={{ position: 'absolute', inset: 0 }}>
        {useSprite ? (
          <div
            // la key reinicia la animación de cuadros en cada cambio de estado/dirección
            key={`${state}-${dir}`}
            role="img"
            aria-label={character === 'chica' ? 'Personaje chica' : 'Personaje chico'}
            className="fullbody-frames"
            style={{
              position: 'absolute',
              left: -BOX_X * scale,
              top: -BOX_Y * scale,
              width: px,
              height: px,
              backgroundImage: `url(${sheetSrc})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${SHEET_COLS * px}px auto`,
              backgroundPosition: `${x0}px ${-row * px}px`,
              imageRendering: 'pixelated',
              ['--fb-x0' as string]: `${x0}px`,
              ['--fb-x1' as string]: `${x1}px`,
              animationName: 'fb-sheet',
              animationDuration: `${clip.durationMs}ms`,
              animationTimingFunction: timing,
              animationIterationCount: iterations,
              animationDirection: clip.alternate ? 'alternate' : 'normal',
              animationFillMode: clip.mode === 'once' ? 'forwards' : 'none',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        ) : (
          /* respaldo: frame estático + animaciones CSS de transformaciones */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/personajes/${character}.png`}
            alt={character === 'chica' ? 'Personaje chica' : 'Personaje chico'}
            width={px}
            height={px}
            draggable={false}
            style={{
              position: 'absolute',
              left: -BOX_X * scale,
              top: -BOX_Y * scale,
              width: px,
              height: px,
              maxWidth: 'none',
              imageRendering: 'pixelated',
              transform: flip ? 'scaleX(-1)' : undefined,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}
