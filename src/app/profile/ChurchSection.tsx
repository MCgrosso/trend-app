'use client'

import { useMemo, useState, useTransition } from 'react'
import { Church as ChurchIcon, Plus, Send, Sparkles, X } from 'lucide-react'
import ClanShield from '@/components/ClanShield'
import ChurchBadge from '@/components/ChurchBadge'
import type { Church, Clan } from '@/lib/types'
import {
  selectChurch as selectChurchAction,
  selectClan as selectClanAction,
  requestNewChurch as requestChurchAction,
  createClan as createClanAction,
} from './actions'

const SHIELD_COLORS = [
  { hex: '#7c3aed', bg: 'purple',  label: 'Morado' },
  { hex: '#eab308', bg: 'gold',    label: 'Dorado' },
  { hex: '#06b6d4', bg: 'cyan',    label: 'Cian' },
  { hex: '#10b981', bg: 'emerald', label: 'Esmeralda' },
  { hex: '#ef4444', bg: 'red',     label: 'Rojo' },
  { hex: '#f97316', bg: 'orange',  label: 'Naranja' },
  { hex: '#3b82f6', bg: 'blue',    label: 'Azul' },
  { hex: '#ec4899', bg: 'pink',    label: 'Rosa' },
]

const SHIELD_ICONS = ['⚔️', '🦁', '🦅', '🐺', '🐍', '🦌', '🛡️', '🏹', '🔥', '⭐', '👑', '✨']

type Props = {
  churches: Church[]
  clans: Clan[]
  currentChurchId: string | null
  currentClanId: string | null
}

