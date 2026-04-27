'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import ClanShield from '@/components/ClanShield'
import ChurchBadge from '@/components/ChurchBadge'
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
  avatar_bg: string | null
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
  is_inter_church?: boolean | null
  challenger: DuelProfile
  opponent: DuelProfile
}

interface ClanInfo {
  id: string; name: string;
  shield_color: string | null; shield_bg: string | null; shield_icon: string | null
}
interface ChurchInfo {
  id: string; name: string; abbreviation: string | null; icon_emoji: string | null
}

interface Player {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
  frame: string | null
  avatar_bg: string | null
  title: string | null
  total_score: number
  wins: number
  losses: number
  church_id?: string | null
  clan_id?: string | null
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
  myChurchId: string | null
  isAmbassador: boolean
}

type Modal = 'none' | 'pick-cats' | 'accept-cats'

// ── Player card ───────────────────────────────────────────────────────────────

function PlayerCard({
  player, isMe, isActive, alreadyChallenged, limitReached, rank, onChallenge,
  clan, church,
}: {
  player: Player; isMe: boolean; isActive: boolean
  alreadyChallenged: boolean; limitReached: boolean; rank: number
  onChallenge: () => void
  clan?: ClanInfo | null
  church?: ChurchInfo | null
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
          <Avatar avatarUrl={player.avatar_url} firstName={player.first_name} size="sm" frame={player.frame} bg={player.avatar_bg} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-white font-semibold text-sm truncate group-hover:text-cyan-300 transition-colors">{player.first_name} {player.last_name}</p>
              {isMe && <span className="text-[10px] bg-purple-700/60 text-purple-200 px-1.5 py-0.5 rounded-full font-medium">Tú</span>}
              {clan && (
                <span title={clan.name}>
                  <ClanShield
                    shield_bg={clan.shield_bg}
                    shield_color={clan.shield_color}
                    shield_icon={clan.shield_icon}
                    size="xs"
                    glow={false}
                  />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <p className="text-gray-500 text-xs group-hover:text-cyan-400/80 transition-colors">@{player.username}</p>
              {church && (
                <ChurchBadge
                  icon_emoji={church.icon_emoji}
                  name={church.name}
                  abbreviation={church.abbreviation}
                  size="xs"
                  highlight={church.abbreviation === 'MVDA'}
                />
              )}
            </div>
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

export default function DuelosClient({ userId, profile, duels, dailyCount, challengedTodayIds, myChurchId, isAmbassador }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const challengeQueryId = searchParams.get('challenge')
  const [modal, setModal]               = useState<Modal>('none')
  const [target, setTarget]             = useState<Player | null>(null)
  const [acceptingDuel, setAcceptingDuel] = useState<DuelRow | null>(null)
  const [globalErr, setGlobalErr]       = useState<string | null>(null)
  const [autoChallengeHandled, setAutoChallengeHandled] = useState(false)
  const [scope, setScope]               = useState<'all' | 'inter'>('all')

  // ── Player list (fetched client-side) ──────────────────────────────────────
  const [players, setPlayers]       = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [activeTodayIds, setActiveTodayIds] = useState<Set<string>>(new Set())
  const [clansById,   setClansById]   = useState<Map<string, ClanInfo>>(new Map())
  const [churchesById, setChurchesById] = useState<Map<string, ChurchInfo>>(new Map())

  useEffect(() => {
    const supabase = createClient()

    async function fetchPlayers() {
      setLoadingPlayers(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url, frame, avatar_bg, title, total_score, wins, losses, church_id, clan_id')
        .order('total_score', { ascending: false })

      if (error) {
        console.log('Error fetching players:', error)
        setLoadingPlayers(false)
        return
      }

      console.log('Players fetched:', data?.length, data)
      const list = (data as Player[]) ?? []
      setPlayers(list)
      setLoadingPlayers(false)

      // Also fetch the clan + church info referenced by the player list
      const clanIds   = Array.from(new Set(list.map(p => p.clan_id).filter(Boolean) as string[]))
      const churchIds = Array.from(new Set(list.map(p => p.church_id).filter(Boolean) as string[]))

      if (clanIds.length > 0) {
        const { data: clans } = await supabase
          .from('clans')
          .select('id, name, shield_color, shield_bg, shield_icon')
          .in('id', clanIds)
        setClansById(new Map((clans ?? []).map(c => [c.id, c as ClanInfo])))
      }
      if (churchIds.length > 0) {
        const { data: churches } = await supabase
          .from('churches')
          .select('id, name, abbreviation, icon_emoji')
          .in('id', churchIds)
        setChurchesById(new Map((churches ?? []).map(c => [c.id, c as ChurchInfo])))
      }
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

  // ── Realtime: refresh when any duel involving me changes ────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`duels-rt-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `opponent_id=eq.${userId}` },
        (payload) => {
          console.log('[duels-rt] opponent_id event:', payload.eventType, payload)
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `challenger_id=eq.${userId}` },
        (payload) => {
          console.log('[duels-rt] challenger_id event:', payload.eventType, payload)
          router.refresh()
        }
      )
      .subscribe((status) => {
        console.log('[duels-rt] subscription status:', status)
      })

    return () => {
      console.log('[duels-rt] unsubscribing')
      supabase.removeChannel(channel)
    }
  }, [userId, router])

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

  const visibleDuels = scope === 'inter' ? duels.filter(d => d.is_inter_church === true) : duels
  const pendingReceived = visibleDuels.filter(d => d.status === 'pending' && d.opponent_id === userId)
  const pendingSent     = visibleDuels.filter(d => d.status === 'pending' && d.challenger_id === userId)
  const active          = visibleDuels.filter(d => d.status === 'active')
  const finished        = visibleDuels.filter(d => d.status === 'finished').slice(0, 5)

  const visiblePlayers = useMemo(() => {
    if (scope !== 'inter') return players
    if (!myChurchId) return [] // user has no church; show nothing in inter tab
    return players.filter(p => p.id === userId || (p.church_id && p.church_id !== myChurchId))
  }, [players, scope, myChurchId, userId])

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
        <div className="flex items-center gap-2 flex-wrap">
          <Swords size={22} className="text-purple-400" />
          <h1 className="text-xl font-bold text-white">Duelos PVP</h1>
          {isAmbassador && (
            <span
              title="Embajador: el jugador de tu iglesia con más victorias inter-iglesias"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-400/60 text-amber-200 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            >
              🎖️ Embajador
            </span>
          )}
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

        {/* Scope tabs */}
        <div className="flex gap-1 p-1 bg-[#0f0a2e]/80 rounded-xl border border-purple-700/40">
          <button
            onClick={() => setScope('all')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              scope === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setScope('inter')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              scope === 'inter'
                ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            ⚔️ Inter-Iglesias
          </button>
        </div>

        {scope === 'inter' && !myChurchId && (
          <div className="bg-amber-900/20 border border-amber-700/40 text-amber-200 text-xs p-3 rounded-xl">
            Para participar de duelos inter-iglesias, elegí tu iglesia en{' '}
            <Link href="/profile" className="underline">tu perfil</Link>.
          </div>
        )}

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
                    <Avatar avatarUrl={duel.challenger.avatar_url} firstName={duel.challenger.first_name} size="sm" frame={duel.challenger.frame} bg={duel.challenger.avatar_bg} />
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
                  <Avatar avatarUrl={duel.opponent.avatar_url} firstName={duel.opponent.first_name} size="sm" frame={duel.opponent.frame} bg={duel.opponent.avatar_bg} />
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
                    <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="sm" frame={opp.frame} bg={opp.avatar_bg} />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-white text-sm font-medium">vs @{opp.username}</p>
                        {duel.is_inter_church && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-1.5 py-0.5 rounded-full">
                            ⚔️ Inter
                          </span>
                        )}
                      </div>
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
                    <Avatar avatarUrl={opp.avatar_url} firstName={opp.first_name} size="sm" frame={opp.frame} bg={opp.avatar_bg} />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-white text-sm font-medium">vs @{opp.username}</p>
                        {duel.is_inter_church && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-1.5 py-0.5 rounded-full">
                            ⚔️ Inter
                          </span>
                        )}
                      </div>
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
          ) : visiblePlayers.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={36} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">
                {scope === 'inter'
                  ? 'No hay jugadores de otras iglesias todavía'
                  : 'No se encontraron jugadores'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visiblePlayers.map((player, i) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isMe={player.id === userId}
                  isActive={activeTodayIds.has(player.id)}
                  alreadyChallenged={challengedSet.has(player.id)}
                  limitReached={dailyCount >= 3}
                  rank={i + 1}
                  onChallenge={() => openChallenge(player)}
                  clan={player.clan_id ? clansById.get(player.clan_id) : null}
                  church={player.church_id ? churchesById.get(player.church_id) : null}
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
