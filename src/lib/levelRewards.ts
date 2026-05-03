// Tabla de recompensas por nivel. Cada recompensa apunta a una entry concreta
// en frames.ts / avatars.ts / avatarBackgrounds.ts (las nuevas entradas viven
// en sus archivos respectivos y este módulo es solo el mapping de unlock).

export type RewardKind = 'frame' | 'avatar' | 'bg' | 'title'

export type LevelReward = {
  level: number
  kind: RewardKind
  id: string          // id de la frame/avatar/bg/title que se desbloquea
  label: string       // texto humano para mostrar en el perfil
  emoji?: string
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 5,  kind: 'frame',  id: 'aprendiz_dorado', label: 'Marco Aprendiz Dorado', emoji: '🥇' },
  { level: 10, kind: 'avatar', id: 'avatar_pergamino', label: 'Avatar Pergamino',     emoji: '📜' },
  { level: 15, kind: 'frame',  id: 'sabio',           label: 'Marco Sabio',           emoji: '🤍' },
  { level: 20, kind: 'bg',     id: 'cosmos',          label: 'Fondo Cosmos',          emoji: '🌌' },
  { level: 25, kind: 'frame',  id: 'profeta_frame',   label: 'Marco Profeta',         emoji: '🔮' },
  { level: 30, kind: 'avatar', id: 'avatar_corona',   label: 'Avatar Corona',         emoji: '👑' },
  { level: 35, kind: 'frame',  id: 'rey',             label: 'Marco Rey',             emoji: '👑' },
  { level: 40, kind: 'bg',     id: 'fuego_sagrado',   label: 'Fondo Fuego Sagrado',   emoji: '🔥' },
  { level: 45, kind: 'frame',  id: 'leyenda',         label: 'Marco Leyenda',         emoji: '🌈' },
  { level: 50, kind: 'avatar', id: 'avatar_angel',    label: 'Avatar Ángel + título Guardián de la Palabra', emoji: '😇' },
]

export const TITLE_GUARDIAN = 'guardian_de_la_palabra'

// Devuelve la recompensa del próximo nivel (la primera con level > current).
export function getNextReward(currentLevel: number): LevelReward | null {
  return LEVEL_REWARDS.find(r => r.level > currentLevel) ?? null
}

// Devuelve todas las recompensas ya desbloqueadas para un nivel dado.
export function getUnlockedRewards(currentLevel: number): LevelReward[] {
  return LEVEL_REWARDS.filter(r => r.level <= currentLevel)
}
