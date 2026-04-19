'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Trophy, Megaphone, User } from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/trivia', icon: BookOpen, label: 'Trivias' },
  { href: '/ranking', icon: Trophy, label: 'Ranking' },
  { href: '/anuncios', icon: Megaphone, label: 'Anuncios' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isAdminRoute = pathname.startsWith('/admin')
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  if (isAdminRoute || isAuthRoute) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a2e] border-t border-purple-900/50 backdrop-blur-sm">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-3 px-4 transition-all duration-200 ${
                active
                  ? 'text-purple-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon
                size={22}
                className={active ? 'drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]' : ''}
              />
              <span className="text-[10px] font-medium">{label}</span>
              {active && (
                <span className="absolute top-0 w-8 h-0.5 bg-purple-400 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
