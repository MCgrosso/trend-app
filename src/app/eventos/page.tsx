export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Logo from '@/components/Logo'
import Stars from '@/components/Stars'
import { ChevronLeft, Calendar, MapPin, Clock } from 'lucide-react'

export default function EventosPage() {
  return (
    <div className="min-h-screen relative">
      <Stars count={60} />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-4 max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 text-purple-300/80 hover:text-purple-100 text-sm transition-colors">
            <ChevronLeft size={18} /> Volver
          </Link>
          <Logo size="sm" />
        </header>

        <div className="px-4 max-w-lg mx-auto pb-8 space-y-5">
          <div className="text-center">
            <p className="text-amber-300/80 text-xs uppercase tracking-[0.3em] font-semibold">✦ Evento especial ✦</p>
            <h1 className="font-bebas text-4xl text-white leading-none mt-1">EL VALLE DE ELÁ</h1>
          </div>

          {/* Hero image */}
          <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/60 animate-event-glow" style={{ aspectRatio: '1983 / 793' }}>
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: 'url(/dyg.png)' }}
              aria-hidden
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 30%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div className="relative h-full flex items-end justify-center px-4 py-4">
              <p className="font-bebas text-white text-xl leading-none" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}>
                David vs. Goliat
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-gradient-to-br from-amber-900/25 to-yellow-900/15 border border-amber-700/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-amber-300 mt-0.5" />
              <div>
                <p className="text-amber-200 text-xs uppercase tracking-wider font-bold">Fecha</p>
                <p className="text-white text-sm">Miércoles 30 de abril de 2026</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-amber-300 mt-0.5" />
              <div>
                <p className="text-amber-200 text-xs uppercase tracking-wider font-bold">Hora</p>
                <p className="text-white text-sm">22:00 hs (Argentina)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-amber-300 mt-0.5" />
              <div>
                <p className="text-amber-200 text-xs uppercase tracking-wider font-bold">Modalidad</p>
                <p className="text-white text-sm">En vivo — te esperamos</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0f0a2e]/70 border border-purple-700/40 rounded-2xl p-5">
            <p className="text-purple-200 text-sm leading-relaxed">
              Una noche especial para recorrer la historia de David y Goliat. ¿Estás listo para demostrar
              que conocés el relato completo?
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
