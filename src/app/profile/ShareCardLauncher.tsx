'use client'

import { useRef, useState } from 'react'
import { Share2, Download, X, Loader2 } from 'lucide-react'
import ShareCard, { type ShareCardData } from './ShareCard'

export default function ShareCardLauncher(props: ShareCardLauncherProps) {
  const [open, setOpen]       = useState(false)
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  async function capture(): Promise<Blob | null> {
    if (!cardRef.current) return null
    // Importación dinámica: html2canvas-pro pesa ~150kb, no bloquea el bundle inicial.
    const { default: html2canvas } = await import('html2canvas-pro')
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 2,            // 2x para retina
      useCORS: true,
      logging: false,
    })
    return await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/png'))
  }

  async function onDownload() {
    setBusy(true); setErr(null)
    try {
      const blob = await capture()
      if (!blob) throw new Error('No se pudo generar la imagen')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trend-${props.profile.username || 'tarjeta'}.png`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al generar imagen')
    } finally {
      setBusy(false)
    }
  }

  async function onShare() {
    setBusy(true); setErr(null)
    try {
      const blob = await capture()
      if (!blob) throw new Error('No se pudo generar la imagen')
      const file = new File([blob], `trend-${props.profile.username || 'tarjeta'}.png`, { type: 'image/png' })
      const navAny = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> }
      if (navAny.canShare?.({ files: [file] }) && navAny.share) {
        await navAny.share({ files: [file], title: 'Mi perfil de TREND', text: `Soy @${props.profile.username} en TREND ✦` })
      } else {
        // Fallback: descargar
        await onDownload()
      }
    } catch (e) {
      // El usuario cancelando el share no es un error real
      if (e instanceof Error && e.name !== 'AbortError') setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600/40 to-yellow-600/40 hover:from-amber-600/60 hover:to-yellow-600/60 border border-amber-500/40 text-amber-100 font-semibold py-2.5 rounded-xl transition-all text-sm"
      >
        🎴 Compartir tarjeta
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0f0a2e] border border-amber-500/40 rounded-2xl p-4 my-auto">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <h3 className="font-bebas text-2xl text-amber-200 text-center leading-none mb-3">TU TARJETA TREND</h3>

            {/* Preview escalado de la card. La card real (ref'd) se mide en sus 800x450 reales
                con un wrapper que la escala visualmente para que entre en el modal. */}
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="mx-auto" style={{ width: 800, transform: 'scale(0.55)', transformOrigin: 'top center', height: 450 * 0.55 }}>
                <div ref={cardRef}>
                  <ShareCard data={props.profile} churchEmoji={props.churchEmoji} churchName={props.churchName} clan={props.clan} completedChapters={props.completedChapters} />
                </div>
              </div>
            </div>

            {err && <p className="text-red-300 text-xs text-center mt-2">{err}</p>}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={onDownload}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-stone-900 font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Descargar imagen
              </button>
              <button
                onClick={onShare}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                Compartir
              </button>
            </div>

            <p className="text-gray-500 text-[11px] text-center mt-2">La imagen se genera al pulsar &mdash; los GIFs se capturan como cuadro fijo.</p>
          </div>
        </div>
      )}
    </>
  )
}

interface ShareCardLauncherProps {
  profile: ShareCardData
  churchEmoji: string | null
  churchName:  string | null
  clan: { name: string; shield_color: string | null; shield_bg: string | null; shield_icon: string | null } | null
  completedChapters: number
}
