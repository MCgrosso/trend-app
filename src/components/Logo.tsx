export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <div className={`font-black ${sizes[size]} flex items-center tracking-tight`}>
      <span style={{ color: '#a855f7' }}>T</span>
      <span style={{ color: '#3b82f6' }}>R</span>
      <span style={{ color: '#22c55e' }}>E</span>
      <span style={{ color: '#f97316' }}>N</span>
      <span style={{ color: '#ec4899' }}>D</span>
    </div>
  )
}
