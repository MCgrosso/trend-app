export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/Logo'
import Avatar from '@/components/Avatar'
import Stars from '@/components/Stars'
import Link from 'next/link'
import { Swords, Trophy, Megaphone, Scroll, ChevronRight, Flame, CheckCircle2, Sparkles } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
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
  const allDone   = user && remaining === 0 && (questionsToday ?? 0) > 0
  const progress  = questionsToday ? Math.round((answeredToday / questionsToday) * 100) : 0

  const { data: activeStory } = await supabase
    .from('story_chapters')
    .select('id, book, chapter, title, character_emoji')
    .eq('is_active', true)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '¡Buenos días' : hour < 19 ? '¡Buenas tardes' : '¡Buenas noches'

  return (
    <div className="min-h-screen">
      <Stars count={100} />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-5 flex items-center justify-between max-w-lg mx-auto">
          <Logo size="md" />
          {user ? (
            <Link href="/profile" className="flex items-center gap-2 bg-[#0f0a2e] rounded-full pl-1 pr-3 py-1 border border-purple-600/40 hover:border-purple-400/70 transition-colors">
              <Avatar avatarUrl={profile?.avatar_url} firstName={profile?.first_name} size="xs" frame={profile?.frame} />
              <span className="text-xs text-purple-200 font-semibold">@{profile?.username}</span>
            </Link>
          ) : (
            <Link href="/login" className="bg-gradient-to-r from-purple-600 to-purple-500 hover:brightness-110 text-white text-sm font-bold px-4 py-2 rounded-full transition-all">
              Ingresar
            </Link>
          )}
        </header>

        <div className="px-4 max-w-lg mx-auto space-y-4 pb-8">

          {/* ── HERO trivias del día ── */}
          {user ? (
            <Link
              href={allDone ? '#' : '/trivia'}
              className="relative block bg-gradient-to-br from-[#1a0a4e] via-[#0f0a2e] to-[#1a0a4e] rounded-3xl p-5 overflow-hidden border border-purple-500/40 animate-pulse-border"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

              <div className="relative">
                {/* En vivo badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 animate-live-dot" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-red-400">En vivo ahora</span>
                </div>

                <p className="text-purple-300 text-sm font-medium">{greeting}{profile?.first_name ? `, ${profile.first_name}` : ''}! 👋</p>
                <h1 className="font-bebas text-4xl text-white mt-0.5 leading-none">
                  {allDone ? '¡Completaste todo hoy!' : 'TRIVIAS DEL DÍA'}
                </h1>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-purple-200/80">{answeredToday} de {questionsToday ?? 0} respondidas</span>
                    <span className={`font-bold ${allDone ? 'text-emerald-400' : 'text-cyan-400'}`}>{progress}%</span>
                  </div>
                  <div className="h-2.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        allDone
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-300'
                          : 'bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500'
                      }`}
                      style={{ width: `${progress}%`, backgroundSize: '200% 100%' }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {allDone ? (
                    <span className="flex items-center gap-1.5 text-emerald-300 text-sm font-semibold">
                      <CheckCircle2 size={16} /> Volvé mañana
                    </span>
                  ) : (questionsToday ?? 0) > 0 ? (
                    <span className="flex items-center gap-1.5 text-white text-sm font-bold">
                      <Sparkles size={14} className="text-cyan-400" />
                      {answeredToday > 0 ? 'Continuar' : 'Empezar ahora'}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Sin trivias hoy</span>
                  )}
                  {!allDone && <ChevronRight size={18} className="text-cyan-400" />}
                </div>
              </div>
            </Link>
          ) : (
            <div className="relative bg-gradient-to-br from-[#1a0a4e] via-[#0f0a2e] to-[#1a0a4e] rounded-3xl p-6 border border-purple-500/40 text-center overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="text-5xl mb-3">✦</div>
                <h1 className="font-bebas text-4xl text-white leading-none">BIENVENIDO A <span className="text-cyan-400">#TREND</span></h1>
                <p className="text-purple-200/80 text-sm mt-2">Pon a prueba tu conocimiento bíblico</p>
                <div className="flex gap-2 justify-center mt-5">
                  <Link href="/register" className="bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold px-6 py-2.5 rounded-full hover:brightness-110 transition-all">
                    Registrarse
                  </Link>
                  <Link href="/login" className="border border-purple-500/60 text-purple-200 font-bold px-6 py-2.5 rounded-full hover:bg-purple-900/40 transition-all">
                    Ingresar
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── STREAK BAR ── */}
          {user && profile && (
            <div className="relative bg-gradient-to-r from-[#1a0a2e] to-[#0f0a2e] rounded-2xl p-3 border border-amber-500/30 overflow-hidden animate-gold-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-900/50">
                  <Flame size={22} className="text-white drop-shadow" />
                </div>
                <div className="flex-1">
                  <p className="text-amber-300 text-[10px] uppercase tracking-widest font-bold">Racha activa</p>
                  <p className="text-white font-bebas text-2xl leading-none mt-0.5">
                    {profile.streak_days ?? 0} <span className="text-amber-400">días</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Puntos</p>
                  <p className="font-bebas text-xl text-yellow-300">{profile.total_score ?? 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── MODO HISTORIA ── */}
          {activeStory && (
            <Link
              href="/historia"
              className="relative block bg-gradient-to-r from-amber-900/40 via-yellow-900/30 to-amber-900/40 rounded-2xl p-4 border border-amber-600/40 hover:border-amber-400/70 transition-all overflow-hidden group"
            >
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500/20 blur-2xl rounded-full pointer-events-none" />
              <div className="relative flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  {activeStory.character_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-amber-300 text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                    <Scroll size={10} /> Modo Historia
                  </p>
                  <p className="font-bebas text-white text-xl leading-none mt-0.5">{activeStory.book.toUpperCase()} {activeStory.chapter}</p>
                  <p className="text-amber-200/80 text-xs italic">{activeStory.title}</p>
                </div>
                <ChevronRight size={18} className="text-amber-300" />
              </div>
            </Link>
          )}

          {/* ── 2x2 GRID ── */}
          <div className="grid grid-cols-2 gap-3">
            <QuickCard
              href="/duelos"
              icon={<Swords size={22} />}
              label="DUELOS"
              hint="PVP 1v1"
              color="red"
            />
            <QuickCard
              href="/ranking"
              icon={<Trophy size={22} />}
              label="RANKING"
              hint="Top jugadores"
              color="gold"
            />
            <QuickCard
              href="/historia"
              icon={<Scroll size={22} />}
              label="HISTORIA"
              hint="Recorrido bíblico"
              color="green"
            />
            <QuickCard
              href="/anuncios"
              icon={<Megaphone size={22} />}
              label="ANUNCIOS"
              hint="Novedades"
              color="blue"
            />
          </div>

          {/* ── VERSÍCULO ── */}
          <div className="relative bg-gradient-to-br from-[#0f0a2e] to-[#1a0a4e] rounded-2xl p-5 border border-purple-500/30 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at center, rgba(124,58,237,0.12), transparent 70%)' }} />
            <p className="relative text-cyan-300 text-[10px] uppercase tracking-[0.3em] font-bold mb-3">✦ Versículo del día ✦</p>
            <p className="relative text-white/90 text-sm leading-relaxed italic">
              &ldquo;Porque de tal manera amó Dios al mundo, que dio a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna.&rdquo;
            </p>
            <p className="relative text-purple-300 text-xs mt-3 font-bold tracking-widest">— JUAN 3:16</p>
          </div>

        </div>
      </div>
    </div>
  )
}

function QuickCard({ href, icon, label, hint, color }: {
  href: string; icon: React.ReactNode; label: string; hint: string
  color: 'red' | 'gold' | 'green' | 'blue'
}) {
  const styles = {
    red:   { bg: 'from-red-900/40 to-red-950/60',     border: 'border-red-600/40 hover:border-red-400/70',     icon: 'bg-red-600/30 text-red-400 border-red-500/40',     glow: 'bg-red-500/20' },
    gold:  { bg: 'from-amber-900/40 to-yellow-950/60', border: 'border-amber-600/40 hover:border-amber-400/70', icon: 'bg-amber-600/30 text-amber-300 border-amber-500/40', glow: 'bg-amber-500/20' },
    green: { bg: 'from-emerald-900/40 to-green-950/60',border: 'border-emerald-600/40 hover:border-emerald-400/70', icon: 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40', glow: 'bg-emerald-500/20' },
    blue:  { bg: 'from-blue-900/40 to-cyan-950/60',    border: 'border-blue-600/40 hover:border-cyan-400/70',   icon: 'bg-blue-600/30 text-cyan-300 border-cyan-500/40',   glow: 'bg-cyan-500/20' },
  }[color]

  return (
    <Link href={href}
      className={`relative block bg-gradient-to-br ${styles.bg} rounded-2xl p-4 border ${styles.border} transition-all hover:-translate-y-0.5 overflow-hidden group`}>
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full ${styles.glow} blur-2xl pointer-events-none`} />
      <div className={`relative w-11 h-11 rounded-xl border flex items-center justify-center ${styles.icon} mb-2 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="relative font-bebas text-white text-xl leading-none">{label}</p>
      <p className="relative text-gray-400 text-xs mt-1">{hint}</p>
    </Link>
  )
}
