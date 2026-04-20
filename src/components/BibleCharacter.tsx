'use client'

export type Mood = 'neutral' | 'happy' | 'sad'

// Animated SVG of Moses — robe, beard, staff. Expression changes with `mood`.
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
  // Mouth path depends on mood
  const mouth =
    mood === 'happy'
      ? 'M 44 64 Q 50 72 56 64'
      : mood === 'sad'
      ? 'M 44 68 Q 50 62 56 68'
      : 'M 44 66 L 56 66'

  // Eyes squint when happy, droop when sad
  const eyeY = mood === 'happy' ? 54 : mood === 'sad' ? 58 : 56

  return (
    <svg
      viewBox="0 0 100 180"
      width={size}
      height={size * 1.8}
      className={`drop-shadow-[0_0_24px_rgba(251,191,36,0.45)] ${className}`}
      aria-label={`Ilustración de ${character}`}
    >
      {/* ── Glow halo ── */}
      <defs>
        <radialGradient id="halo" cx="50%" cy="30%" r="50%">
          <stop offset="0%"   stopColor="#fde68a" stopOpacity="0.6" />
          <stop offset="60%"  stopColor="#fbbf24" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="robe" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="#8b5a2b" />
          <stop offset="100%" stopColor="#5b3a1c" />
        </linearGradient>
        <linearGradient id="robeStripe" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stopColor="#f3d27a" />
          <stop offset="100%" stopColor="#b58a3a" />
        </linearGradient>
        <linearGradient id="staff" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#a16207" />
          <stop offset="100%" stopColor="#6b4617" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="55" fill="url(#halo)">
        <animate attributeName="r"       values="50;60;50" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* ── Robe/Tunic ── */}
      <path
        d="M 20 95 Q 50 85 80 95 L 86 170 Q 50 178 14 170 Z"
        fill="url(#robe)"
      />
      <rect x="48" y="95" width="4" height="80" fill="url(#robeStripe)" />

      {/* ── Rope belt ── */}
      <rect x="18" y="128" width="64" height="4" fill="#7a4a1a" />

      {/* ── Staff ── */}
      <rect x="84" y="50" width="4" height="120" rx="2" fill="url(#staff)">
        <animateTransform attributeName="transform" type="rotate"
          values="0 86 110; -2 86 110; 0 86 110" dur="2.4s" repeatCount="indefinite" />
      </rect>
      <circle cx="86" cy="48" r="5" fill="#d4a247" stroke="#8b6412" strokeWidth="1.5">
        <animateTransform attributeName="transform" type="rotate"
          values="0 86 110; -2 86 110; 0 86 110" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* ── Neck ── */}
      <rect x="44" y="82" width="12" height="10" fill="#e3a977" />

      {/* ── Head ── */}
      <ellipse cx="50" cy="58" rx="20" ry="24" fill="#ecb88a" />

      {/* ── Hair on top ── */}
      <path d="M 30 46 Q 50 30 70 46 Q 64 40 50 40 Q 36 40 30 46 Z" fill="#4a3520" />

      {/* ── Beard (long, grey) ── */}
      <path
        d="M 32 66 Q 50 102 68 66 Q 64 84 60 92 Q 50 100 40 92 Q 36 84 32 66 Z"
        fill="#d1d5db"
      />
      <path
        d="M 38 72 Q 50 94 62 72"
        fill="none" stroke="#9ca3af" strokeWidth="1"
      />

      {/* ── Eyes ── */}
      <circle cx="42" cy={eyeY} r="2" fill="#1f2937">
        <animate attributeName="cy" values={`${eyeY};${eyeY + 0.5};${eyeY}`} dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="58" cy={eyeY} r="2" fill="#1f2937">
        <animate attributeName="cy" values={`${eyeY};${eyeY + 0.5};${eyeY}`} dur="4s" repeatCount="indefinite" />
      </circle>

      {/* ── Eyebrows ── */}
      {mood === 'sad' ? (
        <>
          <path d="M 38 50 L 46 48" stroke="#4a3520" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 54 48 L 62 50" stroke="#4a3520" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M 38 48 L 46 50" stroke="#4a3520" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 54 50 L 62 48" stroke="#4a3520" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ── Nose ── */}
      <path d="M 50 56 Q 48 62 50 64 Q 52 62 50 56" fill="#c6916a" />

      {/* ── Mouth ── */}
      <path d={mouth} stroke="#5a2e1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* ── Arms ── */}
      <ellipse cx="22" cy="115" rx="6" ry="18" fill="#8b5a2b" />
      <ellipse cx="78" cy="115" rx="6" ry="18" fill="#8b5a2b" />
      <circle  cx="22" cy="132" r="5" fill="#ecb88a" />
      <circle  cx="78" cy="132" r="5" fill="#ecb88a" />
    </svg>
  )
}
