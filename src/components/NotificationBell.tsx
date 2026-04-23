'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NotificationRow {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'update' | 'event' | 'maintenance'
  created_at: string
}

interface Props {
  userId: string
  initialItems: NotificationRow[]
  initialReadIds: string[]
}

const TYPE_ICON: Record<NotificationRow['type'], string> = {
  info:        '🔔',
  warning:     '⚠️',
  update:      '🔄',
  event:       '🎉',
  maintenance: '🔧',
}

const TYPE_TINT: Record<NotificationRow['type'], string> = {
  info:        'border-blue-500/40 bg-blue-900/20',
  warning:     'border-amber-500/40 bg-amber-900/20',
  update:      'border-cyan-500/40 bg-cyan-900/20',
  event:       'border-purple-500/40 bg-purple-900/20',
  maintenance: 'border-stone-500/40 bg-stone-900/40',
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days} d`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function NotificationBell({ userId, initialItems, initialReadIds }: Props) {
  const [open, setOpen]       = useState(false)
  const [items]               = useState<NotificationRow[]>(initialItems)
  const [readIds, setReadIds] = useState<Set<string>>(new Set(initialReadIds))
  const unread = items.filter(n => !readIds.has(n.id)).length
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function markAllRead() {
    const unreadItems = items.filter(n => !readIds.has(n.id))
    if (unreadItems.length === 0) return

    const supabase = createClient()
    const rows = unreadItems.map(n => ({ user_id: userId, notification_id: n.id }))
    const { error } = await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict: 'user_id,notification_id' })

    if (!error) {
      setReadIds(prev => {
        const next = new Set(prev)
        for (const n of unreadItems) next.add(n.id)
        return next
      })
    }
  }

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next) {
      // Defer so the panel paints with the highlight before we clear it
      setTimeout(markAllRead, 800)
    }
  }

  const displayBadge = Math.min(99, unread)

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-full bg-[#0f0a2e] border border-purple-600/40 hover:border-purple-400/70 flex items-center justify-center transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={16} className="text-purple-200" />
        {displayBadge > 0 && !open && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-[#08051a] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {displayBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] max-h-[70vh] overflow-hidden rounded-2xl bg-[#0f0a2e] border border-purple-600/50 shadow-2xl shadow-purple-900/40 animate-notif-drawer flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-800/40">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-purple-300" />
              <p className="font-bebas text-white text-lg leading-none">NOTIFICACIONES</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10 px-4">Sin notificaciones por ahora.</p>
            ) : (
              <ul className="divide-y divide-purple-800/30">
                {items.map(n => {
                  const isUnread = !readIds.has(n.id)
                  return (
                    <li
                      key={n.id}
                      className={`px-4 py-3 border-l-2 transition-colors ${
                        isUnread
                          ? `${TYPE_TINT[n.type]} border-l-purple-400`
                          : 'border-l-transparent opacity-80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5">{TYPE_ICON[n.type]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${isUnread ? 'text-white font-semibold' : 'text-gray-300'}`}>
                              {n.title}
                            </p>
                            {isUnread && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                          </div>
                          <p className="text-gray-400 text-xs mt-0.5 leading-snug">{n.message}</p>
                          <p className="text-gray-600 text-[10px] mt-1">{relativeTime(n.created_at)}</p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
