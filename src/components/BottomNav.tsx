'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Trophy, Swords, User } from 'lucide-react'

const navItems = [
  { href: '/',        icon: Home,     label: 'Inicio'   },
  { href: '/trivia',  icon: BookOpen, label: 'Trivias'  },
  { href: '/ranking', icon: Trophy,   label: 'Ranking'  },
  { href: '/duelos',  icon: Swords,   label: 'Duelos'   },
  { href: '/profile', icon: User,     label: 'Perfil'   },
]

export default function BottomNav() {
  const pathname = usePathname()
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
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 py-3 px-4 transition-all duration-200 ${
                active ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gradient-to-r from-transparent via-purple-400 to-transparent" />
              )}
              <Icon
                size={22}
                className={active ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]' : ''}
              />
              <span className={`text-[10px] font-semibold ${active ? 'text-purple-300' : ''}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
