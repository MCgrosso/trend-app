// Sistema de XP / niveles. Coherente con award_xp() de la migración 019.
// Fórmula: xpForLevel(n) = 100 + (n-1) * 50  (XP que necesitás para pasar de n a n+1)
// XP acumulado para alcanzar nivel L = sum k=1..L-1 (100 + (k-1)*50)
//                                    = (L-1)*100 + 25*(L-1)*(L-2)
// Ej: nivel 1 = 0 acumulado, nivel 2 = 100, nivel 3 = 100+150 = 250, nivel 4 = 100+150+200 = 450, ...

export const MAX_LEVEL = 50

export function xpForLevel(n: number): number {
  return 100 + (n - 1) * 50
}

// XP total acumulado necesario para *alcanzar* el nivel L (estar en él).
export function totalXpForLevel(L: number): number {
  if (L <= 1) return 0
  return (L - 1) * 100 + 25 * (L - 1) * (L - 2)
}

export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1
  for (let L = 1; L < MAX_LEVEL; L++) {
    if (totalXp < totalXpForLevel(L + 1)) return L
  }
  return MAX_LEVEL
}

// Devuelve cuánto XP llevás dentro del nivel actual + cuánto necesitás para
// el siguiente + porcentaje (0-100). Si estás en MAX_LEVEL, percentage=100.
export function getXpProgress(totalXp: number): {
  level: number
  currentXp: number
  requiredXp: number
  percentage: number
  nextLevelTotal: number
} {
  const level   = getLevelFromXp(totalXp)
  const floor   = totalXpForLevel(level)
  const ceiling = totalXpForLevel(level + 1)
  if (level >= MAX_LEVEL) {
    return { level, currentXp: 0, requiredXp: 0, percentage: 100, nextLevelTotal: floor }
  }
  const currentXp  = totalXp - floor
  const requiredXp = ceiling - floor
  const percentage = Math.min(100, Math.round((currentXp / requiredXp) * 100))
  return { level, currentXp, requiredXp, percentage, nextLevelTotal: ceiling }
}

// XP otorgado por cada acción del spec (centralizado para evitar números mágicos).
export const XP_REWARDS = {
  TRIVIA_CORRECT:    5,
  TRIVIA_WRONG:      1,
  ALL_DAILIES_BONUS: 20,
  RANKED_WIN:        30,
  RANKED_LOSS:       10,
  RANKED_DRAW:       15,
  UNRANKED_WIN:      15,
  UNRANKED_LOSS:     5,
  UNRANKED_DRAW:     10,
  STORY_CHAPTER:     25,
  PALABRA_OCULTA:    20,
  STREAK_3_BONUS:    10,
  STREAK_7_BONUS:    30,
} as const
