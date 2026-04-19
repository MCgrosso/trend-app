import Logo from '@/components/Logo'
import { QuestionSkeleton, Skeleton } from '@/components/Skeleton'

export default function TriviaLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Logo size="sm" />
        <Skeleton className="h-7 w-48 mt-4" />
        <Skeleton className="h-4 w-36 mt-2" />
      </header>
      <div className="px-4 max-w-lg mx-auto space-y-4 pb-8">
        {/* Progress dots skeleton */}
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-full" />
          ))}
        </div>
        <QuestionSkeleton />
      </div>
    </div>
  )
}
