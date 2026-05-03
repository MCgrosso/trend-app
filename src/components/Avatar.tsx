import { AVATARS } from '@/lib/avatars'
import { FRAME_MAP } from '@/lib/frames'
import { BG_MAP } from '@/lib/avatarBackgrounds'

const sizes = {
  xs: { outer: 'w-7 h-7',   emoji: 'text-sm',  text: 'text-xs font-bold' },
  sm: { outer: 'w-10 h-10', emoji: 'text-xl',  text: 'text-sm font-bold' },
  md: { outer: 'w-14 h-14', emoji: 'text-2xl', text: 'text-lg font-bold' },
  lg: { outer: 'w-20 h-20', emoji: 'text-3xl', text: 'text-2xl font-bold' },
}

export default function Avatar({
  avatarUrl,
  firstName,
  size = 'sm',
  className = '',
  frame,
  bg,
}: {
  avatarUrl?: string | null
  firstName?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  frame?: string | null
  bg?: string | null
}) {
  const s = sizes[size]
  const avatar     = avatarUrl ? AVATARS[avatarUrl] : null
  const frameClass = frame ? (FRAME_MAP[frame]?.cssClass ?? '') : ''
  const bgEntry    = bg ? BG_MAP[bg] ?? null : null
  const hasImageBg = !!bgEntry?.image
  const bgClass    = bgEntry?.cssClass ?? ''
  // Cuando el bg trae imagen o tiene cssClass propia, NO aplicamos el color
  // por defecto del avatar (queremos que se vea el bg elegido).
  const useCustomBg = Boolean(bgClass) || hasImageBg

  // Estilos inline para el background del círculo. Los gif/png se aplican
  // directamente con backgroundImage; los avatares emoji por defecto usan
  // su color sólido si no hay bg custom.
  const bgInlineStyle: React.CSSProperties | undefined = hasImageBg
    ? {
        backgroundImage:    `url('${bgEntry!.image}')`,
        backgroundSize:     'cover',
        backgroundPosition: 'center',
      }
    : useCustomBg
      ? undefined
      : avatar
        ? { backgroundColor: avatar.bg }
        : undefined

  if (avatar) {
    // PNG-based avatar (e.g. story-mode unlocks): render circular image
    if (avatar.image) {
      return (
        <div
          className={`${s.outer} relative rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${bgClass} ${frameClass} ${className}`}
          style={bgInlineStyle}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar.image}
            alt={avatar.label}
            className="relative z-10 w-full h-full object-cover"
          />
        </div>
      )
    }

    return (
      <div
        className={`${s.outer} relative rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${bgClass} ${frameClass} ${className}`}
        style={bgInlineStyle}
      >
        <span className={`relative z-10 ${s.emoji}`}>{avatar.emoji}</span>
      </div>
    )
  }

  // Letra de fallback. Si hay bg custom o imagen, no aplicamos el gradient default.
  return (
    <div
      className={`${s.outer} relative rounded-full flex items-center justify-center text-white flex-shrink-0 overflow-hidden ${
        useCustomBg ? bgClass : 'bg-gradient-to-br from-purple-500 to-blue-500'
      } ${frameClass} ${className}`}
      style={bgInlineStyle}
    >
      <span className={`relative z-10 ${s.text}`}>{firstName?.[0]?.toUpperCase() ?? '?'}</span>
    </div>
  )
}
