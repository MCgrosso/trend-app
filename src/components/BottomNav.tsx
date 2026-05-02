'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, BookOpen, Trophy, Swords, User, Scroll } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/',                icon: Home,     label: 'Inicio'   },
  { href: '/trivia',          icon: BookOpen, label: 'Trivias'  },
  { href: '/palabra-oculta',  icon: Scroll,   label: 'Palabra'  },
  { href: '/ranking',         icon: Trophy,   label: 'Ranking'  },
  { href: '/duelos',          icon: Swords,   label: 'Duelos'   },
  { href: '/profile',         icon: User,     label: 'Perfil'   },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [puzzleAvailable, setPuzzleAvailable] = useState(false)

  // Verificación ligera (1 query) al montar: ¿hay puzzle de hoy y no lo resolvió?
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
      const { data: puzzle } = await supabase
        .from('word_puzzles')
        .select('id')
        .eq('available_date', today)
        .maybeSingle()
      if (!puzzle || cancelled) return
      const { data: attempt } = await supabase
        .from('word_puzzle_attempts')
        .select('completed')
        .eq('user_id', user.id)
        .eq('puzzle_id', puzzle.id)
        .maybeSingle()
      if (!cancelled) setPuzzleAvailable(!attempt?.completed)
    }
    check()
    return () => { cancelled = true }
  }, [pathname])

  const isAdminRoute = pathname.startsWith('/admin')
  const isAuthRoute  = pathname.startsWith('/login') || pathname.startsWith('/register')
  if (isAdminRoute || isAuthRoute) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#08051a]/80 border-t border-purple-500/30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          const showBadge = href === '/palabra-oculta' && puzzleAvailable && !active
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 py-3 px-3 transition-all duration-200 ${
                active ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gradient-to-r from-transparent via-purple-400 to-transparent" />
              )}
              <div className="relative">
                <Icon
                  size={22}
                  className={active ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]' : ''}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                )}
              </div>
              <span className={`text-[10px] font-semibold ${active ? 'text-purple-300' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
