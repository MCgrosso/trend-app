'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, ChevronLeft, Bell } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type NotifType = 'info' | 'warning' | 'update' | 'event' | 'maintenance'

interface Notification {
  id: string
  title: string
  message: string
  type: NotifType
  is_global: boolean
  created_at: string
}

const TYPE_META: Record<NotifType, { icon: string; label: string; ring: string }> = {
  info:        { icon: '🔔', label: 'Info',         ring: 'ring-blue-500/60' },
  warning:     { icon: '⚠️', label: 'Advertencia',  ring: 'ring-amber-500/60' },
  update:      { icon: '🔄', label: 'Actualización', ring: 'ring-cyan-500/60' },
  event:       { icon: '🎉', label: 'Evento',       ring: 'ring-purple-500/60' },
  maintenance: { icon: '🔧', label: 'Mantenimiento', ring: 'ring-stone-500/60' },
}

const EMPTY = { title: '', message: '', type: 'info' as NotifType }

export default function NotificacionesAdmin({ notifications }: { notifications: Notification[] }) {
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<Notification | null>(null)
  const [form, setForm]                 = useState(EMPTY)
  const [loading, setLoading]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }
  function openEdit(n: Notification) {
    setEditing(n)
    setForm({ title: n.title, message: n.message, type: n.type })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.message.trim()) return
    setLoading(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('notifications').update(form).eq('id', editing.id)
    } else {
      await supabase.from('notifications').insert({ ...form, is_global: true })
    }
    setLoading(false)
    setShowForm(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('notifications').delete().eq('id', id)
    setDeleteConfirm(null)
    router.refresh()
  }

  const inputClass = 'w-full bg-gray-800/60 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-gray-400 hover:text-white"><ChevronLeft size={20} /></Link>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-purple-400" />
            <h1 className="text-xl font-bold text-white">Notificaciones</h1>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
          <Plus size={16} />Nueva
        </button>
      </header>

      <div className="px-4 max-w-2xl mx-auto pb-8 space-y-3">
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a2e] border border-purple-700/40 rounded-2xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <h2 className="font-bold text-white">{editing ? 'Editar notificación' : 'Nueva notificación'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Título *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} placeholder="Título de la notificación" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Mensaje *</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} className={inputClass} placeholder="Texto de la notificación..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                  <div className="grid grid-cols-5 gap-2">
                    {(Object.entries(TYPE_META) as [NotifType, typeof TYPE_META[NotifType]][]).map(([id, meta]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, type: id }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-semibold transition-all ${
                          form.type === id
                            ? `bg-white/10 border-transparent ring-2 ${meta.ring} text-white`
                            : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="text-lg">{meta.icon}</span>
                        <span>{meta.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleSave} disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                  {editing ? 'Guardar' : 'Crear notificación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay notificaciones</div>
        ) : (
          notifications.map(n => {
            const meta = TYPE_META[n.type]
            return (
              <div key={n.id} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-white text-sm font-medium">{n.title}</p>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{meta.label}</span>
                  </div>
                  <p className="text-gray-400 text-xs line-clamp-2">{n.message}</p>
                  <p className="text-gray-600 text-[10px] mt-1">
                    {new Date(n.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(n)} className="p-2 text-purple-400 hover:bg-purple-900/30 rounded-lg"><Pencil size={15} /></button>
                  {deleteConfirm === n.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(n.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"><Check size={15} /></button>
                      <button onClick={() => setDeleteConfirm(null)} className="p-2 text-gray-400 hover:bg-gray-700/30 rounded-lg"><X size={15} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(n.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
