'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/lib/types'
import { Plus, Pencil, Trash2, X, Check, ChevronLeft, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const EMPTY = { title: '', description: '', event_date: new Date().toISOString().split('T')[0], location: '' }

export default function EventosAdmin({ events }: { events: Event[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY, event_date: new Date().toISOString().split('T')[0] })
    setShowForm(true)
  }

  function openEdit(ev: Event) {
    setEditing(ev)
    setForm({ title: ev.title, description: ev.description, event_date: ev.event_date, location: ev.location })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title || !form.description || !form.location) return
    setLoading(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('events').update(form).eq('id', editing.id)
    } else {
      await supabase.from('events').insert(form)
    }
    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('events').delete().eq('id', id)
    setDeleteConfirm(null)
    router.refresh()
  }

  const inputClass = "w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-gray-400 hover:text-white"><ChevronLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-white">Eventos</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
          <Plus size={16} />Nuevo
        </button>
      </header>

      <div className="px-4 max-w-2xl mx-auto pb-8 space-y-3">
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a2e] border border-green-700/40 rounded-2xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <h2 className="font-bold text-white">{editing ? 'Editar evento' : 'Nuevo evento'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Título *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} placeholder="Campamento de verano" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Descripción *</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className={inputClass} placeholder="Descripción del evento..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Fecha del evento *</label>
                  <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Lugar *</label>
                  <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className={inputClass} placeholder="Iglesia Central, Salón A" />
                </div>
                <button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                  {editing ? 'Guardar' : 'Crear evento'}
                </button>
              </div>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay eventos cargados</div>
        ) : (
          events.map(ev => (
            <div key={ev.id} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-white text-sm font-medium">{ev.title}</p>
                  <span className="text-green-400 text-xs">{ev.event_date}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                  <MapPin size={11} />
                  <span>{ev.location}</span>
                </div>
                <p className="text-gray-400 text-xs line-clamp-2">{ev.description}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(ev)} className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg"><Pencil size={15} /></button>
                {deleteConfirm === ev.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(ev.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"><Check size={15} /></button>
                    <button onClick={() => setDeleteConfirm(null)} className="p-2 text-gray-400 hover:bg-gray-700/30 rounded-lg"><X size={15} /></button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(ev.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
