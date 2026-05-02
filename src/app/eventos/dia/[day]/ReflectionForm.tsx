'use client'

import { useState } from 'react'
import { Send, Eye, EyeOff, Check } from 'lucide-react'
import { saveReflection } from '../../actions'
import { playReflectionSaved } from '@/lib/sounds'

const MIN_CHARS = 20
const MAX_CHARS = 2000

export default function ReflectionForm({
  challengeId,
  prompt,
  initialAnswer = '',
  initialIsPublic = false,
  onSaved,
}: {
  challengeId: string
  prompt: string
  initialAnswer?: string
  initialIsPublic?: boolean
  onSaved?: () => void
}) {
  const [answer, setAnswer]     = useState(initialAnswer)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [saving, setSaving]     = useState(false)
  const [savedAt, setSavedAt]   = useState<number | null>(null)
  const [err, setErr]           = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (answer.trim().length < MIN_CHARS) {
      setErr(`Tu reflexión debe tener al menos ${MIN_CHARS} caracteres`)
      return
    }
    setSaving(true)
    const res = await saveReflection({ challengeId, answer, isPublic })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    playReflectionSaved()
    setSavedAt(Date.now())
    onSaved?.()
  }

  const remaining = MAX_CHARS - answer.length
  const showSaved = savedAt && Date.now() - savedAt < 5000

  return (
    <form onSubmit={submit} className="bg-gradient-to-b from-amber-100/95 to-yellow-50/95 text-stone-900 rounded-2xl border-2 border-yellow-700/60 p-5 space-y-3 shadow-2xl shadow-black/60">
      <div>
        <p className="text-yellow-700/80 text-[10px] uppercase tracking-widest font-bold mb-1">Reflexión del día</p>
        <p className="text-stone-800 text-sm leading-snug" style={{ fontFamily: 'serif' }}>{prompt}</p>
      </div>

      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value.slice(0, MAX_CHARS))}
        rows={5}
        placeholder="Escribí tu reflexión personal acá..."
        className="w-full bg-white/90 border-2 border-yellow-700/40 focus:border-amber-500 rounded-xl px-3 py-2 text-stone-900 text-sm outline-none resize-none placeholder:text-stone-500"
        style={{ fontFamily: 'serif' }}
      />

      <div className="flex justify-between items-center text-xs text-stone-600">
        <span className={answer.length < MIN_CHARS ? 'text-red-600' : ''}>
          {answer.length}/{MIN_CHARS} mínimo · {remaining} restantes
        </span>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={e => setIsPublic(e.target.checked)}
          className="w-4 h-4 accent-amber-600"
        />
        <span className="flex items-center gap-1.5 text-stone-800">
          {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
          {isPublic ? 'Pública en mi perfil' : 'Privada (solo yo la veo)'}
        </span>
      </label>

      {err && <p className="text-red-700 text-xs font-semibold">{err}</p>}
      {showSaved && (
        <p className="inline-flex items-center gap-1 text-emerald-700 text-sm font-bold">
          <Check size={14} /> Tu reflexión fue guardada
        </p>
      )}

      <button
        type="submit"
        disabled={saving || answer.trim().length < MIN_CHARS}
        className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg transition-all"
      >
        <Send size={14} /> {saving ? 'Guardando…' : 'Guardar mi reflexión'}
      </button>
    </form>
  )
}
