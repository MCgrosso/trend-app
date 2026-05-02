'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { createWordPuzzle, deleteWordPuzzle } from './actions'
import type { WordPuzzle } from '@/lib/types'

const DIFFS = [
  { id: 'easy',   label: 'Fácil',   color: 'text-emerald-300' },
  { id: 'medium', label: 'Medio',   color: 'text-amber-300'   },
  { id: 'hard',   label: 'Difícil', color: 'text-red-300'     },
] as const

export default function PalabrasAdminClient({
  puzzles,
  statsByPuzzle,
}: {
  puzzles: WordPuzzle[]
  statsByPuzzle: Array<[string, { total: number; won: number; avgErrors: number }]>
}) {
  const [openCreate, setOpenCreate] = useState(false)
  const [err, setErr]   = useState<string | null>(null)
  const [pendingTx, startTx] = useTransition()
  const stats = new Map(statsByPuzzle)

  function showErr(m: string) { setErr(m); setTimeout(() => setErr(null), 4000) }

  function onDelete(id: string, ref: string) {
    if (!confirm(`¿Eliminar el versículo "${ref}"? Se borrarán también todos los intentos.`)) return
    startTx(async () => {
      const r = await deleteWordPuzzle(id); if (r.error) showErr(r.error)
    })
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpenCreate(true)}
        className="w-full inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold py-2.5 rounded-xl"
      >
        <Plus size={14} /> Nuevo versículo
      </button>

      {err && (
        <div className="bg-red-900/30 border border-red-700/40 text-red-200 text-xs p-2 rounded-lg">{err}</div>
      )}

      {puzzles.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">No hay versículos cargados</p>
      ) : (
        <div className="space-y-3">
          {puzzles.map(p => {
            const st = stats.get(p.id) ?? { total: 0, won: 0, avgErrors: 0 }
            const diff = DIFFS.find(d => d.id === p.difficulty) ?? DIFFS[1]
            return (
              <div key={p.id} className="bg-[#1a1a2e]/70 border border-purple-700/30 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-200 text-xs font-bold">{p.reference}</p>
                    <p className="text-white text-sm mt-1 italic line-clamp-2" style={{ fontFamily: 'serif' }}>
                      &ldquo;{p.verse}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                      <span>📅 {p.available_date}</span>
                      <span className={diff.color}>● {diff.label}</span>
                      <span>🔒 {p.hidden_words.length} palabras</span>
                    </div>
                    {st.total > 0 && (
                      <div className="mt-1 text-[10px] text-gray-500">
                        {st.total} intentos · {st.won}/{st.total} ganados · {st.avgErrors.toFixed(1)} errores prom.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(p.id, p.reference)}
                    disabled={pendingTx}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {openCreate && (
        <CreatePuzzleModal
          onClose={() => setOpenCreate(false)}
          onErr={showErr}
        />
      )}
    </div>
  )
}

function CreatePuzzleModal({ onClose, onErr }: { onClose: () => void; onErr: (m: string) => void }) {
  const [verse, setVerse]         = useState('')
  const [reference, setReference] = useState('')
  const [hidden, setHidden]       = useState('')
  const [hint, setHint]           = useState('')
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0])
  const [diff, setDiff]           = useState<'easy' | 'medium' | 'hard'>('medium')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const hiddenList = hidden.split(',').map(s => s.trim()).filter(Boolean)
    const res = await createWordPuzzle({
      verse, reference, hidden_words: hiddenList, hint,
      available_date: date, difficulty: diff,
    })
    setSubmitting(false)
    if (res.error) return onErr(res.error)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-[#0f0a2e] border border-purple-500/40 rounded-2xl p-5 space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bebas text-2xl text-white leading-none">NUEVO VERSÍCULO</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Versículo completo *</label>
          <textarea
            value={verse} onChange={e => setVerse(e.target.value)}
            required rows={3}
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-cyan-400/70 rounded-xl px-3 py-2 text-white text-sm outline-none resize-none"
            placeholder="Ej: Porque de tal manera amó Dios al mundo..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Referencia *</label>
            <input
              value={reference} onChange={e => setReference(e.target.value)}
              required maxLength={50}
              className="w-full bg-[#0a071e] border-2 border-purple-700/40 rounded-xl px-3 py-2 text-white text-sm outline-none"
              placeholder="Juan 3:16"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Fecha *</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              required
              className="w-full bg-[#0a071e] border-2 border-purple-700/40 rounded-xl px-3 py-2 text-white text-sm outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Palabras a ocultar (separadas por coma) *</label>
          <input
            value={hidden} onChange={e => setHidden(e.target.value)}
            required
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 rounded-xl px-3 py-2 text-white text-sm outline-none"
            placeholder="manera, mundo, unigénito, cree, eterna"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Pista *</label>
          <input
            value={hint} onChange={e => setHint(e.target.value)}
            required maxLength={120}
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 rounded-xl px-3 py-2 text-white text-sm outline-none"
            placeholder="Ej: El versículo más conocido sobre el amor de Dios"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Dificultad</label>
          <div className="flex gap-1.5">
            {DIFFS.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDiff(d.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                  diff === d.id
                    ? 'bg-purple-600 border-purple-400 text-white'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-semibold py-2.5 rounded-xl"
        >
          {submitting ? 'Creando…' : 'Crear versículo'}
        </button>
      </form>
    </div>
  )
}