export default function ChurchSection({
  churches,
  clans,
  currentChurchId,
  currentClanId,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [openRequest, setOpenRequest] = useState(false)
  const [openCreateClan, setOpenCreateClan] = useState(false)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const myChurch = useMemo(() => churches.find(c => c.id === currentChurchId) ?? null, [churches, currentChurchId])
  const myClan   = useMemo(() => clans.find(c => c.id === currentClanId) ?? null, [clans, currentClanId])

  function showFlash(kind: 'ok' | 'err', msg: string) {
    setFlash({ kind, msg })
    setTimeout(() => setFlash(null), 5000)
  }

  function onChangeChurch(value: string) {
    const id = value === '' ? null : value
    startTransition(async () => {
      const res = await selectChurchAction(id)
      if (res.error) showFlash('err', res.error)
    })
  }

  function onChangeClan(value: string) {
    const id = value === '' ? null : value
    startTransition(async () => {
      const res = await selectClanAction(id)
      if (res.error) showFlash('err', res.error)
    })
  }

  return (
    <div className="border-t border-purple-800/40 pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <ChurchIcon size={14} className="text-emerald-400" />
        <h4 className="text-sm font-semibold text-white">Mi Iglesia</h4>
      </div>

      <select
        value={currentChurchId ?? ''}
        onChange={e => onChangeChurch(e.target.value)}
        disabled={pending}
        className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-cyan-400/70 rounded-xl px-3 py-2 text-white text-sm outline-none transition-colors disabled:opacity-60"
      >
        <option value="">Otros / no indicar</option>
        {churches.map(c => (
          <option key={c.id} value={c.id}>
            {c.icon_emoji ?? '⛪'} {c.name}{c.abbreviation ? ` (${c.abbreviation})` : ''}
          </option>
        ))}
      </select>

      {myChurch && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Tu iglesia:</span>
          <ChurchBadge
            icon_emoji={myChurch.icon_emoji}
            name={myChurch.name}
            abbreviation={myChurch.abbreviation}
            highlight={myChurch.abbreviation === 'MVDA'}
            showFullName
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpenRequest(true)}
        className="w-full text-xs text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
      >
        ¿No está tu iglesia? Solicitar agregarla
      </button>

      {/* Mi clan: solo si tiene iglesia */}
      {myChurch && (
        <div className="border-t border-purple-800/30 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-yellow-400" />
            <h4 className="text-sm font-semibold text-white">Mi Clan</h4>
          </div>

          {clans.length > 0 ? (
            <select
              value={currentClanId ?? ''}
              onChange={e => onChangeClan(e.target.value)}
              disabled={pending}
              className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-cyan-400/70 rounded-xl px-3 py-2 text-white text-sm outline-none transition-colors disabled:opacity-60"
            >
              <option value="">Sin clan</option>
              {clans.map(cl => (
                <option key={cl.id} value={cl.id}>
                  {cl.shield_icon} {cl.name}{cl.is_predefined ? ' ★' : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-gray-500">Tu iglesia aún no tiene clanes. Creá el primero abajo.</p>
          )}

          {myClan && (
            <div className="flex items-center gap-3 bg-purple-900/15 border border-purple-700/30 rounded-xl p-3">
              <ClanShield
                shield_bg={myClan.shield_bg}
                shield_color={myClan.shield_color}
                shield_icon={myClan.shield_icon}
                size="md"
              />
              <div>
                <p className="text-white font-semibold text-sm">{myClan.name}</p>
                <p className="text-gray-400 text-[11px]">
                  {myClan.is_predefined ? 'Clan oficial' : 'Clan creado por jugadores'}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpenCreateClan(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-100 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={12} /> Crear nuevo clan
          </button>
        </div>
      )}

      {flash && (
        <div className={`text-xs p-2 rounded-lg border ${flash.kind === 'ok' ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-200' : 'bg-red-900/20 border-red-700/40 text-red-200'}`}>
          {flash.msg}
        </div>
      )}

      {openRequest && (
        <RequestChurchModal
          onClose={() => setOpenRequest(false)}
          onSent={() => {
            setOpenRequest(false)
            showFlash('ok', 'Tu solicitud fue enviada. Revisá en 24hs si tu iglesia fue agregada al listado.')
          }}
        />
      )}

      {openCreateClan && (
        <CreateClanModal
          onClose={() => setOpenCreateClan(false)}
          onCreated={() => {
            setOpenCreateClan(false)
            showFlash('ok', '¡Clan creado y unido!')
          }}
        />
      )}
    </div>
  )
}

function RequestChurchModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [name, setName]   = useState('')
  const [abbr, setAbbr]   = useState('')
  const [desc, setDesc]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setSubmitting(true)
    const res = await requestChurchAction({ name, abbreviation: abbr, description: desc })
    setSubmitting(false)
    if (res.error) { setErr(res.error); return }
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-[#0f0a2e] border border-purple-500/40 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bebas text-2xl text-white leading-none">SOLICITAR IGLESIA</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Nombre de la iglesia *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="Ej: Iglesia Cristiana Renacer"
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-cyan-400/70 rounded-xl px-3 py-2 text-white text-sm outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Abreviatura</label>
          <input
            value={abbr}
            onChange={e => setAbbr(e.target.value)}
            maxLength={10}
            placeholder="Ej: ICR"
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-cyan-400/70 rounded-xl px-3 py-2 text-white text-sm outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Descripción (opcional)</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Algo que ayude al admin a identificarla"
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-cyan-400/70 rounded-xl px-3 py-2 text-white text-sm outline-none resize-none"
          />
        </div>

        {err && <p className="text-red-400 text-xs">{err}</p>}

        <button
          type="submit"
          disabled={submitting || name.trim().length < 3}
          className="w-full inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold py-2 rounded-xl transition-colors"
        >
          <Send size={14} /> {submitting ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  )
}

function CreateClanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]   = useState('')
  const [color, setColor] = useState(SHIELD_COLORS[0])
  const [icon, setIcon]   = useState(SHIELD_ICONS[0])
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setSubmitting(true)
    const res = await createClanAction({
      name,
      shield_color: color.hex,
      shield_bg:    color.bg,
      shield_icon:  icon,
      joinAfter:    true,
    })
    setSubmitting(false)
    if (res.error) { setErr(res.error); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-[#0f0a2e] border border-purple-500/40 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bebas text-2xl text-white leading-none">CREAR CLAN</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 bg-purple-900/15 border border-purple-700/30 rounded-xl p-3">
          <ClanShield shield_bg={color.bg} shield_color={color.hex} shield_icon={icon} size="md" />
          <div>
            <p className="text-white font-semibold text-sm">{name || 'Tu clan'}</p>
            <p className="text-gray-400 text-[11px]">Vista previa del escudo</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Nombre del clan *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={40}
            placeholder="Ej: Los Leones del Reino"
            className="w-full bg-[#0a071e] border-2 border-purple-700/40 focus:border-cyan-400/70 rounded-xl px-3 py-2 text-white text-sm outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400">Color del escudo</label>
          <div className="grid grid-cols-4 gap-2">
            {SHIELD_COLORS.map(c => (
              <button
                key={c.bg}
                type="button"
                onClick={() => setColor(c)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${color.bg === c.bg ? 'border-white scale-105' : 'border-transparent hover:border-purple-500/40'}`}
              >
                <span className="w-6 h-6 rounded-full" style={{ background: c.hex }} />
                <span className="text-[10px] text-gray-300">{c.label}</span>
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
                className={`flex items-center justify-center text-xl p-2 rounded-lg border-2 transition-all ${icon === i ? 'border-white bg-purple-500/20' : 'border-transparent hover:border-purple-500/40'}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {err && <p className="text-red-400 text-xs">{err}</p>}

        <button
          type="submit"
          disabled={submitting || name.trim().length < 3}
          className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-400 text-white font-semibold py-2 rounded-xl transition-colors"
        >
          {submitting ? 'Creando…' : 'Crear y unirme'}
        </button>
      </form>
    </div>
  )
}
