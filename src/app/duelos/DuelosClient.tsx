'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { getTitle } from '@/lib/titles'
import { DUEL_CATEGORIES } from '@/lib/titles'
import { searchUserByUsername, createDuel, acceptDuel, rejectDuel, cancelDuel } from './actions'
import { Swords, Search, X, Clock, CheckCircle2, Trophy, ChevronRight, Shield, Plus } from 'lucide-react'

interface DuelProfile {
  id: string; username: string; first_name: string; avatar_url: string | null; frame: string | null; title: string | null
}

interface DuelRow {
  id: string
  challenger_id: string
  opponent_id: string
  status: string
  categories: string[]
  challenger_score: number
  opponent_score: number
  winner_id: string | null
  challenger_finished: boolean
  opponent_finished: boolean
  created_at: string
  challenger: DuelProfile
  opponent: DuelProfile
}

interface Props {
  userId: string
  profile: {
    duel_wins: number; duel_losses: number; duel_draws: number
    duel_win_streak: number; duel_best_streak: number; title: string | null
  } | null
  duels: DuelRow[]
  dailyCount: number
}

type Step = 'idle' | 'search' | 'pick-cats' | 'accept-cats' | 'sending'

export default function DuelosClient({ userId, profile, duels, dailyCount }: Props) {
  const router = useRouter()
  const [step, setStep]           = useState<Step>('idle')
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<DuelProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [target, setTarget]       = useState<DuelProfile | null>(null)
  const [myCats, setMyCats]       = useState<string[]>([])
  const [sending, setSending]     = useState(false)
  const [err, setErr]             = useState<string | null>(null)
  const [rouletteActive, setRouletteActive] = useState(false)
  const [rouletteResult, setRouletteResult] = useState<string | null>(null)

  // Accepting a pending duel
  const [acceptingDuel, setAcceptingDuel] = useState<DuelRow | null>(null)

  const pending  = duels.filter(d => d.status === 'pending')
  const active   = duels.filter(d => d.status === 'active')
  const finished = duels.filter(d => d.status === 'finished').slice(0, 5)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await searchUserByUsername(query)
      setResults((data as DuelProfile[]) ?? [])
      setSearching(false)
    }, 400)
    return () => clearTimeout(t)
  }, [query])

  function toggleCat(cat: string) {
    setMyCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : prev.length < 2 ? [...prev, cat] : prev
    )
  }

  async function handleSendChallenge() {
    if (!target || myCats.length < 2) return
    setSending(true); setErr(null)

    // Roulette for "system pick" teaser
    setRouletteActive(true)
    const remaining = DUEL_CATEGORIES.filter(c => !myCats.includes(c))
    let idx = 0; let spins = 0; const maxSpins = 18
    const spin = setInterval(() => {
      idx = (idx + 1) % remaining.length
      setRouletteResult(remaining[idx])
      spins++
      if (spins >= maxSpins) { clearInterval(spin); setRouletteActive(false) }
    }, 80)

    await new Promise(r => setTimeout(r, maxSpins * 80 + 300))

    const { error, duelId } = await createDuel(target.id, myCats)
    if (error) { setErr(error); setSending(false); setRouletteActive(false); return }
    setSending(false)
    setStep('idle')
    setMyCats([])
    setTarget(null)
    setRouletteResult(null)
    if (duelId) router.refresh()
  }

  async function handleAccept() {
    if (!acceptingDuel || myCats.length < 2) return
    setSending(true); setErr(null)

    // Show roulette for random 5th category
    const allChosen = new Set([...(acceptingDuel.categories ?? []), ...myCats])
    const remaining = DUEL_CATEGORIES.filter(c => !allChosen.has(c))
    setRouletteActive(true)
    let idx = 0; let spins = 0; const maxSpins = 22
    const spin = setInterval(() => {
      idx = (idx + 1) % (remaining.length || 1)
      setRouletteResult(remaining[idx] ?? '...')
      spins++
      if (spins >= maxSpins) { clearInterval(spin); setRouletteActive(false) }
    }, 80)
    await new Promise(r => setTimeout(r, maxSpins * 80 + 300))

    const { error } = await acceptDuel(acceptingDuel.id, myCats)
    setSending(false)
    if (error) { setErr(error); return }
    setAcceptingDuel(null)
    setMyCats([])
    setRouletteResult(null)
    router.refresh()
  }

  function openAccept(duel: DuelRow) {
    setAcceptingDuel(duel)
    setMyCats([])
    setErr(null)
    setStep('accept-cats')
  }

  async function handleReject(duelId: string) {
    await rejectDuel(duelId)
    router.refresh()
  }

  async function handleCancel(duelId: string) {
    await cancelDuel(duelId)
    router.refresh()
  }

  function getOpponent(duel: DuelRow) {
    return duel.challenger_id === userId ? duel.opponent : duel.challenger
  }

  function myScore(duel: DuelRow) {
    return duel.challenger_id === userId ? duel.challenger_score : duel.opponent_score
  }

  function opScore(duel: DuelRow) {
    return duel.challenger_id === userId ? duel.opponent_score : duel.challenger_score
  }

  function myFinished(duel: DuelRow) {
    return duel.challenger_id === userId ? duel.challenger_finished : duel.opponent_finished
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords size={22} className="text-purple-400" />
          <h1 className="text-xl font-bold text-white">Duelos PVP</h1>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full border ${
          dailyCount >= 3 ? 'bg-red-900/30 border-red-700/50 text-red-400' : 'bg-purple-900/30 border-purple-700/50 text-purple-300'
        }`}>
          {dailyCount}/3 hoy
        </span>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-4 pb-8">

        {/* Stats banner */}
        {profile && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Victorias', value: profile.duel_wins, color: 'text-green-400' },
              { label: 'Derrotas',  value: profile.duel_losses, color: 'text-red-400' },
              { label: 'Empates',   value: profile.duel_draws, color: 'text-yellow-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pending invites */}
        {pending.filter(d => d.opponent_id === userId).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 mb-2">Desafíos recibidos</h2>
            <div className="space-y-2">
              {pending.filter(d => d.opponent_id === userId).map(duel => (
                <div key={duel.id} className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl p-4 animate-bounce-in">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar avatarUrl={duel.challenger.avatar_url} firstName={duel.challenger.first_name} size="sm" frame={duel.challenger.frame} />
                    <div>
                      <p className="text-white font-semibold">{duel.challenger.first_name} <span className="text-gray-400 text-xs">@{duel.challenger.username}</span></p>
                      <p className="text-yellow-400 text-xs flex items-center gap-1"><Swords size={10} /> te desafió</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openAccept(duel)} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2 rounded-xl transition-colors">Aceptar</button>
                    <button onClick={() => handleReject(duel.id)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors">Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pending sent */}
        {pending.filter(d => d.challenger_id === userId).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 mb-2">Esperando respuesta</h2>
            <div className="space-y-2">
              {pending.filter(d => d.challenger_id === userId).map(duel => (
                <div key={duel.id} className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-4 flex items-center gap-3">
                  <Avatar avatarUrl={duel.opponent.avatar_url} firstName={duel.opponent.first_name} size="sm" frame={duel.opponent.frame} />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">@{duel.opponent.username}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1"><Clock size={10} /> Pendiente</p>
                  </div>
                  <button onClick={() => handleCancel(duel.id)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={16} /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active duels */}
        {active.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 mb-2">En progreso</h2>
            <div className="space-y-2">
              {active.map(duel => {
                const opp = getOpponent(duel)
                const done = myFinished(duel)
                return (
                  <button
                    key={duel.id}
                    onClick={() => !done && router.push(`/duelos/${duel.id}`)}
                    disabled={done}
                    className="w-full bg-purple-900/30 border border-purple-700/40 rounded-2xl p-4 flex items-center gap-3 hover:border-purple-500/60 transition-all disabled:opacity-60"
                  >
                    <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="sm" frame={opp.frame} />
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">vs @{opp.username}</p>
                      <p className="text-purple-400 text-xs">{done ? 'Esperando rival...' : '¡Jugá ahora!'}</p>
                    </div>
                    {!done && <ChevronRight size={16} className="text-purple-400" />}
                    {done && <CheckCircle2 size={16} className="text-green-400" />}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Finished duels */}
        {finished.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 mb-2">Resultados recientes</h2>
            <div className="space-y-2">
              {finished.map(duel => {
                const opp = getOpponent(duel)
                const isWinner = duel.winner_id === userId
                const isDraw   = !duel.winner_id
                return (
                  <button
                    key={duel.id}
                    onClick={() => router.push(`/duelos/${duel.id}`)}
                    className="w-full bg-gray-800/40 border border-gray-700/40 rounded-2xl p-4 flex items-center gap-3 hover:border-gray-600 transition-all"
                  >
                    <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="sm" frame={opp.frame} />
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">vs @{opp.username}</p>
                      <p className={`text-xs font-semibold ${isWinner ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'}`}>
                        {isWinner ? '✓ Victoria' : isDraw ? '= Empate' : '✗ Derrota'} — {myScore(duel)}/{opScore(duel) + myScore(duel)} correctas
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {pending.length === 0 && active.length === 0 && finished.length === 0 && (
          <div className="text-center py-16">
            <Swords size={48} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tenés duelos aún</p>
            <p className="text-gray-600 text-sm mt-1">Desafiá a alguien con el botón +</p>
          </div>
        )}
      </div>

      {/* FAB */}
      {dailyCount < 3 && step === 'idle' && (
        <button
          onClick={() => { setStep('search'); setErr(null); setQuery(''); setResults([]) }}
          className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-lg shadow-purple-900/50 flex items-center justify-center hover:scale-110 transition-transform z-30"
        >
          <Plus size={24} className="text-white" />
        </button>
      )}

      {/* ── Challenge modal ── */}
      {(step === 'search' || step === 'pick-cats') && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
          <div className="bg-[#1a1a2e] border border-purple-900/60 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">{step === 'search' ? 'Desafiar jugador' : 'Elegí tus 2 categorías'}</h2>
              <button onClick={() => { setStep('idle'); setTarget(null); setMyCats([]) }}><X size={20} className="text-gray-400 hover:text-white" /></button>
            </div>

            {step === 'search' && (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscá por usuario..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>
                {searching && <p className="text-gray-500 text-sm text-center">Buscando...</p>}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.map(u => {
                    const title = getTitle(u.title)
                    return (
                      <button key={u.id} onClick={() => { setTarget(u); setStep('pick-cats') }}
                        className="w-full flex items-center gap-3 p-3 bg-gray-800/60 hover:bg-gray-700/60 rounded-xl transition-colors">
                        <Avatar avatarUrl={u.avatar_url} firstName={u.first_name} size="sm" frame={u.frame} />
                        <div className="text-left">
                          <p className="text-white text-sm font-medium">{u.first_name}</p>
                          <p className="text-gray-400 text-xs">@{u.username}</p>
                        </div>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${title.bgColor} ${title.borderColor} ${title.color}`}>{title.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {step === 'pick-cats' && target && (
              <>
                <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl">
                  <Avatar avatarUrl={target.avatar_url} firstName={target.first_name} size="sm" frame={target.frame} />
                  <div>
                    <p className="text-white text-sm font-medium">{target.first_name}</p>
                    <p className="text-gray-400 text-xs">@{target.username}</p>
                  </div>
                  <Shield size={14} className="ml-auto text-gray-600" />
                </div>

                <p className="text-gray-400 text-xs text-center">Elegí <span className="text-purple-300 font-semibold">2 categorías</span> para el duelo ({myCats.length}/2)</p>

                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {DUEL_CATEGORIES.map(cat => {
                    const sel = myCats.includes(cat)
                    return (
                      <button key={cat} onClick={() => toggleCat(cat)}
                        className={`text-xs font-medium py-2.5 px-3 rounded-xl border transition-all text-left ${
                          sel
                            ? 'bg-purple-700 border-purple-500 text-white'
                            : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-purple-700/60'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>

                {/* Roulette preview */}
                {rouletteResult && (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500 mb-1">Categoría aleatoria del sistema:</p>
                    <p className={`text-purple-300 font-bold text-sm transition-all ${rouletteActive ? 'opacity-70' : 'opacity-100'}`}>{rouletteResult}</p>
                  </div>
                )}

                {err && <p className="text-red-400 text-sm text-center">{err}</p>}

                <button
                  onClick={handleSendChallenge}
                  disabled={myCats.length < 2 || sending}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Swords size={16} />
                  {sending ? 'Enviando...' : '¡Enviar desafío!'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Accept modal ── */}
      {step === 'accept-cats' && acceptingDuel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
          <div className="bg-[#1a1a2e] border border-yellow-900/60 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Aceptar desafío</h2>
              <button onClick={() => { setStep('idle'); setAcceptingDuel(null); setMyCats([]) }}><X size={20} className="text-gray-400 hover:text-white" /></button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl">
              <Avatar avatarUrl={acceptingDuel.challenger.avatar_url} firstName={acceptingDuel.challenger.first_name} size="sm" frame={acceptingDuel.challenger.frame} />
              <div>
                <p className="text-white text-sm font-medium">{acceptingDuel.challenger.first_name}</p>
                <p className="text-gray-400 text-xs">@{acceptingDuel.challenger.username} eligió: {(acceptingDuel.categories ?? []).join(', ')}</p>
              </div>
            </div>

            <p className="text-gray-400 text-xs text-center">Ahora elegí <span className="text-yellow-300 font-semibold">tus 2 categorías</span> ({myCats.length}/2)</p>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {DUEL_CATEGORIES.map(cat => {
                const sel = myCats.includes(cat)
                const alreadyPicked = (acceptingDuel.categories ?? []).includes(cat)
                return (
                  <button key={cat} onClick={() => !alreadyPicked && toggleCat(cat)}
                    className={`text-xs font-medium py-2.5 px-3 rounded-xl border transition-all text-left ${
                      alreadyPicked
                        ? 'bg-gray-800 border-gray-600 text-gray-600 cursor-default'
                        : sel
                          ? 'bg-yellow-700/60 border-yellow-600 text-white'
                          : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-yellow-700/60'
                    }`}
                  >
                    {cat} {alreadyPicked ? '(rival)' : ''}
                  </button>
                )
              })}
            </div>

            {/* Roulette preview */}
            {rouletteResult && (
              <div className="text-center py-2 animate-bounce-in">
                <p className="text-xs text-gray-500 mb-1">¡Categoría sorpresa del sistema!</p>
                <p className={`text-yellow-300 font-bold text-base transition-all ${rouletteActive ? 'animate-pulse' : ''}`}>🎰 {rouletteResult}</p>
              </div>
            )}

            {err && <p className="text-red-400 text-sm text-center">{err}</p>}

            <button
              onClick={handleAccept}
              disabled={myCats.length < 2 || sending}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Trophy size={16} />
              {sending ? 'Iniciando duelo...' : '¡Aceptar y jugar!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
