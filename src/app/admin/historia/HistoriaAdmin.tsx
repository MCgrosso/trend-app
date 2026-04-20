'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Plus, CheckCircle2, Circle, Pencil, Scroll, BookOpen, Link2 } from 'lucide-react'

interface Chapter {
  id: string
  book: string
  chapter: number
  title: string
  character_name: string
  character_emoji: string
  introduction: string
  bible_tip: string
  week_start: string
  week_end: string
  is_active: boolean
}

interface QRow {
  id: string
  question: string
  story_chapter_id: string | null
  category: string | null
}

const EMPTY_FORM = {
  book: '',
  chapter: 1,
  title: '',
  character_name: '',
  character_emoji: '📜',
  introduction: '',
  bible_tip: '',
  week_start: new Date().toISOString().split('T')[0],
  week_end: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
  is_active: false,
}

export default function HistoriaAdmin({ chapters, questions }: { chapters: Chapter[]; questions: QRow[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Chapter | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [linkingFor, setLinkingFor] = useState<Chapter | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setShowForm(true); setErr(null)
  }
  function openEdit(c: Chapter) {
    setEditing(c)
    setForm({
      book: c.book, chapter: c.chapter, title: c.title,
      character_name: c.character_name, character_emoji: c.character_emoji,
      introduction: c.introduction, bible_tip: c.bible_tip,
      week_start: c.week_start, week_end: c.week_end, is_active: c.is_active,
    })
    setShowForm(true); setErr(null)
  }

  async function handleSave() {
    setSaving(true); setErr(null)
    const supabase = createClient()

    // If activating this one, deactivate others
    if (form.is_active) {
      await supabase.from('story_chapters').update({ is_active: false }).neq('id', editing?.id ?? '00000000-0000-0000-0000-000000000000')
    }

    if (editing) {
      const { error } = await supabase.from('story_chapters').update(form).eq('id', editing.id)
      if (error) { setErr(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('story_chapters').insert(form)
      if (error) { setErr(error.message); setSaving(false); return }
    }

    setSaving(false); setShowForm(false); router.refresh()
  }

  async function toggleActive(c: Chapter) {
    const supabase = createClient()
    if (!c.is_active) {
      // Deactivate all others first
      await supabase.from('story_chapters').update({ is_active: false }).neq('id', c.id)
    }
    await supabase.from('story_chapters').update({ is_active: !c.is_active }).eq('id', c.id)
    router.refresh()
  }

  async function linkQuestion(chapterId: string, questionId: string, currentlyLinked: boolean) {
    const supabase = createClient()
    await supabase
      .from('questions')
      .update({
        story_chapter_id: currentlyLinked ? null : chapterId,
        category: currentlyLinked ? 'General' : 'Modo Historia',
      })
      .eq('id', questionId)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors">
          <ChevronLeft size={18} /> Admin
        </Link>
        <span className="text-xs text-yellow-400 bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 rounded-full">
          Modo Historia
        </span>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scroll size={18} className="text-yellow-400" />
            <h1 className="font-bold text-white">Capítulos</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            <Plus size={14} /> Nuevo
          </button>
        </div>

        {/* Chapter list */}
        <div className="space-y-2">
          {chapters.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">No hay capítulos aún</div>
          ) : (
            chapters.map(c => {
              const linkedCount = questions.filter(q => q.story_chapter_id === c.id).length
              return (
                <div key={c.id} className={`rounded-2xl p-4 border transition-all ${
                  c.is_active
                    ? 'bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-yellow-600/50'
                    : 'bg-gray-800/40 border-gray-700/40'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{c.character_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-sm" style={{ fontFamily: 'serif' }}>{c.book} {c.chapter}</p>
                        {c.is_active && <span className="text-[10px] bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full font-bold">ACTIVO</span>}
                      </div>
                      <p className="text-gray-400 text-xs italic">{c.title}</p>
                      <p className="text-gray-500 text-[11px] mt-1">👤 {c.character_name} · 📚 {linkedCount} preguntas</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">{c.week_start} → {c.week_end}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => toggleActive(c)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      c.is_active
                        ? 'bg-yellow-700/40 text-yellow-200 hover:bg-yellow-700/60'
                        : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700/80'
                    }`}>
                      {c.is_active ? <><CheckCircle2 size={12} /> Activo</> : <><Circle size={12} /> Activar</>}
                    </button>
                    <button onClick={() => openEdit(c)} className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-700/40 hover:bg-blue-700/60 text-blue-200 rounded-lg text-xs font-semibold transition-colors">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => setLinkingFor(c)} className="flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-700/40 hover:bg-purple-700/60 text-purple-200 rounded-lg text-xs font-semibold transition-colors">
                      <Link2 size={12} /> Preguntas
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Create/Edit form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center overflow-y-auto">
          <div className="bg-[#1a1a2e] border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 my-4 max-h-[90vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">{editing ? 'Editar capítulo' : 'Nuevo capítulo'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input value={form.book} onChange={e => setForm({ ...form, book: e.target.value })} placeholder="Libro (ej. Génesis)"
                className="col-span-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm" />
              <input type="number" value={form.chapter} onChange={e => setForm({ ...form, chapter: parseInt(e.target.value) || 1 })} placeholder="Capítulo"
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm" />
              <input value={form.character_emoji} onChange={e => setForm({ ...form, character_emoji: e.target.value })} placeholder="Emoji" maxLength={4}
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm text-center" />
            </div>

            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título (ej. El Principio de Todo)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm" />
            <input value={form.character_name} onChange={e => setForm({ ...form, character_name: e.target.value })} placeholder="Personaje bíblico (ej. Moisés)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm" />
            <textarea value={form.introduction} onChange={e => setForm({ ...form, introduction: e.target.value })} placeholder="Introducción del personaje (texto largo)"
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm resize-none" />
            <textarea value={form.bible_tip} onChange={e => setForm({ ...form, bible_tip: e.target.value })} placeholder="Consejo de lectura bíblica"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm resize-none" />

            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.week_start} onChange={e => setForm({ ...form, week_start: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm" />
              <input type="date" value={form.week_end} onChange={e => setForm({ ...form, week_end: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm" />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300 px-1">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              Activar este capítulo (desactiva los demás)
            </label>

            {err && <p className="text-red-400 text-xs">{err}</p>}

            <button onClick={handleSave} disabled={saving || !form.book || !form.title || !form.character_name || !form.introduction}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all text-sm">
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear capítulo'}
            </button>
          </div>
        </div>
      )}

      {/* ── Question linking modal ── */}
      {linkingFor && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center overflow-y-auto">
          <div className="bg-[#1a1a2e] border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 my-4 max-h-[90vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white text-base">Asignar preguntas</h2>
                <p className="text-xs text-gray-500">{linkingFor.book} {linkingFor.chapter} — {linkingFor.title}</p>
              </div>
              <button onClick={() => setLinkingFor(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <p className="text-[11px] text-gray-500">Tocá una pregunta para vincularla/desvincularla del capítulo.</p>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {questions.map(q => {
                const linkedHere   = q.story_chapter_id === linkingFor.id
                const linkedOther  = !!q.story_chapter_id && !linkedHere
                return (
                  <button key={q.id}
                    onClick={() => linkQuestion(linkingFor.id, q.id, linkedHere)}
                    disabled={linkedOther}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                      linkedHere
                        ? 'bg-yellow-900/30 border-yellow-600/60 text-yellow-100'
                        : linkedOther
                          ? 'bg-gray-800/30 border-gray-700/30 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-800/60 border-gray-700/40 text-gray-300 hover:border-purple-600/60'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">
                        {linkedHere ? <CheckCircle2 size={14} className="text-yellow-400" /> : <BookOpen size={14} />}
                      </span>
                      <div className="flex-1">
                        <p className="line-clamp-2">{q.question}</p>
                        {linkedOther && <p className="text-[10px] text-gray-600 mt-0.5">(ya vinculada a otro capítulo)</p>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
