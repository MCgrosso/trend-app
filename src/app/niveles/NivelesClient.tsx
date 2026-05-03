'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Check, Lock, X, Sparkles, Star } from 'lucide-react'
import Logo from '@/components/Logo'
import Stars from '@/components/Stars'
import { getXpProgress, MAX_LEVEL } from '@/lib/xp'
import { LEVEL_REWARDS, type LevelReward } from '@/lib/levelRewards'
import { FRAME_MAP } from '@/lib/frames'
import { BG_MAP } from '@/lib/avatarBackgrounds'
import { AVATARS } from '@/lib/avatars'

function motivationalMessage(level: number): string {
  if (level >= 50) return '¡Sos Guardián de la Palabra!'
  if (level >= 45) return '¡Casi un maestro!'
  if (level >= 35) return '¡Imparable!'
  if (level >= 25) return '¡Ya casi llegás!'
  if (level >= 15) return '¡Vas muy bien!'
  if (level >=  5) return '¡Seguí así!'
  return '¡Empezás tu camino!'
}

export default function NivelesClient({
  totalXp,
  currentLevel,
}: {
  totalXp: number
  currentLevel: number
}) {
  const xp = useMemo(() => getXpProgress(totalXp), [totalXp])
  const message = motivationalMessage(currentLevel)
  const rewardsByLevel = useMemo(() => {
    const m = new Map<number, LevelReward[]>()
    for (const r of LEVEL_REWARDS) {
      const arr = m.get(r.level) ?? []
      arr.push(r)
      m.set(r.level, arr)
    }
    return m
  }, [])

  const currentNodeRef = useRef<HTMLDivElement | null>(null)
  const [openReward, setOpenReward] = useState<LevelReward | null>(null)

  useEffect(() => {
    // Scroll automático al nodo del nivel actual al entrar
    const t = setTimeout(() => {
      currentNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen relative">
      <Stars count={90} />

      <div className="relative z-10">
        <header className="px-4 pt-7 pb-4 max-w-lg mx-auto flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-1 text-purple-300/80 hover:text-purple-100 text-sm transition-colors">
            <ChevronLeft size={18} /> Perfil
          </Link>
          <Logo size="sm" />
        </header>

        <div className="px-4 max-w-lg mx-auto pb-12 space-y-5">
          {/* Hero título */}
          <div className="text-center">
            <p className="text-amber-300 text-xs uppercase tracking-[0.3em] font-bold">✦ Tu progresión ✦</p>
            <h1
              className="font-bebas text-4xl sm:text-5xl text-amber-200 leading-none mt-1"
              style={{ textShadow: '0 0 20px rgba(251,191,36,0.7), 0 4px 14px rgba(0,0,0,0.95)' }}
            >
              CAMINO DEL CONOCIMIENTO
            </h1>
            <p className="text-purple-200/80 text-sm mt-2 italic">{message}</p>
          </div>

          {/* Barra global de XP */}
          <div className="relative bg-gradient-to-br from-[#1a0a4e] via-[#0f0a2e] to-[#1a0a4e] border border-cyan-500/40 rounded-2xl p-5 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-cyan-500/20 blur-2xl rounded-full pointer-events-none" />
            <div className="relative">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-cyan-300 text-[10px] uppercase tracking-[0.3em] font-bold">Nivel actual</p>
                  <p className="font-bebas text-5xl text-white leading-none mt-1">{xp.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-cyan-200/80 text-[10px] uppercase tracking-wider">XP total</p>
                  <p className="font-bebas text-2xl text-cyan-100 leading-none">{totalXp}</p>
                </div>
              </div>
              <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-cyan-700/40">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-400 transition-all duration-700"
                  style={{ width: `${xp.percentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1.5 text-[11px] tabular-nums">
                <span className="text-cyan-200/80">{xp.currentXp}/{xp.requiredXp} XP</span>
                <span className="text-cyan-300/60">
                  {xp.level >= MAX_LEVEL ? 'NIVEL MÁXIMO' : `Faltan ${xp.requiredXp - xp.currentXp} XP`}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline de niveles */}
          <div className="relative pt-2">
            {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(level => {
              const status: NodeStatus =
                level < currentLevel ? 'done' :
                level === currentLevel ? 'current' : 'locked'
              const rewards = rewardsByLevel.get(level) ?? []
              const isLast = level === MAX_LEVEL
              return (
                <TimelineNode
                  key={level}
                  level={level}
                  status={status}
                  rewards={rewards}
                  rewardUnlocked={(r) => isRewardUnlocked(r, currentLevel)}
                  showXpBar={status === 'current' && !isLast}
                  xpPercentage={xp.percentage}
                  isLast={isLast}
                  innerRef={status === 'current' ? currentNodeRef : null}
                  onOpenReward={setOpenReward}
                />
              )
            })}
          </div>
        </div>
      </div>

      {openReward && (
        <RewardModal
          reward={openReward}
          unlocked={isRewardUnlocked(openReward, currentLevel)}
          onClose={() => setOpenReward(null)}
        />
      )}
    </div>
  )
}

type NodeStatus = 'done' | 'current' | 'locked'

function isRewardUnlocked(r: LevelReward, currentLevel: number): boolean {
  return r.level <= currentLevel
}

function TimelineNode({
  level, status, rewards, rewardUnlocked, showXpBar, xpPercentage, isLast, innerRef, onOpenReward,
}: {
  level: number
  status: NodeStatus
  rewards: LevelReward[]
  rewardUnlocked: (r: LevelReward) => boolean
  showXpBar: boolean
  xpPercentage: number
  isLast: boolean
  innerRef: React.RefObject<HTMLDivElement | null> | null
  onOpenReward: (r: LevelReward) => void
}) {
  const circleClass =
    status === 'done'
      ? 'bg-gradient-to-br from-amber-400 to-yellow-600 border-amber-300 text-stone-900 shadow-[0_0_14px_rgba(251,191,36,0.6)]'
      : status === 'current'
        ? 'bg-gradient-to-br from-purple-500 to-cyan-500 border-purple-300 text-white animate-pulse-border shadow-[0_0_18px_rgba(124,58,237,0.65)]'
        : 'bg-gray-900/70 border-gray-700/60 text-gray-600'

  return (
    <div ref={innerRef as React.RefObject<HTMLDivElement>} className="relative flex gap-3 pb-4">
      {/* Línea conectora vertical */}
      {!isLast && (
        <span
          className={`absolute left-[22px] top-12 w-0.5 ${
            status === 'done' ? 'bg-gradient-to-b from-amber-400/70 to-purple-700/40' : 'bg-purple-800/40'
          }`}
          style={{ height: 'calc(100% - 24px)' }}
          aria-hidden
        />
      )}

      {/* Nodo circular */}
      <div className="flex-shrink-0 z-10">
        <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bebas text-base ${circleClass}`}>
          {status === 'done' ? <Check size={18} strokeWidth={3} /> :
           status === 'locked' ? <Lock size={14} /> : level}
        </div>
        {status === 'current' && (
          <p className="text-purple-300 text-[9px] font-bold uppercase tracking-widest text-center mt-1">Vos</p>
        )}
      </div>

      {/* Contenido a la derecha del nodo */}
      <div className="flex-1 min-w-0 pt-1">
        <p className={`font-bebas text-lg leading-none ${
          status === 'done' ? 'text-amber-200' : status === 'current' ? 'text-white' : 'text-gray-500'
        }`}>
          NIVEL {level}
        </p>

        {/* Recompensas (si las hay) */}
        {rewards.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {rewards.map(r => (
              <RewardChip key={`${r.level}-${r.id}`} reward={r} unlocked={rewardUnlocked(r)} onClick={() => onOpenReward(r)} />
            ))}
          </div>
        )}

        {/* Barra XP entre nivel actual y siguiente */}
        {showXpBar && (
          <div className="mt-3 mb-1">
            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-purple-700/30">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-purple-300/60 mt-1 text-right">{xpPercentage}% al nivel {level + 1}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RewardChip({
  reward, unlocked, onClick,
}: {
  reward: LevelReward
  unlocked: boolean
  onClick: () => void
}) {
  const kindLabel: Record<string, string> = {
    frame: 'Marco', avatar: 'Avatar', bg: 'Fondo', title: 'Título',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
        unlocked
          ? 'bg-amber-900/20 border-amber-700/40 hover:border-amber-400/70'
          : 'bg-gray-800/40 border-gray-700/40 hover:border-gray-500/60'
      }`}
    >
      <RewardPreview reward={reward} unlocked={unlocked} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${unlocked ? 'text-amber-100' : 'text-gray-400'}`}>{reward.label}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{kindLabel[reward.kind] ?? reward.kind}</p>
      </div>
      <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        unlocked
          ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
          : 'bg-gray-700/40 border border-gray-600/40 text-gray-400'
      }`}>
        {unlocked ? 'Obtenida ✓' : `Nivel ${reward.level}`}
      </span>
    </button>
  )
}

function RewardPreview({ reward, unlocked }: { reward: LevelReward; unlocked: boolean }) {
  // Mini preview del item: 36x36
  const lockedFilter = unlocked ? '' : 'opacity-30 grayscale'

  if (reward.kind === 'frame') {
    const f = FRAME_MAP[reward.id]
    return (
      <div className={`w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 ${f?.cssClass ?? ''} ${lockedFilter}`}>
        <span className="text-base">{reward.emoji ?? '◆'}</span>
      </div>
    )
  }
  if (reward.kind === 'avatar') {
    const a = AVATARS[reward.id]
    return (
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${lockedFilter}`}
        style={{ backgroundColor: a?.bg ?? '#374151' }}
      >
        {a?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.image} alt={a.label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg">{a?.emoji ?? reward.emoji ?? '?'}</span>
        )}
      </div>
    )
  }
  if (reward.kind === 'bg') {
    const b = BG_MAP[reward.id]
    const style: React.CSSProperties = b?.image
      ? { backgroundImage: `url('${b.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : {}
    return (
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${b?.cssClass ?? ''} ${lockedFilter}`}
        style={style}
      >
        <span className="text-base drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">{reward.emoji ?? '◆'}</span>
      </div>
    )
  }
  // title
  return (
    <div className={`w-9 h-9 rounded-full bg-amber-700/40 flex items-center justify-center flex-shrink-0 ${lockedFilter}`}>
      <span className="text-base">{reward.emoji ?? '🏷️'}</span>
    </div>
  )
}

function RewardModal({
  reward, unlocked, onClose,
}: {
  reward: LevelReward
  unlocked: boolean
  onClose: () => void
}) {
  const kindLabel: Record<string, string> = {
    frame: 'Marco animado', avatar: 'Avatar especial', bg: 'Fondo de avatar', title: 'Título',
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-bounce-in">
      <div className="relative w-full max-w-xs bg-gradient-to-b from-[#1a0a4e] to-[#0f0a2e] border-2 border-amber-500/60 rounded-2xl p-5 text-center">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-white">
          <X size={18} />
        </button>

        <p className="text-amber-300 text-[10px] uppercase tracking-[0.3em] font-bold">Recompensa · Nivel {reward.level}</p>

        <div className="mt-4 flex justify-center">
          <div className="w-20 h-20">
            <RewardPreview reward={reward} unlocked={unlocked} />
          </div>
        </div>

        <h3 className="font-bebas text-2xl text-white mt-3 leading-none">{reward.label}</h3>
        <p className="text-purple-200/70 text-xs mt-1">{kindLabel[reward.kind] ?? reward.kind}</p>

        <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          unlocked
            ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
            : 'bg-gray-700/40 border border-gray-600/40 text-gray-300'
        }`}>
          {unlocked
            ? (<><Sparkles size={12} /> Obtenida</>)
            : (<><Star size={12} /> Llegá al nivel {reward.level}</>)}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-xl text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
