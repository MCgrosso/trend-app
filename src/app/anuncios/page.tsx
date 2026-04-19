export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Logo from '@/components/Logo'
import { Megaphone, Calendar, MapPin } from 'lucide-react'

export default async function AnunciosPage() {
  const supabase = await createClient()

  const [{ data: announcements }, { data: events }] = await Promise.all([
    supabase.from('announcements').select('*').order('date', { ascending: false }),
    supabase.from('events').select('*').order('event_date', { ascending: true }),
  ])

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Logo size="sm" />
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-8 pb-8">
        {/* Anuncios */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={22} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Anuncios</h2>
          </div>

          {!announcements || announcements.length === 0 ? (
            <div className="text-center py-10 bg-gray-800/20 rounded-2xl border border-gray-700/30">
              <Megaphone size={36} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No hay anuncios por ahora</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4 hover:border-blue-600/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white leading-tight">{a.title}</h3>
                    <span className="text-blue-400 text-xs flex-shrink-0 bg-blue-900/40 px-2 py-0.5 rounded-full">
                      {new Date(a.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{a.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Eventos */}
        <section id="eventos">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={22} className="text-green-400" />
            <h2 className="text-xl font-bold text-white">Eventos</h2>
          </div>

          {!events || events.length === 0 ? (
            <div className="text-center py-10 bg-gray-800/20 rounded-2xl border border-gray-700/30">
              <Calendar size={36} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No hay eventos próximos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => {
                const isPast = new Date(ev.event_date) < new Date()
                return (
                  <div key={ev.id} className={`border rounded-2xl p-4 transition-colors ${
                    isPast
                      ? 'bg-gray-800/20 border-gray-700/30 opacity-60'
                      : 'bg-green-900/20 border-green-700/30 hover:border-green-600/50'
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white leading-tight">{ev.title}</h3>
                      {isPast && (
                        <span className="text-xs text-gray-500 bg-gray-700/40 px-2 py-0.5 rounded-full flex-shrink-0">Pasado</span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-3">{ev.description}</p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <Calendar size={13} />
                        <span>{formatDate(ev.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-blue-400">
                        <MapPin size={13} />
                        <span>{ev.location}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
