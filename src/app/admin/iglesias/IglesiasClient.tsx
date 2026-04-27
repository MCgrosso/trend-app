'use client'

import { useState, useTransition } from 'react'
import { Check, X, Trash2, Plus } from 'lucide-react'
import ClanShield from '@/components/ClanShield'
import type { Church, Clan, ChurchRankingRow } from '@/lib/types'
import {
  approveChurch,
  rejectChurch,
  deleteChurch,
  createPredefinedClan,
  deleteClan,
} from './actions'

type PendingChurch = Church & { requester?: { username: string; first_name: string } | null }

const SHIELD_COLORS = [
  { hex: '#7c3aed', bg: 'purple' },
  { hex: '#eab308', bg: 'gold' },
  { hex: '#06b6d4', bg: 'cyan' },
  { hex: '#10b981', bg: 'emerald' },
  { hex: '#ef4444', bg: 'red' },
  { hex: '#f97316', bg: 'orange' },
  { hex: '#3b82f6', bg: 'blue' },
  { hex: '#ec4899', bg: 'pink' },
]
const SHIELD_ICONS = ['⚔️', '🦁', '🦅', '🐺', '🐍', '🦌', '🛡️', '🏹', '🔥', '⭐', '👑', '✨']

export default function IglesiasClient({
  pending,
  rejected,
  ranking,
  predefinedClans,
}: {
  pending: PendingChurch[]
  rejected: Church[]
  ranking: ChurchRankingRow[]
  predefinedClans: Clan[]
}) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'clans'>(pending.length > 0 ? 'pending' : 'approved')
  const [pendingTx, startTx] = useTransition()
  const [openCreateClan, setOpenCreateClan] = useState(false)
  const [err, setErr]   = useState<string | null>(null)

  function showErr(msg: string) {
    setErr(msg)
    setTimeout(() => setErr(null), 4000)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-gray-800/50 border border-gray-700/40 rounded-xl">
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Pendientes {pending.length > 0 && <span className="ml-1 text-[10px] bg-red-500 text-white px-1.5 rounded-full">{pending.length}</span>}
        </TabButton>
        <TabButton active={tab === 'approved'} onClick={() => setTab('approved')}>
          Aprobadas
        </TabButton>
        <TabButton active={tab === 'clans'} onClick={() => setTab('clans')}>
          Clanes
        </TabButton>
      </div>

      {err && (
        <div className="bg-red-900/30 border border-red-700/40 text-red-200 text-xs p-2 rounded-lg">{err}</div>
      )}

      {tab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No hay solicitudes pendientes</p>
          ) : pending.map(c => (
            <div key={c.id} className="bg-emerald-900/15 border border-emerald-700/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">
                    {c.icon_emoji ?? '⛪'} {c.name}
                    {c.abbreviation && <span className="text-gray-400 text-sm ml-1">({c.abbreviation})</span>}
                  </p>
                  {c.description && <p className="text-gray-300 text-xs mt-1">{c.description}</p>}
                  {c.requester && (
                    <p className="text-gray-500 text-[11px] mt-1">
                      Solicitado por @{c.requester.username} · {new Date(c.created_at).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startTx(async () => { const r = await approveChurch(c.id); if (r.error) showErr(r.error) })}
                  disabled={pendingTx}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  <Check size={14} /> Aprobar
                </button>
                <button
                  onClick={() => startTx(async () => { const r = await rejectChurch(c.id); if (r.error) showErr(r.error) })}
                  disabled={pendingTx}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-red-600/40 hover:bg-red-600/60 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg"
                >
                  <X size={14} /> Rechazar
                </button>
              </div>
            </div>
          ))}

          {rejected.length > 0 && (
            <div className="pt-4 border-t border-gray-700/40 space-y-2">
              <p className="text-xs text-gray-400">Rechazadas recientemente</p>
              {rejected.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-800/40 border border-gray-700/30 rounded-lg p-2 text-xs">
                  <span className="text-gray-300">{c.icon_emoji ?? '⛪'} {c.name}</span>
                  <button
                    onClick={() => startTx(async () => { const r = await deleteChurch(c.id); if (r.error) showErr(r.error) })}
                    className="text-red-400 hover:text-red-300"
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'approved' && (
        <div className="space-y-3">
          {ranking.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No hay iglesias aprobadas</p>
          ) : ranking.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${r.abbreviation === 'MVDA' ? 'bg-amber-500/10 border-amber-500/40' : 'bg-purple-900/15 border-purple-700/30'}`}>
              <span className="text-2xl">{r.icon_emoji ?? '⛪'}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{r.name} {r.abbreviation && <span className="text-gray-400 text-xs">({r.abbreviation})</span>}</p>
                <p className="text-gray-400 text-[11px]">{r.member_count} miembros · {r.total_score} pts</p>
              </div>
              <span className="text-gray-500 text-xs">#{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'clans' && (
        <div className="space-y-3">
          <button
            onClick={() => setOpenCreateClan(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold py-2 rounded-xl"
          >
            <Plus size={14} /> Crear clan predefinido
          </button>

          {predefinedClans.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Aún no hay clanes oficiales</p>
          ) : predefinedClans.map(c => {
            const churchName = ranking.find(r => r.id === c.church_id)
            return (
              <div key={c.id} className="flex items-center gap-3 bg-gray-800/40 border border-gray-700/40 rounded-xl p-3">
                <ClanShield shield_bg={c.shield_bg} shield_color={c.shield_color} shield_icon={c.shield_icon} size="sm" />
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{c.name}</p>
                  <p className="text-gray-400 text-[11px]">
                    {churchName ? `${churchName.icon_emoji ?? ''} ${churchName.name}` : 'Sin iglesia'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!confirm(`¿Eliminar "${c.name}"?`)) return
                    startTx(async () => { const r = await deleteClan(c.id); if (r.error) showErr(r.error) })
                  }}
                  className="text-red-400 hover:text-red-300"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {openCreateClan && (
        <CreatePredefinedClanModal
          churches={ranking}
          onClose={() => setOpenCreateClan(false)}
          onErr={showErr}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${active ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-[0_0_10px_rgba(124,58,237,0.4)]' : 'text-gray-400 hover:text-white'}`}
    >
      {children}
    </button>
  )
}

function CreatePredefinedClanModal({
  churches,
  onClose,
  onErr,
}: {
  churches: ChurchRankingRow[]
  onClose: () => void
  onErr: (msg: string) => void
}) {
  const [name, setName]   = useState('')
  const [churchId, setChurchId] = useState(churches[0]?.id ?? '')
  const [color, setColor] = useState(SHIELD_COLORS[0])
  const [icon, setIcon]   = useState(SHIELD_ICONS[0])
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!churchId) return onErr('Elegí una iglesia')
    setSubmitting(true)
    const res = await createPredefinedClan({
      name, church_id: churchId,
      shield_color: color.hex, shield_bg: color.bg, shield_icon: icon,
    })
    setSubmitting(false)
    if (res.error) return onErr(res.error)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-[#0f0a2e] border border-purple-500/40 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bebas text-2xl text-white leading-none">CLAN OFICIAL</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-3 bg-purple-900/15 border border-purple-700/30 rounded-xl p-3">
          <ClanShield shield_bg={color.bg} shield_color={color.hex} shield_icon={icon} size="md" />
          <p className="text-white font-semibold text-sm">{name || 'Nombre del clan'}</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Iglesia</label>
          <select
            value={churchId}
            onChange={e => setChurchId(e.target.value)}
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 rounded-xl px-3 py-2 text-white text-sm outline-none"
          >
            {churches.map(c => (
              <option key={c.id} value={c.id}>{c.icon_emoji ?? '⛪'} {c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Nombre *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={40}
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 rounded-xl px-3 py-2 text-white text-sm outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Color</label>
          <div className="grid grid-cols-4 gap-2">
            {SHIELD_COLORS.map(c => (
              <button
                key={c.bg}
                type="button"
                onClick={() => setColor(c)}
                className={`p-2 rounded-lg border-2 ${color.bg === c.bg ? 'border-white' : 'border-transparent'}`}
              >
                <span className="block w-6 h-6 rounded-full mx-auto" style={{ background: c.hex }} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Ícono</label>
          <div className="grid grid-cols-6 gap-2">
            {SHIELD_ICONS.map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`text-xl p-2 rounded-lg border-2 ${icon === i ? 'border-white bg-purple-500/20' : 'border-transparent'}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || name.trim().length < 3}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-semibold py-2 rounded-xl"
        >
          {submitting ? 'Creando…' : 'Crear clan oficial'}
        </button>
      </form>
    </div>
  )
}
