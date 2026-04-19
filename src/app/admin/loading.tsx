import Logo from '@/components/Logo'
import { Skeleton } from '@/components/Skeleton'

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center justify-between">
        <Logo size="sm" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </header>
      <div className="px-4 max-w-lg mx-auto space-y-5 pb-8">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
