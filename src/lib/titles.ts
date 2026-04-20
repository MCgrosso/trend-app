export interface Title {
  id: string
  label: string
  color: string
  bgColor: string
  borderColor: string
  rarity: 'común' | 'raro' | 'épico' | 'legendario' | 'mítico'
  rarityColor: string
  rarityBg: string
  requirement: string
  specialClass?: string
  winsRequired?: number
  streakRequired?: number
}

export const TITLES: Title[] = [
  {
    id: 'novato',
    label: 'Novato',
    color: 'text-gray-300',
    bgColor: 'bg-gray-700/40',
    borderColor: 'border-gray-600/50',
    rarity: 'común',
    rarityColor: 'text-gray-400',
    rarityBg: 'bg-gray-800',
    requirement: 'Título inicial',
  },
  {
    id: 'aprendiz',
    label: 'Aprendiz',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-900/30',
    borderColor: 'border-emerald-700/50',
    rarity: 'común',
    rarityColor: 'text-emerald-400',
    rarityBg: 'bg-emerald-950',
    requirement: '5 victorias',
    winsRequired: 5,
  },
  {
    id: 'guerrero',
    label: 'Guerrero',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-700/50',
    rarity: 'raro',
    rarityColor: 'text-blue-400',
    rarityBg: 'bg-blue-950',
    requirement: '15 victorias',
    winsRequired: 15,
  },
  {
    id: 'campeon',
    label: 'Conocedor',
    color: 'text-purple-300',
    bgColor: 'bg-purple-900/30',
    borderColor: 'border-purple-700/50',
    rarity: 'raro',
    rarityColor: 'text-purple-400',
    rarityBg: 'bg-purple-950',
    requirement: '30 victorias',
    winsRequired: 30,
  },
  {
    id: 'profeta',
    label: 'Profeta',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-700/50',
    rarity: 'épico',
    rarityColor: 'text-amber-400',
    rarityBg: 'bg-amber-950',
    requirement: 'Racha de 3 victorias seguidas',
    streakRequired: 3,
  },
  {
    id: 'leyenda',
    label: 'Leyenda',
    color: 'text-red-400',
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-700/50',
    rarity: 'épico',
    rarityColor: 'text-red-400',
    rarityBg: 'bg-red-950',
    requirement: '50 victorias',
    specialClass: 'animate-red-glow',
    winsRequired: 50,
  },
  {
    id: 'invencible',
    label: 'Campeón Invicto',
    color: '',
    bgColor: 'bg-gradient-to-r from-red-900/30 via-purple-900/30 to-blue-900/30',
    borderColor: 'border-purple-600/60',
    rarity: 'legendario',
    rarityColor: 'text-pink-400',
    rarityBg: 'bg-pink-950',
    requirement: 'Racha de 10 victorias seguidas',
    specialClass: 'animate-rainbow font-bold',
    streakRequired: 10,
  },
  {
    id: 'rey',
    label: 'Rey de Reyes',
    color: '',
    bgColor: 'bg-yellow-900/40',
    borderColor: 'border-yellow-500/70',
    rarity: 'mítico',
    rarityColor: 'text-yellow-300',
    rarityBg: 'bg-yellow-950',
    requirement: '100 victorias',
    specialClass: 'animate-shimmer font-bold',
    winsRequired: 100,
  },
]

export function getTitle(titleId: string | null | undefined): Title {
  return TITLES.find(t => t.id === titleId) ?? TITLES[0]
}

export function computeTitle(wins: number, streak: number): Title {
  if (wins >= 100)   return TITLES.find(t => t.id === 'rey')!
  if (streak >= 10)  return TITLES.find(t => t.id === 'invencible')!
  if (wins >= 50)    return TITLES.find(t => t.id === 'leyenda')!
  if (streak >= 3)   return TITLES.find(t => t.id === 'profeta')!
  if (wins >= 30)    return TITLES.find(t => t.id === 'campeon')!
  if (wins >= 15)    return TITLES.find(t => t.id === 'guerrero')!
  if (wins >= 5)     return TITLES.find(t => t.id === 'aprendiz')!
  return TITLES[0]
}

interface NextTitleInfo {
  title: Title
  progress: number
  target: number
  label: string
}

export function getNextTitle(wins: number, streak: number): NextTitleInfo | null {
  if (wins < 5)   return { title: TITLES.find(t => t.id === 'aprendiz')!,    progress: wins,   target: 5,   label: 'victorias' }
  if (wins < 15)  return { title: TITLES.find(t => t.id === 'guerrero')!,    progress: wins,   target: 15,  label: 'victorias' }
  if (wins < 30)  return { title: TITLES.find(t => t.id === 'campeon')!,     progress: wins,   target: 30,  label: 'victorias' }
  if (streak < 3 && wins < 50) return { title: TITLES.find(t => t.id === 'profeta')!, progress: streak, target: 3, label: 'racha' }
  if (wins < 50)  return { title: TITLES.find(t => t.id === 'leyenda')!,     progress: wins,   target: 50,  label: 'victorias' }
  if (streak < 10 && wins < 100) return { title: TITLES.find(t => t.id === 'invencible')!, progress: streak, target: 10, label: 'racha' }
  if (wins < 100) return { title: TITLES.find(t => t.id === 'rey')!,         progress: wins,   target: 100, label: 'victorias' }
  return null
}

export const DUEL_CATEGORIES = [
  'Génesis y Creación',
  'Éxodo y Ley',
  'Salmos y Proverbios',
  'Profetas',
  'Evangelios',
  'Hechos y Epístolas',
  'Apocalipsis',
  'Personajes Bíblicos',
  'Milagros',
  'Parábolas',
  'General',
] as const

export type DuelCategory = typeof DUEL_CATEGORIES[number]
