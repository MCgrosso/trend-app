export interface AvatarBg {
  id: string
  label: string
  category: 'basic' | 'special'
  cssClass: string        // applied on the avatar's outer div
  previewColor: string    // flat color for swatches when not animating
  emoji?: string
  unlock?: string         // human-readable unlock requirement (special only)
}

export const AVATAR_BGS: AvatarBg[] = [
  // Básicos (7) — siempre disponibles
  { id: 'purple', label: 'Morado', category: 'basic', cssClass: 'bg-av-purple', previewColor: '#7c3aed' },
  { id: 'blue',   label: 'Azul',   category: 'basic', cssClass: 'bg-av-blue',   previewColor: '#2563eb' },
  { id: 'green',  label: 'Verde',  category: 'basic', cssClass: 'bg-av-green',  previewColor: '#10b981' },
  { id: 'red',    label: 'Rojo',   category: 'basic', cssClass: 'bg-av-red',    previewColor: '#dc2626' },
  { id: 'orange', label: 'Naranja', category: 'basic', cssClass: 'bg-av-orange', previewColor: '#ea580c' },
  { id: 'pink',   label: 'Rosa',   category: 'basic', cssClass: 'bg-av-pink',   previewColor: '#db2777' },
  { id: 'dark',   label: 'Oscuro', category: 'basic', cssClass: 'bg-av-dark',   previewColor: '#1f2937' },

  // Especiales (5) — animados + desbloqueables
  { id: 'galaxy',  label: 'Galaxia',  emoji: '🌌', category: 'special', cssClass: 'bg-av-galaxy',  previewColor: '#1e1b4b', unlock: '200 puntos totales' },
  { id: 'fire',    label: 'Fuego',    emoji: '🔥', category: 'special', cssClass: 'bg-av-fire',    previewColor: '#991b1b', unlock: 'Racha de 5 días' },
  { id: 'rainbow', label: 'Arcoíris', emoji: '🌈', category: 'special', cssClass: 'bg-av-rainbow', previewColor: '#a855f7', unlock: 'Campeón semanal' },
  { id: 'gold',    label: 'Dorado',   emoji: '👑', category: 'special', cssClass: 'bg-av-gold',    previewColor: '#ca8a04', unlock: '10 victorias en duelos' },
  { id: 'holy',    label: 'Santo',    emoji: '✨', category: 'special', cssClass: 'bg-av-holy',    previewColor: '#f8fafc', unlock: '5 capítulos de historia' },
]

export const BASIC_BGS   = AVATAR_BGS.filter(b => b.category === 'basic')
export const SPECIAL_BGS = AVATAR_BGS.filter(b => b.category === 'special')
export const BG_MAP      = Object.fromEntries(AVATAR_BGS.map(b => [b.id, b])) as Record<string, AvatarBg>

export function computeUnlockedBgs(opts: {
  totalScore:   number
  streakDays:   number
  isWeeklyChampion: boolean
  duelWins:     number
  completedStoryChapters: number
}): string[] {
  const unlocked = BASIC_BGS.map(b => b.id)
  if (opts.totalScore >= 200)            unlocked.push('galaxy')
  if (opts.streakDays >= 5)              unlocked.push('fire')
  if (opts.isWeeklyChampion)             unlocked.push('rainbow')
  if (opts.duelWins >= 10)               unlocked.push('gold')
  if (opts.completedStoryChapters >= 5)  unlocked.push('holy')
  return unlocked
}
