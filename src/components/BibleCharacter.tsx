'use client'

import Image from 'next/image'

export type Mood = 'neutral' | 'happy' | 'sad'

export default function BibleCharacter({
  character = 'Moisés',
  mood = 'neutral',
  size = 180,
  className = '',
}: {
  character?: string
  mood?: Mood
  size?: number
  className?: string
}) {
  const filter =
    mood === 'happy'
      ? 'brightness(1.15) saturate(1.25) drop-shadow(0 0 24px rgba(251,191,36,0.55))'
      : mood === 'sad'
      ? 'grayscale(0.45) brightness(0.85) drop-shadow(0 0 18px rgba(100,116,139,0.45))'
      : 'drop-shadow(0 0 22px rgba(251,191,36,0.45))'

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size * 1.4 }}
      aria-label={`Ilustración de ${character}`}
    >
      {/* Pulsing halo behind the character */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(253,224,138,0.55) 0%, rgba(251,191,36,0.18) 35%, rgba(251,191,36,0) 70%)',
          animation: 'character-halo 3s ease-in-out infinite',
        }}
      />

      <Image
        src="/moises.png"
        alt={character}
        fill
        priority
        sizes={`${size}px`}
        className="object-contain relative"
        style={{ filter, transition: 'filter 0.4s ease-out' }}
      />

      <style jsx>{`
        @keyframes character-halo {
          0%, 100% { transform: scale(0.95); opacity: 0.6; }
          50%       { transform: scale(1.1);  opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
