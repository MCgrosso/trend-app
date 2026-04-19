'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Announcement } from '@/lib/types'
import { Plus, Pencil, Trash2, X, Check, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const EMPTY = { title: '', description: '', date: new Date().toISOString().split('T')[0] }

export default function AnunciosAdmin({ announcements }: { announcements: Announcement[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0] })
    setShowForm(true)
  }

  function openEdit(a: Announcement) {
    setEditing(a)
    setForm({ title: a.title, description: a.description, date: a.date })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title || !form.description) return
    setLoading(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('announcements').update(form).eq('id', editing.id)
    } else {
      await supabase.from('announcements').insert(form)
    }
    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('announcements').delete().eq('id', id)
    setDeleteConfirm(null)
    router.refresh()
  }

  const inputClass = "w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-gray-400 hover:text-white"><ChevronLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-white">Anuncios</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
          <Plus size={16} />Nuevo
        </button>
      </header>

      <div className="px-4 max-w-2xl mx-auto pb-8 space-y-3">
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a2e] border border-blue-700/40 rounded-2xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <h2 className="font-bold text-white">{editing ? 'Editar anuncio' : 'Nuevo anuncio'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Título *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} placeholder="Título del anuncio" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Descripción *</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className={inputClass} placeholder="Descripción del anuncio..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Fecha</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
                </div>
                <button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                  {editing ? 'Guardar' : 'Crear anuncio'}
                </button>
              </div>
            </div>
          </div>
        )}

        {announcements.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay anuncios</div>
        ) : (
          announcements.map(a => (
            <div key={a.id} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white text-sm font-medium">{a.title}</p>
                  <span className="text-blue-400 text-xs">{a.date}</span>
                </div>
                <p className="text-gray-400 text-xs line-clamp-2">{a.description}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(a)} className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg"><Pencil size={15} /></button>
                {deleteConfirm === a.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(a.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"><Check size={15} /></button>
                    <button onClick={() => setDeleteConfirm(null)} className="p-2 text-gray-400 hover:bg-gray-700/30 rounded-lg"><X size={15} /></button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(a.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
