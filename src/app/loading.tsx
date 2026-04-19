import Logo from '@/components/Logo'
import { CardSkeleton, Skeleton } from '@/components/Skeleton'

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-6 flex items-center justify-between max-w-lg mx-auto">
        <Logo size="md" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </header>
      <div className="px-4 max-w-lg mx-auto space-y-6 pb-8">
        <CardSkeleton />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  )
}
