import { getRank } from '@/lib/pvpRanks'

interface Props {
  rank: string | null | undefined
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

const SIZE_MAP = {
  xs: { container: 'text-[10px] px-1.5 py-0.5 gap-1',  icon: 'text-[11px]' },
  sm: { container: 'text-xs px-2 py-0.5 gap-1.5',      icon: 'text-sm' },
  md: { container: 'text-sm px-3 py-1 gap-2',          icon: 'text-lg' },
} as const

export default function PvpRankBadge({ rank, size = 'sm', showLabel = true, className = '' }: Props) {
  const r = getRank(rank)
  const s = SIZE_MAP[size]
  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${r.bgColor} ${r.borderColor} ${r.color} ${r.shadow} ${s.container} ${className}`}
      title={`Rango PVP: ${r.label}`}
    >
      <span className={s.icon}>{r.icon}</span>
      {showLabel && <span className={r.specialClass}>{r.label}</span>}
    </span>
  )
}
