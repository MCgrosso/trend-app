export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/Logo'
import Avatar from '@/components/Avatar'
import Link from 'next/link'
import { BookOpen, Trophy, Megaphone, Calendar, Star, ChevronRight, Flame, CheckCircle2 } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const { count: questionsToday } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('available_date', today)

  let answeredToday = 0
  if (user) {
    const { data: answeredData } = await supabase
      .from('answers')
      .select('question_id, questions!inner(available_date)')
      .eq('user_id', user.id)
    const filtered = (answeredData ?? []).filter(
      (a: { questions: { available_date: string } | { available_date: string }[] }) => {
        const q = Array.isArray(a.questions) ? a.questions[0] : a.questions
        return q?.available_date === today
      }
    )
    answeredToday = filtered.length
  }

  const remaining = (questionsToday ?? 0) - answeredToday
  const allDone = user && remaining === 0 && (questionsToday ?? 0) > 0
  const progress = questionsToday ? Math.round((answeredToday / questionsToday) * 100) : 0

  // Horario de saludo
  const hour = new Date().getHours()
  const greeting = hour < 12 ? '¡Buenos días' : hour < 19 ? '¡Buenas tardes' : '¡Buenas noches'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-6 flex items-center justify-between max-w-lg mx-auto">
        <Logo size="md" />
        {user ? (
          <Link href="/profile" className="flex items-center gap-2 bg-purple-900/40 rounded-full px-3 py-1.5 border border-purple-700/50 hover:border-purple-500/70 transition-colors">
            <Avatar avatarUrl={profile?.avatar_url} firstName={profile?.first_name} size="xs" />
            <span className="text-sm text-purple-200 font-medium">@{profile?.username}</span>
          </Link>
        ) : (
          <Link href="/login" className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors">
            Ingresar
          </Link>
        )}
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-4 pb-8">

        {/* ── HERO LOGUEADO ── */}
        {user ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/70 via-blue-900/60 to-indigo-900/70 rounded-2xl p-5 border border-purple-600/30 shadow-xl shadow-purple-900/20">
            {/* Decoración fondo */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

            <p className="text-purple-300 text-sm font-medium">{greeting}{profile?.first_name ? `, ${profile.first_name}` : ''}! 👋</p>
            <h1 className="text-xl font-bold text-white mt-0.5">
              {allDone ? '¡Completaste todo hoy! 🎉' : `Seguí jugando`}
            </h1>

            {/* Stats row */}
            <div className="flex gap-5 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Star size={14} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-yellow-300 font-bold text-base leading-none">{profile?.total_score ?? 0}</p>
                  <p className="text-gray-400 text-[10px]">puntos</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Flame size={14} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-orange-300 font-bold text-base leading-none">{profile?.streak_days ?? 0}</p>
                  <p className="text-gray-400 text-[10px]">días seguidos</p>
                </div>
              </div>
              {!allDone && remaining > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <BookOpen size={14} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-purple-300 font-bold text-base leading-none">{remaining}</p>
                    <p className="text-gray-400 text-[10px]">quedan hoy</p>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de progreso */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">
                  {allDone ? '¡Todo listo!' : `${answeredToday} de ${questionsToday ?? 0} trivias respondidas`}
                </span>
                <span className={`text-xs font-bold ${allDone ? 'text-green-400' : 'text-purple-400'}`}>{progress}%</span>
              </div>
              <div className="h-2.5 bg-gray-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-purple-500 to-blue-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-4">
              {allDone ? (
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Volvé mañana para nuevas preguntas
                </div>
              ) : (questionsToday ?? 0) > 0 ? (
                <Link
                  href="/trivia"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-white/10"
                >
                  {answeredToday > 0 ? 'Continuar trivias' : 'Empezar trivias del día'}
                  <ChevronRight size={15} />
                </Link>
              ) : (
                <p className="text-gray-500 text-sm">El admin no cargó trivias hoy aún</p>
              )}
            </div>
          </div>

        ) : (
          /* ── HERO VISITANTE ── */
          <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 rounded-2xl p-6 border border-purple-700/30 text-center">
            <div className="text-5xl mb-3">✝️</div>
            <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido a TREND!</h1>
            <p className="text-gray-300 text-sm mb-5">Pon a prueba tu conocimiento bíblico y competí con amigos de la iglesia</p>
            <div className="flex gap-3 justify-center">
              <Link href="/register" className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2.5 rounded-full transition-colors">
                Registrarse
              </Link>
              <Link href="/login" className="border border-purple-500 text-purple-300 hover:bg-purple-900/50 font-semibold px-6 py-2.5 rounded-full transition-colors">
                Ingresar
              </Link>
            </div>
          </div>
        )}

        {/* ── ACCESOS RÁPIDOS ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/trivia"
            className="relative bg-gradient-to-br from-purple-800/50 to-purple-900/60 border border-purple-700/40 rounded-2xl p-4 hover:border-purple-500/70 hover:shadow-lg hover:shadow-purple-900/30 transition-all group"
          >
            <BookOpen className="text-purple-400 mb-2 group-hover:scale-110 transition-transform" size={26} />
            <p className="font-semibold text-white text-sm">Trivias</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {user && remaining > 0
                ? <span className="text-purple-300 font-medium">{remaining} pendientes hoy</span>
                : `${questionsToday ?? 0} disponibles hoy`}
            </p>
            {user && remaining > 0 && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </Link>

          <Link
            href="/ranking"
            className="bg-gradient-to-br from-yellow-900/30 to-orange-900/40 border border-yellow-700/40 rounded-2xl p-4 hover:border-yellow-500/60 hover:shadow-lg hover:shadow-yellow-900/20 transition-all group"
          >
            <Trophy className="text-yellow-400 mb-2 group-hover:scale-110 transition-transform" size={26} />
            <p className="font-semibold text-white text-sm">Ranking</p>
            <p className="text-xs text-gray-400 mt-0.5">Top jugadores</p>
          </Link>

          <Link
            href="/anuncios"
            className="bg-gradient-to-br from-blue-900/30 to-cyan-900/40 border border-blue-700/40 rounded-2xl p-4 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-900/20 transition-all group"
          >
            <Megaphone className="text-blue-400 mb-2 group-hover:scale-110 transition-transform" size={26} />
            <p className="font-semibold text-white text-sm">Anuncios</p>
            <p className="text-xs text-gray-400 mt-0.5">Novedades</p>
          </Link>

          <Link
            href="/anuncios#eventos"
            className="bg-gradient-to-br from-green-900/30 to-teal-900/40 border border-green-700/40 rounded-2xl p-4 hover:border-green-500/60 hover:shadow-lg hover:shadow-green-900/20 transition-all group"
          >
            <Calendar className="text-green-400 mb-2 group-hover:scale-110 transition-transform" size={26} />
            <p className="font-semibold text-white text-sm">Eventos</p>
            <p className="text-xs text-gray-400 mt-0.5">Próximas actividades</p>
          </Link>
        </div>

        {/* ── VERSÍCULO ── */}
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-2xl p-5 border border-indigo-700/30 text-center">
          <p className="text-indigo-300 text-[10px] uppercase tracking-widest font-semibold mb-3">✦ Versículo del día ✦</p>
          <p className="text-white text-sm leading-relaxed italic">
            &ldquo;Porque de tal manera amó Dios al mundo, que dio a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.&rdquo;
          </p>
          <p className="text-indigo-400 text-xs mt-3 font-bold">— Juan 3:16</p>
        </div>

      </div>
    </div>
  )
}
