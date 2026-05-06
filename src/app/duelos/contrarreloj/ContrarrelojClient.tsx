'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import PvpRankBadge from '@/components/PvpRankBadge'
import { createClient } from '@/lib/supabase/client'
import { computePvpRank, rankMultiplier, isSameRank, getRank, rankOrder, computePointsDelta } from '@/lib/pvpRanks'
import { createBlitzDuel, acceptBlitzDuel, rejectBlitzDuel, cancelBlitzDuel, type BlitzMode } from './actions'
import { Swords, X, Clock, Loader2, Timer, ChevronRight, Hourglass } from 'lucide-react'

interface PlayerRow {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  frame: string | null
  avatar_bg: string | null
  pvp_rank: string | null
  pvp_points: number | null
  pvp_total_games: number | null
  pvp_win_percentage: number | null
  blitz_wins: number | null
  dynamic_wins: number | null
}

interface ProfileRow {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  frame: string | null
  avatar_bg: string | null
  pvp_rank: string | null
  pvp_points: number | null
  pvp_win_streak: number | null
  pvp_best_streak: number | null
  pvp_total_games: number | null
  pvp_win_percentage: number | null
  blitz_wins: number | null
  blitz_best_score: number | null
  dynamic_wins: number | null
  dynamic_best_time: number | null
}

interface BlitzDuelRow {
  id: string
  challenger_id: string
  opponent_id: string
  mode: BlitzMode
  status: 'pending' | 'active' | 'finished'
  challenger_score: number
  opponent_score: number
  challenger_time_survived: number
  opponent_time_survived: number
  rank_multiplier: number
  same_rank: boolean
  winner_id: string | null
  challenger: { id: string; username: string; first_name: string; avatar_url: string | null; frame: string | null; avatar_bg: string | null; pvp_rank: string | null; pvp_points: number | null }
  opponent:   { id: string; username: string; first_name: string; avatar_url: string | null; frame: string | null; avatar_bg: string | null; pvp_rank: string | null; pvp_points: number | null }
}

interface Props {
  userId: string
  profile: ProfileRow | null
  blitzDuels: BlitzDuelRow[]
  players: PlayerRow[]
}

