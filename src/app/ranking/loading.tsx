import Logo from '@/components/Logo'
import { RankingSkeleton, Skeleton } from '@/components/Skeleton'
import { Trophy } from 'lucide-react'

export default function RankingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Logo size="sm" />
        <div className="flex items-center gap-2 mt-4">
          <Trophy size={24} className="text-yellow-400" />
          <Skeleton className="h-7 w-52" />
        </div>
        <Skeleton className="h-4 w-40 mt-2" />
      </header>
      <div className="px-4 max-w-lg mx-auto pb-8 space-y-3">
        {/* Podio skeleton */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <RankingSkeleton />
      </div>
    </div>
  )
}
