import Logo from '@/components/Logo'
import { AnuncioSkeleton, Skeleton } from '@/components/Skeleton'
import { Megaphone, Calendar } from 'lucide-react'

export default function AnunciosLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Logo size="sm" />
      </header>
      <div className="px-4 max-w-lg mx-auto space-y-8 pb-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={22} className="text-blue-400" />
            <Skeleton className="h-6 w-28" />
          </div>
          <AnuncioSkeleton />
        </section>
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={22} className="text-green-400" />
            <Skeleton className="h-6 w-24" />
          </div>
          <AnuncioSkeleton />
        </section>
      </div>
    </div>
  )
}
