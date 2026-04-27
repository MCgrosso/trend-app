type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZE_PX: Record<Size, number> = {
  xs: 24,
  sm: 36,
  md: 64,
  lg: 96,
}

const ICON_PX: Record<Size, string> = {
  xs: 'text-[11px]',
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-4xl',
}

// Maps the textual `shield_bg` key to a Tailwind gradient class.
// Keys come from migration 015 seed (gold, cyan, red, orange, emerald, purple,
// gray, amber, sky, blue, lime, pink) and from the in-app picker.
const BG_GRADIENT: Record<string, string> = {
  purple:  'from-purple-600 to-purple-900',
  gold:    'from-yellow-400 to-yellow-700',
  amber:   'from-amber-400 to-amber-700',
  cyan:    'from-cyan-400 to-cyan-700',
  sky:     'from-sky-400 to-sky-700',
  blue:    'from-blue-500 to-blue-800',
  emerald: 'from-emerald-400 to-emerald-700',
  lime:    'from-lime-400 to-lime-700',
  green:   'from-green-500 to-green-800',
  red:     'from-red-500 to-red-800',
  orange:  'from-orange-500 to-orange-800',
  pink:    'from-pink-500 to-pink-800',
  gray:    'from-gray-400 to-gray-700',
}

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

export default function ClanShield({
  shield_bg,
  shield_color,
  shield_icon,
  size = 'sm',
  glow = true,
}: {
  shield_bg?: string | null
  shield_color?: string | null
  shield_icon?: string | null
  size?: Size
  glow?: boolean
}) {
  const px = SIZE_PX[size]
  const gradient = BG_GRADIENT[shield_bg ?? 'purple'] ?? BG_GRADIENT.purple
  const border = shield_color ?? '#7c3aed'
  const icon = shield_icon ?? '⚔️'

  // Hex border = outer hex with bg color, inner hex slightly smaller with gradient
  return (
    <span
      className="relative inline-block flex-shrink-0"
      style={{
        width: px,
        height: px,
        filter: glow ? `drop-shadow(0 0 6px ${border}66)` : undefined,
      }}
    >
      <span
        className="absolute inset-0"
        style={{ clipPath: HEX_CLIP, background: border }}
      />
      <span
        className={`absolute inset-[2px] bg-gradient-to-br ${gradient} flex items-center justify-center`}
        style={{ clipPath: HEX_CLIP }}
      >
        <span className={`${ICON_PX[size]} leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]`}>{icon}</span>
      </span>
    </span>
  )
}
