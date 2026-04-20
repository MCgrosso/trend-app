export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'
import AvatarSection from './AvatarSection'
import { Star, Flame, Calendar, Shield } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { getMedal } from '@/lib/medals'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: answers } = await supabase
    .from('answers')
    .select('is_correct, answered_at')
    .eq('user_id', user.id)
    .order('answered_at', { ascending: false })

  const totalAnswers = answers?.length ?? 0
  const correctAnswers = answers?.filter(a => a.is_correct).length ?? 0
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

  // Puntaje semanal (lunes-domingo UTC)
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday)
  weekStart.setUTCHours(0, 0, 0, 0)

  const weeklyCorrect = answers?.filter(
    a => a.is_correct && new Date(a.answered_at) >= weekStart
  ).length ?? 0
  const weeklyScore = weeklyCorrect * 10

  // ¿Es campeón semanal?
  const { data: weeklyAll } = await supabase.rpc('get_weekly_ranking')
  const isWeeklyChampion = (weeklyAll?.[0]?.id === user.id) && weeklyScore > 0
  const medal = getMedal(weeklyScore, isWeeklyChampion)

  // Ranking global
  const { data: ranking } = await supabase
    .from('profiles')
    .select('id, total_score')
    .order('total_score', { ascending: false })

  const userRank = (ranking?.findIndex(p => p.id === user.id) ?? -1) + 1

  // Avatares especiales desbloqueados
  const unlockedSpecial: string[] = []
  if (correctAnswers >= 20) unlockedSpecial.push('guerrero')
  if ((profile?.streak_days ?? 0) >= 5) unlockedSpecial.push('profeta')
  if ((profile?.total_score ?? 0) >= 200) unlockedSpecial.push('apostol')

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 flex items-center justify-between max-w-lg mx-auto">
        <Logo size="sm" />
        <LogoutButton />
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-5 pb-8">
        {/* Avatar + info */}
        <div className="bg-gradient-to-r from-purple-900/60 to-blue-900/60 rounded-2xl p-6 border border-purple-700/30 text-center">
          <h2 className="text-xl font-bold text-white mb-0.5">{profile?.first_name} {profile?.last_name}</h2>
          <p className="text-purple-300 text-sm">@{profile?.username}</p>
          <p className="text-gray-400 text-xs mt-1 mb-5">{user.email}</p>
          <AvatarSection
            userId={user.id}
            avatarUrl={profile?.avatar_url ?? null}
            firstName={profile?.first_name ?? null}
            unlockedSpecial={unlockedSpecial}
          />
          {profile?.role === 'admin' && (
            <Link href="/admin" className="inline-flex items-center gap-1 mt-4 bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors">
              <Shield size={12} />
              Panel Admin
            </Link>
          )}
        </div>

        {/* Medalla semanal */}
        {medal ? (
          <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${medal.bgColor} ${medal.borderColor}`}>
            <span className="text-4xl">{medal.icon}</span>
            <div>
              <p className={`font-bold text-lg ${medal.textColor}`}>{medal.label}</p>
              <p className="text-gray-400 text-xs">{weeklyScore} pts esta semana</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-gray-700/30 bg-gray-800/20">
            <span className="text-4xl opacity-40">🏅</span>
            <div>
              <p className="text-gray-500 font-medium">Sin medalla esta semana</p>
              <p className="text-gray-600 text-xs">Jugá para ganar — Bronce desde 50 pts</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-2xl p-4 text-center">
            <Star size={22} className="text-yellow-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-300">{profile?.total_score ?? 0}</p>
            <p className="text-xs text-gray-400">Puntaje total</p>
          </div>
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-2xl p-4 text-center">
            <Flame size={22} className="text-orange-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-300">{profile?.streak_days ?? 0}</p>
            <p className="text-xs text-gray-400">Días seguidos</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4 text-center">
            <span className="text-blue-400 text-xl">🏆</span>
            <p className="text-2xl font-bold text-blue-300">#{userRank > 0 ? userRank : '—'}</p>
            <p className="text-xs text-gray-400">Posición global</p>
          </div>
          <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4 text-center">
            <Calendar size={22} className="text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-300">{accuracy}%</p>
            <p className="text-xs text-gray-400">Precisión</p>
          </div>
        </div>

        {/* Historial resumen */}
        <div className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3">Resumen general</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Preguntas respondidas</span>
              <span className="text-white font-medium">{totalAnswers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Respuestas correctas</span>
              <span className="text-green-400 font-medium">{correctAnswers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Respuestas incorrectas</span>
              <span className="text-red-400 font-medium">{totalAnswers - correctAnswers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Miembro desde</span>
              <span className="text-white font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
