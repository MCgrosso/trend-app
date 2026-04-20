'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { getTitle, DUEL_CATEGORIES } from '@/lib/titles'
import { createDuel, acceptDuel, rejectDuel, cancelDuel } from './actions'
import { Swords, X, Clock, CheckCircle2, ChevronRight, Star, Trophy, Loader2 } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DuelProfile {
  id: string
  username: string
  first_name: string
  avatar_url: string | null
  frame: string | null
  title: string | null
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

interface Player {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  frame: string | null
  title: string | null
  total_score: number
  wins: number
  losses: number
}

interface Props {
  userId: string
  profile: {
    wins: number; losses: number; draws: number
    win_streak: number; best_streak: number; title: string | null
  } | null
  duels: DuelRow[]
  dailyCount: number
  challengedTodayIds: string[]
}

type Modal = 'none' | 'pick-cats' | 'accept-cats'

// ── Player card ───────────────────────────────────────────────────────────────

function PlayerCard({
  player, isMe, isActive, alreadyChallenged, limitReached, rank, onChallenge,
}: {
  player: Player; isMe: boolean; isActive: boolean
  alreadyChallenged: boolean; limitReached: boolean; rank: number
  onChallenge: () => void
}) {
  const title = getTitle(player.title)
  const total  = player.wins + player.losses
  const wr     = total > 0 ? Math.round((player.wins / total) * 100) : null

  return (
    <div className={`relative rounded-2xl border p-4 transition-all duration-200 ${
      isMe
        ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-600/50 shadow-lg shadow-purple-900/20'
        : 'bg-gray-800/40 border-gray-700/40 hover:border-purple-600/50 hover:bg-gray-800/70 hover:shadow-lg hover:shadow-purple-900/10 hover:-translate-y-0.5'
    }`}>
      {/* Active indicator */}
      <span className={`absolute top-3.5 right-3.5 w-2 h-2 rounded-full ${
        isActive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'bg-gray-600'
      }`} />

      <div className="flex items-center gap-3">
        {/* Rank */}
        <span className={`text-xs font-bold w-6 text-center flex-shrink-0 ${
          rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-orange-400' : 'text-gray-600'
        }`}>
          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
        </span>

        <Link href={`/perfil/${player.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <Avatar avatarUrl={player.avatar_url} firstName={player.first_name} size="sm" frame={player.frame} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-white font-semibold text-sm truncate group-hover:text-cyan-300 transition-colors">{player.first_name} {player.last_name}</p>
              {isMe && <span className="text-[10px] bg-purple-700/60 text-purple-200 px-1.5 py-0.5 rounded-full font-medium">Tú</span>}
            </div>
            <p className="text-gray-500 text-xs group-hover:text-cyan-400/80 transition-colors">@{player.username}</p>
            <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${title.bgColor} ${title.borderColor} ${title.color}`}>
              ⚔️ {title.label}
            </span>
          </div>
        </Link>

        <div className="text-right flex-shrink-0 pr-3">
          <div className="flex items-center gap-1 justify-end">
            <Star size={11} className="text-yellow-400" />
            <p className="text-yellow-300 font-bold text-sm">{player.total_score}</p>
          </div>
          <p className="text-[10px] mt-0.5">
            <span className="text-green-500">{player.wins}V</span>
            <span className="text-gray-600"> / </span>
            <span className="text-red-500">{player.losses}D</span>
            {wr !== null && <span className="text-gray-600"> · {wr}%</span>}
          </p>
        </div>
      </div>

      {!isMe && (
        <div className="mt-3">
          <button
            onClick={onChallenge}
            disabled={alreadyChallenged || limitReached}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
              alreadyChallenged
                ? 'bg-gray-700/50 text-gray-500 cursor-default border border-gray-700'
                : limitReached
                  ? 'bg-gray-700/50 text-gray-600 cursor-not-allowed border border-gray-700'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-md active:scale-[0.98]'
            }`}
          >
            {alreadyChallenged ? '✓ Ya retado hoy' : limitReached ? 'Límite diario alcanzado' : '⚔️ Retar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Category picker modal ─────────────────────────────────────────────────────

function CategoryModal({
  title, subtitle, takenCats, takenLabel, confirmLabel, confirmColor, onConfirm, onClose,
}: {
  title: string; subtitle: string; takenCats?: string[]; takenLabel?: string
  confirmLabel: string; confirmColor: string
  onConfirm: (cats: string[]) => Promise<void>; onClose: () => void
}) {
  const [myCats, setMyCats]             = useState<string[]>([])
  const [sending, setSending]           = useState(false)
  const [rouletteActive, setRouletteActive] = useState(false)
  const [rouletteResult, setRouletteResult] = useState<string | null>(null)
  const [err, setErr]                   = useState<string | null>(null)

  function toggle(cat: string) {
    setMyCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : prev.length < 2 ? [...prev, cat] : prev
    )
  }

  async function handleConfirm() {
    if (myCats.length < 2) return
    setSending(true); setErr(null)

    const allChosen = new Set([...(takenCats ?? []), ...myCats])
    const remaining = DUEL_CATEGORIES.filter(c => !allChosen.has(c))

    setRouletteActive(true)
    let idx = 0; let spins = 0; const maxSpins = 22
    await new Promise<void>(resolve => {
      const spin = setInterval(() => {
        idx = (idx + 1) % (remaining.length || 1)
        setRouletteResult(remaining[idx] ?? '...')
        spins++
        if (spins >= maxSpins) { clearInterval(spin); setRouletteActive(false); resolve() }
      }, 80)
    })

    try {
      await onConfirm(myCats)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error inesperado')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-[#1a1a2e] border border-purple-900/60 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 space-y-4 animate-bounce-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-lg">{title}</h2>
            <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {takenCats && takenCats.length > 0 && (
          <div className="bg-gray-800/60 rounded-xl px-3 py-2">
            <p className="text-gray-500 text-xs">{takenLabel}: <span className="text-gray-300">{takenCats.join(', ')}</span></p>
          </div>
        )}

        <p className="text-gray-400 text-xs text-center">
          Elegí <span className="text-purple-300 font-semibold">2 categorías</span> ({myCats.length}/2)
        </p>

        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {DUEL_CATEGORIES.map(cat => {
            const taken = (takenCats ?? []).includes(cat)
            const sel   = myCats.includes(cat)
            return (
              <button key={cat} onClick={() => !taken && toggle(cat)}
                className={`text-xs font-medium py-2.5 px-3 rounded-xl border transition-all text-left leading-tight ${
                  taken
                    ? 'bg-gray-800/30 border-gray-700/30 text-gray-600 cursor-default'
                    : sel
                      ? 'bg-purple-700 border-purple-500 text-white'
                      : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-purple-600/60 hover:bg-gray-700/60'
                }`}
              >
                {cat}{taken ? ' ★' : ''}
              </button>
            )
          })}
        </div>

        {rouletteResult && (
          <div className="text-center py-1 animate-bounce-in">
            <p className="text-xs text-gray-500 mb-1">🎰 Categoría sorpresa del sistema</p>
            <p className={`text-purple-300 font-bold text-sm ${rouletteActive ? 'animate-pulse' : ''}`}>{rouletteResult}</p>
          </div>
        )}

        {err && <p className="text-red-400 text-sm text-center">{err}</p>}

        <button onClick={handleConfirm} disabled={myCats.length < 2 || sending}
          className={`w-full disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${confirmColor}`}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
          {sending ? 'Un momento...' : confirmLabel}
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DuelosClient({ userId, profile, duels, dailyCount, challengedTodayIds }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const challengeQueryId = searchParams.get('challenge')
  const [modal, setModal]               = useState<Modal>('none')
  const [target, setTarget]             = useState<Player | null>(null)
  const [acceptingDuel, setAcceptingDuel] = useState<DuelRow | null>(null)
  const [globalErr, setGlobalErr]       = useState<string | null>(null)
  const [autoChallengeHandled, setAutoChallengeHandled] = useState(false)

  // ── Player list (fetched client-side) ──────────────────────────────────────
  const [players, setPlayers]       = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [activeTodayIds, setActiveTodayIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    async function fetchPlayers() {
      setLoadingPlayers(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, frame, title, total_score, wins, losses')
        .order('total_score', { ascending: false })

      if (error) {
        console.log('Error fetching players:', error)
        setLoadingPlayers(false)
        return
      }

      console.log('Players fetched:', data?.length, data)
      setPlayers((data as Player[]) ?? [])
      setLoadingPlayers(false)
    }

    async function fetchActiveToday() {
      const todayStr = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('answers')
        .select('user_id')
        .gte('answered_at', `${todayStr}T00:00:00.000Z`)

      if (error) {
        console.log('Error fetching active today:', error)
        return
      }
      setActiveTodayIds(new Set((data ?? []).map((a: { user_id: string }) => a.user_id)))
    }

    fetchPlayers()
    fetchActiveToday()
  }, [])

  // Auto-open challenge modal when arriving with ?challenge=<userId>
  useEffect(() => {
    if (autoChallengeHandled) return
    if (!challengeQueryId) return
    if (loadingPlayers || players.length === 0) return

    const target = players.find(p => p.id === challengeQueryId)
    if (target && target.id !== userId && !challengedTodayIds.includes(target.id) && dailyCount < 3) {
      setTarget(target)
      setModal('pick-cats')
    }
    setAutoChallengeHandled(true)
  }, [challengeQueryId, loadingPlayers, players, autoChallengeHandled, userId, challengedTodayIds, dailyCount])

  const challengedSet = new Set(challengedTodayIds)

  const pendingReceived = duels.filter(d => d.status === 'pending' && d.opponent_id === userId)
  const pendingSent     = duels.filter(d => d.status === 'pending' && d.challenger_id === userId)
  const active          = duels.filter(d => d.status === 'active')
  const finished        = duels.filter(d => d.status === 'finished').slice(0, 5)

  function openChallenge(player: Player) {
    if (dailyCount >= 3) return
    setTarget(player); setModal('pick-cats'); setGlobalErr(null)
  }

  async function handleSendChallenge(cats: string[]) {
    if (!target) return
    const { error, duelId } = await createDuel(target.id, cats)
    if (error) throw new Error(error)
    setModal('none'); setTarget(null)
    if (duelId) router.refresh()
  }

  async function handleAccept(cats: string[]) {
    if (!acceptingDuel) return
    const { error } = await acceptDuel(acceptingDuel.id, cats)
    if (error) throw new Error(error)
    setModal('none'); setAcceptingDuel(null)
    router.refresh()
  }

  async function handleReject(duelId: string) {
    await rejectDuel(duelId); router.refresh()
  }

  async function handleCancel(duelId: string) {
    await cancelDuel(duelId); router.refresh()
  }

  function getOpponent(duel: DuelRow) {
    return duel.challenger_id === userId ? duel.opponent : duel.challenger
  }

  function myFinished(duel: DuelRow) {
    return duel.challenger_id === userId ? duel.challenger_finished : duel.opponent_finished
  }

  function myScore(duel: DuelRow) {
    return duel.challenger_id === userId ? duel.challenger_score : duel.opponent_score
  }

  function opScore(duel: DuelRow) {
    return duel.challenger_id === userId ? duel.opponent_score : duel.challenger_score
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#0d1b2a]">

      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords size={22} className="text-purple-400" />
          <h1 className="text-xl font-bold text-white">Duelos PVP</h1>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
          dailyCount >= 3
            ? 'bg-red-900/30 border-red-700/50 text-red-400'
            : 'bg-purple-900/30 border-purple-700/50 text-purple-300'
        }`}>
          {dailyCount}/3 duelos hoy
        </span>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-4 pb-8">

        {/* My stats */}
        {profile && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Victorias', value: profile.wins,   color: 'text-green-400'  },
              { label: 'Derrotas',  value: profile.losses, color: 'text-red-400'    },
              { label: 'Empates',   value: profile.draws,  color: 'text-yellow-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pending received */}
        {pendingReceived.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Desafíos recibidos</h2>
            <div className="space-y-2">
              {pendingReceived.map(duel => (
                <div key={duel.id} className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl p-4 animate-bounce-in">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar avatarUrl={duel.challenger.avatar_url} firstName={duel.challenger.first_name} size="sm" frame={duel.challenger.frame} />
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{duel.challenger.first_name}</p>
                      <p className="text-yellow-400 text-xs flex items-center gap-1"><Swords size={10} /> @{duel.challenger.username} te desafió</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setAcceptingDuel(duel); setModal('accept-cats') }}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                      Aceptar
                    </button>
                    <button onClick={() => handleReject(duel.id)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pending sent */}
        {pendingSent.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Esperando respuesta</h2>
            <div className="space-y-2">
              {pendingSent.map(duel => (
                <div key={duel.id} className="bg-gray-800/40 border border-gray-700/40 rounded-2xl p-3 flex items-center gap-3">
                  <Avatar avatarUrl={duel.opponent.avatar_url} firstName={duel.opponent.first_name} size="sm" frame={duel.opponent.frame} />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{duel.opponent.first_name}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1"><Clock size={10} /> Pendiente</p>
                  </div>
                  <button onClick={() => handleCancel(duel.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1"><X size={15} /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active */}
        {active.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">En progreso</h2>
            <div className="space-y-2">
              {active.map(duel => {
                const opp  = getOpponent(duel)
                const done = myFinished(duel)
                return (
                  <button key={duel.id} onClick={() => !done && router.push(`/duelos/${duel.id}`)}
                    disabled={done}
                    className="w-full bg-purple-900/30 border border-purple-700/40 rounded-2xl p-4 flex items-center gap-3 hover:border-purple-500/60 transition-all disabled:opacity-60 text-left">
                    <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="sm" frame={opp.frame} />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">vs @{opp.username}</p>
                      <p className="text-purple-400 text-xs">{done ? 'Esperando rival...' : '¡Jugá ahora!'}</p>
                    </div>
                    {done ? <CheckCircle2 size={16} className="text-green-400" /> : <ChevronRight size={16} className="text-purple-400" />}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Results */}
        {finished.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resultados recientes</h2>
            <div className="space-y-2">
              {finished.map(duel => {
                const opp      = getOpponent(duel)
                const isWinner = duel.winner_id === userId
                const isDraw   = !duel.winner_id
                return (
                  <button key={duel.id} onClick={() => router.push(`/duelos/${duel.id}`)}
                    className="w-full bg-gray-800/40 border border-gray-700/40 rounded-2xl p-3 flex items-center gap-3 hover:border-gray-600 transition-all text-left">
                    <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="sm" frame={opp.frame} />
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">vs @{opp.username}</p>
                      <p className={`text-xs font-semibold ${isWinner ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'}`}>
                        {isWinner ? '✓ Victoria' : isDraw ? '= Empate' : '✗ Derrota'} · {myScore(duel)}/{myScore(duel) + opScore(duel)} correctas
                      </p>
                    </div>
                    <ChevronRight size={15} className="text-gray-600" />
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Player list ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jugadores</h2>
            <div className="flex items-center gap-3 text-[10px] text-gray-600">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />activo hoy</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" />inactivo</span>
            </div>
          </div>

          {loadingPlayers ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 size={28} className="text-purple-500 animate-spin" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={36} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No se encontraron jugadores</p>
              <p className="text-gray-700 text-xs mt-1">Revisá la consola del navegador para ver el error</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {players.map((player, i) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isMe={player.id === userId}
                  isActive={activeTodayIds.has(player.id)}
                  alreadyChallenged={challengedSet.has(player.id)}
                  limitReached={dailyCount >= 3}
                  rank={i + 1}
                  onChallenge={() => openChallenge(player)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Challenge modal */}
      {modal === 'pick-cats' && target && (
        <CategoryModal
          title={`Retar a ${target.first_name}`}
          subtitle={`@${target.username}`}
          confirmLabel="¡Enviar desafío!"
          confirmColor="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
          onClose={() => { setModal('none'); setTarget(null) }}
          onConfirm={handleSendChallenge}
        />
      )}

      {/* Accept modal */}
      {modal === 'accept-cats' && acceptingDuel && (
        <CategoryModal
          title="Aceptar desafío"
          subtitle={`${acceptingDuel.challenger.first_name} eligió primero`}
          takenCats={acceptingDuel.categories ?? []}
          takenLabel="Categorías del rival"
          confirmLabel="¡Aceptar y jugar!"
          confirmColor="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
          onClose={() => { setModal('none'); setAcceptingDuel(null) }}
          onConfirm={handleAccept}
        />
      )}

      {globalErr && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-3 rounded-xl text-center z-50 animate-bounce-in">
          {globalErr}
        </div>
      )}
    </div>
  )
}
