type Size = 'xs' | 'sm' | 'md'

const PADDING: Record<Size, string> = {
  xs: 'px-2 py-0.5 text-[10px] gap-1',
  sm: 'px-2.5 py-1 text-xs gap-1.5',
  md: 'px-4 py-1.5 text-sm gap-2',
}

const ICON_SIZE: Record<Size, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
}

export default function ChurchBadge({
  icon_emoji,
  name,
  abbreviation,
  size = 'sm',
  showFullName = false,
  highlight = false,
}: {
  icon_emoji?: string | null
  name: string
  abbreviation?: string | null
  size?: Size
  showFullName?: boolean
  highlight?: boolean
}) {
  const label = showFullName ? name : (abbreviation ?? name)
  const cls = highlight
    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
    : 'bg-purple-500/15 border-purple-500/40 text-purple-100'

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${PADDING[size]} ${cls}`}
      title={name}
    >
      <span className={ICON_SIZE[size]}>{icon_emoji ?? '⛪'}</span>
      <span className="leading-none">{label}</span>
    </span>
  )
}
