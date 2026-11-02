'use client'

/**
 * Personaje de cuerpo entero (sprite LPC 64x64) con animaciones CSS.
 * Los PNG viven en /public/personajes/{chico,chica}.png (frame frontal en reposo
 * extraído de la fila "idle" mirando hacia abajo de cada spritesheet).
 */

import type { Character, FullBodyState } from '@/lib/character'

// El personaje ocupa aprox. x 16–48, y 12–62 dentro del frame de 64x64.
// La caja de layout recorta ese padding transparente (sin overflow:hidden,
// así las animaciones de salto/giro no se cortan).
const FRAME = 64
const BOX_X = 12
const BOX_Y = 11
const BOX_W = 40
const BOX_H = 52

export default function FullBodyAvatar({
  character,
  state = 'idle',
  scale = 4,
  flip = false,
  from = 'left',
  className = '',
}: {
  character: Character
  state?: FullBodyState
  scale?: number
  /** Espeja horizontalmente (para que el rival mire hacia el otro lado) */
  flip?: boolean
  /** Lado desde el que entra deslizando en el estado 'enter' */
  from?: 'left' | 'right'
  className?: string
}) {
  return (
    <div
      className={`fullbody fullbody-${state} ${from === 'right' ? 'fullbody-from-right' : ''} ${className}`}
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/personajes/${character}.png`}
          alt={character === 'chica' ? 'Personaje chica' : 'Personaje chico'}
          width={FRAME * scale}
          height={FRAME * scale}
          draggable={false}
          style={{
            position: 'absolute',
            left: -BOX_X * scale,
            top: -BOX_Y * scale,
            width: FRAME * scale,
            height: FRAME * scale,
            maxWidth: 'none',
            imageRendering: 'pixelated',
            transform: flip ? 'scaleX(-1)' : undefined,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}
