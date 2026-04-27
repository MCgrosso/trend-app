export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Megaphone, Calendar, BarChart3, Users, Scroll, Bell, Church as ChurchIcon } from 'lucide-react'
import Logo from '@/components/Logo'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

  const [
    { count: totalQuestions },
    { count: questionsToday },
    { count: totalUsers },
    { count: totalAnnouncements },
    { count: totalEvents },
    { count: totalChapters },
    { count: totalNotifications },
    { count: totalChurches },
    { count: pendingChurches },
  ] = await Promise.all([
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }).eq('available_date', today),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('announcements').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('story_chapters').select('*', { count: 'exact', head: true }),
    supabase.from('notifications').select('*', { count: 'exact', head: true }),
    supabase.from('churches').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('churches').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const sections = [
    {
      href: '/admin/preguntas',
      icon: BookOpen,
      label: 'Preguntas',
      color: 'purple',
      stat: `${questionsToday} hoy / ${totalQuestions} total`,
    },
    {
      href: '/admin/anuncios',
      icon: Megaphone,
      label: 'Anuncios',
      color: 'blue',
      stat: `${totalAnnouncements} anuncios`,
    },
    {
      href: '/admin/eventos',
      icon: Calendar,
      label: 'Eventos',
      color: 'green',
      stat: `${totalEvents} eventos`,
    },
    {
      href: '/admin/historia',
      icon: Scroll,
      label: 'Modo Historia',
      color: 'yellow',
      stat: `${totalChapters ?? 0} capítulos`,
    },
    {
      href: '/admin/notificaciones',
      icon: Bell,
      label: 'Notificaciones',
      color: 'purple',
      stat: `${totalNotifications ?? 0} notificaciones`,
    },
    {
      href: '/admin/iglesias',
      icon: ChurchIcon,
      label: 'Iglesias y Clanes',
      color: 'green',
      stat: `${totalChurches ?? 0} aprobadas${pendingChurches ? ` · ${pendingChurches} pendientes` : ''}`,
      badge: pendingChurches ?? 0,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center justify-between">
        <Logo size="sm" />
        <span className="text-xs text-yellow-400 bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 rounded-full">
          Panel Admin
        </span>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-5 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Panel de administración</h1>
          <p className="text-gray-400 text-sm mt-1">TREND — gestión de contenido</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-3 text-center">
            <Users size={18} className="text-purple-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{totalUsers}</p>
            <p className="text-xs text-gray-400">Usuarios</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-3 text-center">
            <BookOpen size={18} className="text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{totalQuestions}</p>
            <p className="text-xs text-gray-400">Preguntas</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl p-3 text-center">
            <BarChart3 size={18} className="text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{questionsToday}</p>
            <p className="text-xs text-gray-400">Hoy</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((s) => {
            const { href, icon: Icon, label, color, stat } = s
            const badge = (s as { badge?: number }).badge ?? 0
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.01] ${
                  color === 'purple' ? 'bg-purple-900/20 border-purple-700/40 hover:border-purple-500/60' :
                  color === 'blue'   ? 'bg-blue-900/20 border-blue-700/40 hover:border-blue-500/60'   :
                  color === 'yellow' ? 'bg-yellow-900/20 border-yellow-700/40 hover:border-yellow-500/60' :
                  'bg-green-900/20 border-green-700/40 hover:border-green-500/60'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  color === 'purple' ? 'bg-purple-600/30' :
                  color === 'blue'   ? 'bg-blue-600/30'   :
                  color === 'yellow' ? 'bg-yellow-600/30' :
                  'bg-green-600/30'
                }`}>
                  <Icon size={22} className={
                    color === 'purple' ? 'text-purple-400' :
                    color === 'blue'   ? 'text-blue-400'   :
                    color === 'yellow' ? 'text-yellow-400' :
                    'text-green-400'
                  } />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Gestionar {label}</p>
                  <p className="text-xs text-gray-400">{stat}</p>
                </div>
                {badge > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                    {badge}
                  </span>
                )}
                <span className="text-gray-500 text-lg">›</span>
              </Link>
            )
          })}
        </div>

        <Link href="/" className="block text-center text-gray-500 text-sm hover:text-gray-300 transition-colors">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
