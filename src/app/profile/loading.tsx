import Logo from '@/components/Logo'
import { Skeleton } from '@/components/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center justify-between">
        <Logo size="sm" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </header>
      <div className="px-4 max-w-lg mx-auto space-y-5 pb-8">
        {/* Avatar card */}
        <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-6 flex flex-col items-center gap-3">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        {/* History */}
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  )
}
