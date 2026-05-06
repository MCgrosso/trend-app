// PVP rank system. Mantener en sincronía con migration 021 (compute_pvp_rank,
// pvp_rank_order, apply_blitz_result).

export type PvpRankId = 'Novato' | 'Aprendiz' | 'Veterano' | 'Leyenda'

export interface PvpRank {
  id: PvpRankId
  label: PvpRankId
  icon: string
  minPoints: number
  nextThreshold: number | null
  color: string         // texto principal
  glowColor: string     // sombra/brillo
  bgColor: string
  borderColor: string
  shadow: string
  specialClass?: string
}

export const PVP_RANKS: PvpRank[] = [
  {
    id: 'Novato',
    label: 'Novato',
    icon: '🥉',
    minPoints: 0,
    nextThreshold: 100,
    color: 'text-gray-300',
    glowColor: 'rgba(156,163,175,0.5)',
    bgColor: 'bg-gray-700/30',
    borderColor: 'border-gray-500/50',
    shadow: 'shadow-[0_0_10px_rgba(156,163,175,0.25)]',
  },
  {
    id: 'Aprendiz',
    label: 'Aprendiz',
    icon: '🥈',
    minPoints: 100,
    nextThreshold: 300,
    color: 'text-blue-300',
    glowColor: 'rgba(59,130,246,0.55)',
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-500/50',
    shadow: 'shadow-[0_0_12px_rgba(59,130,246,0.35)]',
  },
  {
    id: 'Veterano',
    label: 'Veterano',
    icon: '🥇',
    minPoints: 300,
    nextThreshold: 600,
    color: 'text-amber-300',
    glowColor: 'rgba(245,158,11,0.55)',
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-500/60',
    shadow: 'shadow-[0_0_14px_rgba(245,158,11,0.45)]',
  },
  {
    id: 'Leyenda',
    label: 'Leyenda',
    icon: '💎',
    minPoints: 600,
    nextThreshold: null,
    color: 'text-cyan-300',
    glowColor: 'rgba(34,211,238,0.7)',
    bgColor: 'bg-cyan-900/30',
    borderColor: 'border-cyan-400/70',
    shadow: 'shadow-[0_0_18px_rgba(34,211,238,0.55)]',
    specialClass: 'animate-shimmer',
  },
]

export function computePvpRank(points: number): PvpRank {
  if (points >= 600) return PVP_RANKS[3]
  if (points >= 300) return PVP_RANKS[2]
  if (points >= 100) return PVP_RANKS[1]
  return PVP_RANKS[0]
}

export function getRank(rankId: string | null | undefined): PvpRank {
  return PVP_RANKS.find(r => r.id === rankId) ?? PVP_RANKS[0]
}

export function rankOrder(rankId: string | null | undefined): number {
  switch (rankId) {
    case 'Leyenda':  return 4
    case 'Veterano': return 3
    case 'Aprendiz': return 2
    case 'Novato':
    default:         return 1
  }
}

// Multiplicador de puntos esperado al ganar contra <opponentRank>, partiendo
// de <myRank>. Mantener en sincronía con apply_blitz_result.
export function rankMultiplier(myRank: string, opponentRank: string): number {
  const me = rankOrder(myRank)
  const opp = rankOrder(opponentRank)
  if (me === opp) return 1.0
  if (opp > me)   return 1.75 // rival superior
  return 0.5                  // rival inferior
}

export function isSameRank(a: string, b: string): boolean {
  return rankOrder(a) === rankOrder(b)
}

// Cálculo de delta (cliente: solo informativo; el servidor confirma vía RPC).
export function computePointsDelta(myRank: string, opponentRank: string, won: boolean): number {
  const sameRank = isSameRank(myRank, opponentRank)
  const opp = rankOrder(opponentRank)
  const me = rankOrder(myRank)
  if (won) {
    if (sameRank)   return 20
    if (opp > me)   return 35
    return 10
  }
  if (sameRank)     return -10
  if (opp > me)     return -5  // perdí contra rango superior
  return -15                   // perdí contra rango inferior
}

export interface RankProgress {
  current: PvpRank
  next: PvpRank | null
  pointsInCurrent: number
  pointsToNext: number | null
  progressPercent: number  // 0-100
}

export function getRankProgress(points: number): RankProgress {
  const safePoints = Math.max(0, points ?? 0)
  const current = computePvpRank(safePoints)
  const idx = PVP_RANKS.findIndex(r => r.id === current.id)
  const next = idx < PVP_RANKS.length - 1 ? PVP_RANKS[idx + 1] : null

  if (!next || current.nextThreshold === null) {
    return { current, next: null, pointsInCurrent: safePoints - current.minPoints, pointsToNext: null, progressPercent: 100 }
  }

  const span = current.nextThreshold - current.minPoints
  const inCurrent = safePoints - current.minPoints
  return {
    current,
    next,
    pointsInCurrent: inCurrent,
    pointsToNext: current.nextThreshold - safePoints,
    progressPercent: Math.min(100, Math.max(0, Math.round((inCurrent / span) * 100))),
  }
}
