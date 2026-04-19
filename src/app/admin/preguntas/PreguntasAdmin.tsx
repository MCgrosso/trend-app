'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Question } from '@/lib/types'
import { Plus, Pencil, Trash2, X, Check, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Option = 'A' | 'B' | 'C' | 'D'

const EMPTY_FORM = {
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A' as Option,
  explanation: '',
  available_date: new Date().toISOString().split('T')[0],
}

export default function PreguntasAdmin({ questions }: { questions: Question[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, available_date: new Date().toISOString().split('T')[0] })
    setShowForm(true)
  }

  function openEdit(q: Question) {
    setEditing(q)
    setForm({
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation,
      available_date: q.available_date,
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.question || !form.option_a || !form.option_b || !form.option_c || !form.option_d || !form.explanation) return
    setLoading(true)
    const supabase = createClient()

    if (editing) {
      await supabase.from('questions').update(form).eq('id', editing.id)
    } else {
      await supabase.from('questions').insert(form)
    }

    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('questions').delete().eq('id', id)
    setDeleteConfirm(null)
    router.refresh()
  }

  function setToday() {
    setForm(prev => ({ ...prev, available_date: new Date().toISOString().split('T')[0] }))
  }

  const inputClass = "w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-gray-400 hover:text-white"><ChevronLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-white">Preguntas</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nueva
        </button>
      </header>

      <div className="px-4 max-w-2xl mx-auto pb-8 space-y-3">
        {/* Modal / Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a2e] border border-purple-700/40 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <h2 className="font-bold text-white">{editing ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Pregunta *</label>
                  <textarea
                    value={form.question}
                    onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                    rows={2}
                    className={inputClass}
                    placeholder="¿Cuántos libros tiene la Biblia?"
                  />
                </div>
                {(['A', 'B', 'C', 'D'] as Option[]).map(opt => (
                  <div key={opt}>
                    <label className="text-xs text-gray-400 mb-1 block">Opción {opt} *</label>
                    <input
                      value={form[`option_${opt.toLowerCase()}` as keyof typeof form] as string}
                      onChange={e => setForm(p => ({ ...p, [`option_${opt.toLowerCase()}`]: e.target.value }))}
                      className={inputClass}
                      placeholder={`Opción ${opt}`}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Respuesta correcta *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['A', 'B', 'C', 'D'] as Option[]).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, correct_option: opt }))}
                        className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                          form.correct_option === opt
                            ? 'bg-green-600 border-green-500 text-white'
                            : 'bg-gray-700/40 border-gray-600/50 text-gray-300 hover:border-green-600'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Explicación *</label>
                  <textarea
                    value={form.explanation}
                    onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))}
                    rows={2}
                    className={inputClass}
                    placeholder="Breve explicación de la respuesta correcta..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Fecha disponible *</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={form.available_date}
                      onChange={e => setForm(p => ({ ...p, available_date: e.target.value }))}
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={setToday}
                      className="text-xs bg-purple-700/40 hover:bg-purple-700/60 text-purple-300 px-3 rounded-xl border border-purple-600/40 transition-colors"
                    >
                      Hoy
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                  {editing ? 'Guardar cambios' : 'Crear pregunta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay preguntas cargadas</div>
        ) : (
          questions.map(q => (
            <div key={q.id} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-purple-400 font-medium">{q.available_date}</span>
                  <p className="text-white text-sm font-medium mt-0.5 line-clamp-2">{q.question}</p>
                  <p className="text-green-400 text-xs mt-1">✓ {q.correct_option}: {q[`option_${q.correct_option.toLowerCase()}` as keyof Question] as string}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(q)} className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors">
                    <Pencil size={15} />
                  </button>
                  {deleteConfirm === q.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(q.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="p-2 text-gray-400 hover:bg-gray-700/30 rounded-lg transition-colors">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(q.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
