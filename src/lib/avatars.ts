export const AVATARS: Record<string, { emoji: string; bg: string; label: string }> = {
  leon:     { emoji: '🦁', bg: '#f97316', label: 'León' },
  aguila:   { emoji: '🦅', bg: '#3b82f6', label: 'Águila' },
  ballena:  { emoji: '🐋', bg: '#06b6d4', label: 'Ballena' },
  estrella: { emoji: '🌟', bg: '#a855f7', label: 'Estrella' },
  fuego:    { emoji: '🔥', bg: '#ef4444', label: 'Fuego' },
  // Avatares especiales desbloqueables
  guerrero: { emoji: '⚔️', bg: '#d97706', label: 'Guerrero de la Fe' },
  profeta:  { emoji: '🔮', bg: '#7c3aed', label: 'Profeta' },
  apostol:  { emoji: '✝️', bg: '#1d4ed8', label: 'Apóstol' },
  campeon:  { emoji: '🏆', bg: '#ca8a04', label: 'Campeón de Duelos' },
}

const SPECIAL_IDS = new Set(['guerrero', 'profeta', 'apostol', 'campeon'])

export const AVATAR_LIST = Object.entries(AVATARS)
  .filter(([id]) => !SPECIAL_IDS.has(id))
  .map(([id, v]) => ({ id, ...v }))

export const SPECIAL_AVATARS: {
  id: string; emoji: string; bg: string; label: string; description: string
}[] = [
  { id: 'guerrero', emoji: '⚔️', bg: '#d97706', label: 'Guerrero de la Fe',   description: '20 respuestas correctas en total' },
  { id: 'profeta',  emoji: '🔮', bg: '#7c3aed', label: 'Profeta',              description: 'Racha de 5 días seguidos'        },
  { id: 'apostol',  emoji: '✝️', bg: '#1d4ed8', label: 'Apóstol',              description: '200 puntos totales'              },
  { id: 'campeon',  emoji: '🏆', bg: '#ca8a04', label: 'Campeón de Duelos',    description: 'Racha de 3 victorias en duelos'  },
]
