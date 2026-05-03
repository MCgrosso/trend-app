export interface AvatarBg {
  id: string
  label: string
  category: 'basic' | 'special'
  cssClass: string        // applied on the avatar's outer div (puede quedar vacío si usa image)
  previewColor: string    // flat color para swatches cuando no podemos animar
  emoji?: string
  unlock?: string         // texto humano del requisito (special only)
  image?: string          // URL de un GIF/PNG que se aplica como background-image del avatar
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
  // Fondos por nivel (CSS animado)
  { id: 'cosmos',        label: 'Cosmos',        emoji: '🌌', category: 'special', cssClass: 'bg-av-cosmos',        previewColor: '#1e1b4b', unlock: 'Nivel 20' },
  { id: 'fuego_sagrado', label: 'Fuego Sagrado', emoji: '🔥', category: 'special', cssClass: 'bg-av-fuego-sagrado', previewColor: '#b45309', unlock: 'Nivel 40' },
  // Fondos GIF/PNG por nivel (recompensas)
  { id: 'bg_cosmos',     label: 'Galaxia',       emoji: '🌌', category: 'special', cssClass: '', previewColor: '#1e1b4b', unlock: 'Nivel 10', image: '/bg_cosmos.gif'    },
  { id: 'bg_fuego',      label: 'Llamas',        emoji: '🔥', category: 'special', cssClass: '', previewColor: '#7c2d12', unlock: 'Nivel 20', image: '/bg_fuego.gif'     },
  { id: 'bg_agua',       label: 'Aguas',         emoji: '💧', category: 'special', cssClass: '', previewColor: '#1e3a8a', unlock: 'Nivel 30', image: '/bg_agua.gif'      },
  { id: 'bg_nubes',      label: 'Nubes',         emoji: '☁️', category: 'special', cssClass: '', previewColor: '#cbd5e1', unlock: 'Nivel 40', image: '/bg_nubes.gif'     },
  { id: 'bg_estrellas',  label: 'Estrellas',     emoji: '✨', category: 'special', cssClass: '', previewColor: '#0c0a1f', unlock: 'Nivel 50', image: '/bg_estrellas.gif' },
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
  level?:       number
}): string[] {
  const unlocked = BASIC_BGS.map(b => b.id)
  if (opts.totalScore >= 200)            unlocked.push('galaxy')
  if (opts.streakDays >= 5)              unlocked.push('fire')
  if (opts.isWeeklyChampion)             unlocked.push('rainbow')
  if (opts.duelWins >= 10)               unlocked.push('gold')
  if (opts.completedStoryChapters >= 5)  unlocked.push('holy')
  // Fondos CSS animados por nivel
  if ((opts.level ?? 1) >= 20)           unlocked.push('cosmos')
  if ((opts.level ?? 1) >= 40)           unlocked.push('fuego_sagrado')
  // Fondos GIF/PNG por nivel
  if ((opts.level ?? 1) >= 10)           unlocked.push('bg_cosmos')
  if ((opts.level ?? 1) >= 20)           unlocked.push('bg_fuego')
  if ((opts.level ?? 1) >= 30)           unlocked.push('bg_agua')
  if ((opts.level ?? 1) >= 40)           unlocked.push('bg_nubes')
  if ((opts.level ?? 1) >= 50)           unlocked.push('bg_estrellas')
  return unlocked
}
