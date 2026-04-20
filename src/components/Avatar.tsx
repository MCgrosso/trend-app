import { AVATARS } from '@/lib/avatars'
import { FRAME_MAP } from '@/lib/frames'

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
}: {
  avatarUrl?: string | null
  firstName?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  frame?: string | null
}) {
  const s = sizes[size]
  const avatar = avatarUrl ? AVATARS[avatarUrl] : null
  const frameClass = frame ? (FRAME_MAP[frame]?.cssClass ?? '') : ''

  if (avatar) {
    return (
      <div
        className={`${s.outer} rounded-full flex items-center justify-center flex-shrink-0 ${frameClass} ${className}`}
        style={{ backgroundColor: avatar.bg }}
      >
        <span className={s.emoji}>{avatar.emoji}</span>
      </div>
    )
  }

  return (
    <div className={`${s.outer} rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white flex-shrink-0 ${frameClass} ${className}`}>
      <span className={s.text}>{firstName?.[0]?.toUpperCase() ?? '?'}</span>
    </div>
  )
}
