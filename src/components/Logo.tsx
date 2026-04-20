export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-7xl',
  }

  // # blue · T orange · R purple · E green · N yellow · D red
  const letters = [
    { ch: '#', color: '#00d4ff' },
    { ch: 'T', color: '#f97316' },
    { ch: 'R', color: '#7c3aed' },
    { ch: 'E', color: '#10b981' },
    { ch: 'N', color: '#eab308' },
    { ch: 'D', color: '#ef4444' },
  ]

  return (
    <div className={`font-bebas flex items-center ${sizes[size]} leading-none`}>
      {letters.map((l, i) => (
        <span key={i} style={{ color: l.color, textShadow: `0 0 16px ${l.color}55` }}>
          {l.ch}
        </span>
      ))}
    </div>
  )
}