export default function ContrarrelojClient({ userId, profile, blitzDuels, players }: Props) {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<BlitzMode>('blitz')
  const [target, setTarget] = useState<PlayerRow | null>(null)
  const [sending, setSending] = useState(false)
  const [globalErr, setGlobalErr] = useState<string | null>(null)

  const myRank = profile?.pvp_rank ?? computePvpRank(profile?.pvp_points ?? 0).id

  // Realtime: refresh on any change to my blitz_duels rows
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`blitz-duels-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blitz_duels', filter: `challenger_id=eq.${userId}` },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blitz_duels', filter: `opponent_id=eq.${userId}` },
        () => router.refresh()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, router])

  const visiblePlayers = useMemo(() => {
    // Ordenar: mismo rango primero (recomendados), después por pvp_points desc
    const myOrd = rankOrder(myRank)
    const arr = [...players]
    arr.sort((a, b) => {
      const sameA = rankOrder(a.pvp_rank) === myOrd ? 0 : 1
      const sameB = rankOrder(b.pvp_rank) === myOrd ? 0 : 1
      if (sameA !== sameB) return sameA - sameB
      return (b.pvp_points ?? 0) - (a.pvp_points ?? 0)
    })
    return arr
  }, [players, myRank])

  const pendingReceived = blitzDuels.filter(d => d.status === 'pending' && d.opponent_id === userId)
  const pendingSent     = blitzDuels.filter(d => d.status === 'pending' && d.challenger_id === userId)
  const active          = blitzDuels.filter(d => d.status === 'active')
  const finished        = blitzDuels.filter(d => d.status === 'finished').slice(0, 5)

  async function handleSendChallenge() {
    if (!target) return
    setSending(true); setGlobalErr(null)
    const { error, duelId } = await createBlitzDuel(target.id, selectedMode)
    if (error) {
      setGlobalErr(error)
      setSending(false)
      return
    }
    setTarget(null)
    setSending(false)
    if (duelId) router.refresh()
  }

  async function handleAccept(duel: BlitzDuelRow) {
    const { error } = await acceptBlitzDuel(duel.id)
    if (error) { setGlobalErr(error); return }
    router.push(`/duelos/contrarreloj/${duel.id}`)
  }

  async function handleReject(id: string) {
    await rejectBlitzDuel(id); router.refresh()
  }

  async function handleCancel(id: string) {
    await cancelBlitzDuel(id); router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs Blitz / Dinámico */}
      <div className="grid grid-cols-2 gap-3">
        <ModeCard
          mode="blitz"
          selected={selectedMode === 'blitz'}
          onSelect={() => setSelectedMode('blitz')}
          title="Blitz 60s"
          icon={<Timer size={20} className="text-amber-300" />}
          description="60 segundos. Más correctas gana."
          stat1Label="Victorias"
          stat1Value={profile?.blitz_wins ?? 0}
          stat2Label="Mejor"
          stat2Value={profile?.blitz_best_score ?? 0}
        />
        <ModeCard
          mode="dynamic"
          selected={selectedMode === 'dynamic'}
          onSelect={() => setSelectedMode('dynamic')}
          title="Dinámico"
          icon={<Hourglass size={20} className="text-cyan-300" />}
          description="30s. +5 acierto / -5 fallo."
          stat1Label="Victorias"
          stat1Value={profile?.dynamic_wins ?? 0}
          stat2Label="Mejor (s)"
          stat2Value={profile?.dynamic_best_time ?? 0}
        />
      </div>

      {/* Mi rango / mis stats PVP rápidas */}
      {profile && (
        <div className="bg-gradient-to-br from-[#1a0a4e]/70 to-[#0f0a2e] border border-purple-500/40 rounded-2xl p-4 flex items-center gap-4">
          <Avatar avatarUrl={profile.avatar_url} firstName={profile.first_name} size="md" frame={profile.frame} bg={profile.avatar_bg} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{profile.first_name} {profile.last_name}</p>
            <div className="mt-1"><PvpRankBadge rank={myRank} size="sm" /></div>
          </div>
          <div className="text-right">
            <p className="text-amber-300 font-bebas text-2xl leading-none">{profile.pvp_points ?? 0}</p>
            <p className="text-amber-200/70 text-[10px] uppercase tracking-wider">PVP pts</p>
          </div>
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
                  <Avatar avatarUrl={duel.challenger.avatar_url} firstName={duel.challenger.first_name} size="sm" frame={duel.challenger.frame} bg={duel.challenger.avatar_bg} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{duel.challenger.first_name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <PvpRankBadge rank={duel.challenger.pvp_rank} size="xs" />
                      <span className="text-[10px] uppercase tracking-wider bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded-full">
                        {duel.mode === 'blitz' ? '⚡ Blitz 60s' : '⏳ Dinámico'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(duel)}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2 rounded-xl transition-colors">
                    Aceptar y jugar
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
                <Avatar avatarUrl={duel.opponent.avatar_url} firstName={duel.opponent.first_name} size="sm" frame={duel.opponent.frame} bg={duel.opponent.avatar_bg} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{duel.opponent.first_name}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1"><Clock size={10} /> {duel.mode === 'blitz' ? '⚡ Blitz' : '⏳ Dinámico'}</p>
                </div>
                <button onClick={() => handleCancel(duel.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1"><X size={15} /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active blitz duels */}
      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">En progreso</h2>
          <div className="space-y-2">
            {active.map(duel => {
              const opp = duel.challenger_id === userId ? duel.opponent : duel.challenger
              return (
                <button key={duel.id} onClick={() => router.push(`/duelos/contrarreloj/${duel.id}`)}
                  className="w-full bg-purple-900/30 border border-purple-700/40 rounded-2xl p-4 flex items-center gap-3 hover:border-purple-500/60 transition-all text-left">
                  <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="sm" frame={opp.frame} bg={opp.avatar_bg} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">vs @{opp.username}</p>
                    <p className="text-purple-400 text-xs">{duel.mode === 'blitz' ? '⚡ Blitz 60s' : '⏳ Dinámico'} · ¡Jugá ahora!</p>
                  </div>
                  <ChevronRight size={16} className="text-purple-400" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent results */}
      {finished.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resultados recientes</h2>
          <div className="space-y-2">
            {finished.map(duel => {
              const opp = duel.challenger_id === userId ? duel.opponent : duel.challenger
              const isWinner = duel.winner_id === userId
              const isDraw = !duel.winner_id
              const myScore = duel.challenger_id === userId ? duel.challenger_score : duel.opponent_score
              const opScore = duel.challenger_id === userId ? duel.opponent_score : duel.challenger_score
              return (
                <div key={duel.id} className="w-full bg-gray-800/40 border border-gray-700/40 rounded-2xl p-3 flex items-center gap-3">
                  <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="sm" frame={opp.frame} bg={opp.avatar_bg} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">vs @{opp.username}</p>
                    <p className={`text-xs font-semibold ${isWinner ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'}`}>
                      {isWinner ? '✓ Victoria' : isDraw ? '= Empate' : '✗ Derrota'} · {myScore}/{opScore} ({duel.mode === 'blitz' ? 'Blitz' : 'Dinámico'})
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Player list */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Rivales — modo {selectedMode === 'blitz' ? '⚡ Blitz' : '⏳ Dinámico'}
        </h2>
        <div className="space-y-2">
          {visiblePlayers.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">Aún no hay otros jugadores.</p>
          )}
          {visiblePlayers.map(p => {
            const isMe = p.id === userId
            if (isMe) return null
            const sameRank = isSameRank(myRank, p.pvp_rank ?? 'Novato')
            const mult = rankMultiplier(myRank, p.pvp_rank ?? 'Novato')
            return (
              <div key={p.id} className={`bg-gray-800/40 border rounded-2xl p-3 ${sameRank ? 'border-purple-500/40' : 'border-gray-700/40'}`}>
                <div className="flex items-center gap-3">
                  <Avatar avatarUrl={p.avatar_url} firstName={p.first_name} size="sm" frame={p.frame} bg={p.avatar_bg} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-white font-semibold text-sm truncate">{p.first_name} {p.last_name}</p>
                      <PvpRankBadge rank={p.pvp_rank} size="xs" />
                      {sameRank && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/25 text-purple-200 border border-purple-400/40 px-1.5 py-0.5 rounded-full">
                          🎯 Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      @{p.username} · {p.pvp_points ?? 0} pts · {p.pvp_win_percentage ?? 0}% wr
                    </p>
                  </div>
                  <button
                    onClick={() => setTarget(p)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md active:scale-[0.98]"
                  >
                    ⚔️ Retar
                  </button>
                </div>
                {!sameRank && (
                  <p className="text-[10px] text-gray-500 mt-2">
                    Multiplicador: <span className={mult > 1 ? 'text-emerald-300 font-bold' : 'text-orange-300 font-bold'}>{mult.toFixed(2)}x</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Challenge modal */}
      {target && (
        <ChallengeModal
          target={target}
          mode={selectedMode}
          myRank={myRank}
          sending={sending}
          onClose={() => setTarget(null)}
          onConfirm={handleSendChallenge}
        />
      )}

      {globalErr && (
        <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-3 rounded-xl text-center z-50">
          {globalErr}
        </div>
      )}
    </div>
  )
}

function ModeCard({
  mode, selected, onSelect, title, icon, description, stat1Label, stat1Value, stat2Label, stat2Value,
}: {
  mode: BlitzMode
  selected: boolean
  onSelect: () => void
  title: string
  icon: React.ReactNode
  description: string
  stat1Label: string; stat1Value: number
  stat2Label: string; stat2Value: number
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-2xl p-3 border-2 transition-all ${
        selected
          ? mode === 'blitz'
            ? 'bg-gradient-to-br from-amber-900/40 to-orange-900/30 border-amber-400/70 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
            : 'bg-gradient-to-br from-cyan-900/40 to-blue-900/30 border-cyan-400/70 shadow-[0_0_18px_rgba(34,211,238,0.35)]'
          : 'bg-gray-800/40 border-gray-700/40 hover:border-gray-600/60'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-white font-bold text-sm">{title}</p>
      </div>
      <p className="text-gray-400 text-[11px] mb-2 leading-snug">{description}</p>
      <div className="flex justify-between text-[10px] text-gray-300">
        <div>
          <p className="text-gray-500 uppercase tracking-wider">{stat1Label}</p>
          <p className="text-white font-bold">{stat1Value}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 uppercase tracking-wider">{stat2Label}</p>
          <p className="text-white font-bold">{stat2Value}</p>
        </div>
      </div>
    </button>
  )
}

function ChallengeModal({
  target, mode, myRank, sending, onClose, onConfirm,
}: {
  target: PlayerRow
  mode: BlitzMode
  myRank: string
  sending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const oppRank = target.pvp_rank ?? 'Novato'
  const sameRank = isSameRank(myRank, oppRank)
  const mult = rankMultiplier(myRank, oppRank)
  const expectedWinDelta = computePointsDelta(myRank, oppRank, true)
  const expectedLossDelta = computePointsDelta(myRank, oppRank, false)
  const r = getRank(oppRank)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-[#1a1a2e] border border-purple-900/60 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 space-y-4 animate-bounce-in">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-lg">Retar a {target.first_name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="bg-gray-800/60 rounded-xl p-3 flex items-center gap-3">
          <Avatar avatarUrl={target.avatar_url} firstName={target.first_name} size="sm" frame={target.frame} bg={target.avatar_bg} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">@{target.username}</p>
            <div className="mt-1"><PvpRankBadge rank={oppRank} size="xs" /></div>
          </div>
        </div>

        <div className={`rounded-xl p-3 border ${mode === 'blitz' ? 'bg-amber-900/20 border-amber-700/40' : 'bg-cyan-900/20 border-cyan-700/40'}`}>
          <p className="text-white text-sm font-bold mb-1">
            {mode === 'blitz' ? '⚡ Blitz 60 segundos' : '⏳ Dinámico (30s + recargas)'}
          </p>
          <p className="text-gray-300 text-xs leading-snug">
            {mode === 'blitz'
              ? 'Tenés 60 segundos para responder la mayor cantidad de preguntas. Cada acierto suma 1.'
              : 'Empezás con 30s. Cada acierto suma 5s, cada error resta 5s. Si llegás a 0, perdés.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-xl p-3 border text-center ${sameRank ? 'bg-purple-500/15 border-purple-400/50' : 'bg-gray-800/40 border-gray-700/40'}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Multiplicador</p>
            <p className={`font-bebas text-2xl leading-none mt-1 ${mult > 1 ? 'text-emerald-300' : mult < 1 ? 'text-orange-300' : 'text-purple-200'}`}>{mult.toFixed(2)}x</p>
            {sameRank
              ? <p className="text-[10px] text-purple-200 mt-1 font-bold">MISMO RANGO 🎯</p>
              : mult > 1
                ? <p className="text-[10px] text-emerald-300 mt-1 font-bold">SUBIDA RÁPIDA ⬆️</p>
                : <p className="text-[10px] text-orange-300 mt-1">Riesgo alto</p>}
          </div>
          <div className={`rounded-xl p-3 border text-center ${r.bgColor} ${r.borderColor}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Rango rival</p>
            <p className={`font-bebas text-2xl leading-none mt-1 ${r.color}`}>{r.icon}</p>
            <p className={`text-[11px] font-bold mt-1 ${r.color}`}>{r.label}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-2">
            <p className="text-[10px] text-emerald-300/80 uppercase tracking-wider">Si ganás</p>
            <p className="text-emerald-300 font-bold">+{expectedWinDelta}</p>
          </div>
          <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-2">
            <p className="text-[10px] text-red-300/80 uppercase tracking-wider">Si perdés</p>
            <p className="text-red-300 font-bold">{expectedLossDelta}</p>
          </div>
        </div>

        <button
          onClick={onConfirm}
          disabled={sending}
          className="w-full disabled:opacity-40 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
          {sending ? 'Enviando...' : '¡Enviar desafío!'}
        </button>
      </div>
    </div>
  )
}
