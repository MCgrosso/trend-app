'use client'

// Animated SVG hourglass — `progress` is 0 (full sand top) → 1 (all bottom)
export default function Hourglass({ timeLeft, max = 30 }: { timeLeft: number; max?: number }) {
  const progress    = 1 - timeLeft / max
  const topSandH    = 28 * (1 - progress)
  const botSandH    = 28 * progress
  const color       = timeLeft > max * 0.5 ? '#fbbf24' : timeLeft > max * 0.25 ? '#f59e0b' : '#dc2626'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="56" height="64" viewBox="0 0 56 64">
        <defs>
          <linearGradient id="frame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#d4a247" />
            <stop offset="100%" stopColor="#8b6412" />
          </linearGradient>
        </defs>

        {/* Top frame */}
        <rect x="6" y="2" width="44" height="3" rx="1" fill="url(#frame)" />
        {/* Bottom frame */}
        <rect x="6" y="59" width="44" height="3" rx="1" fill="url(#frame)" />

        {/* Glass shape: two triangles */}
        <path d="M 10 5 L 46 5 L 30 32 Z" fill="none" stroke="url(#frame)" strokeWidth="1.5" />
        <path d="M 10 59 L 46 59 L 30 32 Z" fill="none" stroke="url(#frame)" strokeWidth="1.5" />

        {/* Top sand (decreasing) */}
        <clipPath id="topClip">
          <path d="M 10 5 L 46 5 L 30 32 Z" />
        </clipPath>
        <rect x="10" y={5 + (28 - topSandH)} width="36" height={topSandH} fill={color} clipPath="url(#topClip)" opacity="0.85">
          <animate attributeName="opacity" values="0.85;1;0.85" dur="1.2s" repeatCount="indefinite" />
        </rect>

        {/* Falling sand stream */}
        {timeLeft > 0 && timeLeft < max && (
          <line x1="30" y1="32" x2="30" y2="34" stroke={color} strokeWidth="1.5">
            <animate attributeName="y2" values="32;36;32" dur="0.4s" repeatCount="indefinite" />
          </line>
        )}

        {/* Bottom sand (increasing) — pile up triangle from bottom */}
        <clipPath id="botClip">
          <path d="M 10 59 L 46 59 L 30 32 Z" />
        </clipPath>
        <rect x="10" y={59 - botSandH} width="36" height={botSandH} fill={color} clipPath="url(#botClip)" opacity="0.85" />

        {/* Time number */}
        <text x="28" y="36" textAnchor="middle" fill="#fef3c7" fontSize="9" fontWeight="bold">
          {timeLeft}
        </text>
      </svg>
    </div>
  )
}
