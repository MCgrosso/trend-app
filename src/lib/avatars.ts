// Avatar entry. `image` is optional — when present it overrides the emoji
// rendering with a circular PNG (used for special unlock-by-story-chapter
// avatars). `chapterUnlock` describes which story chapter completes the unlock,
// so the profile page can compute it from the story_answers table.
export type Avatar = {
  emoji: string
  bg: string
  label: string
  image?: string
  chapterUnlock?: { book: string; chapter: number }
  // Identificador semántico para desbloqueos por evento (no por capítulo).
  // Lo usa profile/page.tsx para empujar al avatar a unlockedSpecial cuando
  // el flag correspondiente se cumple (ej: completaste todos los días del
  // Valle de Elá → eventUnlock = 'valle_ela_complete').
  eventUnlock?: string
}

export const AVATARS: Record<string, Avatar> = {
  leon:     { emoji: '🦁', bg: '#f97316', label: 'León' },
  aguila:   { emoji: '🦅', bg: '#3b82f6', label: 'Águila' },
  ballena:  { emoji: '🐋', bg: '#06b6d4', label: 'Ballena' },
  estrella: { emoji: '🌟', bg: '#a855f7', label: 'Estrella' },
  fuego:    { emoji: '🔥', bg: '#ef4444', label: 'Fuego' },
  // Avatares especiales desbloqueables por progreso general
  guerrero: { emoji: '⚔️', bg: '#d97706', label: 'Guerrero de la Fe' },
  profeta:  { emoji: '🔮', bg: '#7c3aed', label: 'Profeta' },
  apostol:  { emoji: '✝️', bg: '#1d4ed8', label: 'Apóstol' },
  campeon:  { emoji: '🏆', bg: '#ca8a04', label: 'Campeón de Duelos' },
  // Avatares especiales desbloqueables por completar capítulos del Modo Historia
  avatar_moises:   { emoji: '📜', bg: '#92400e', label: 'Moisés',   image: '/avatar_moises.png',   chapterUnlock: { book: 'Génesis', chapter: 1  } },
  avatar_adan:     { emoji: '🌿', bg: '#15803d', label: 'Adán',     image: '/avatar_adan.png',     chapterUnlock: { book: 'Génesis', chapter: 2  } },
  avatar_eva:      { emoji: '🍎', bg: '#be123c', label: 'Eva',      image: '/avatar_eva.png',      chapterUnlock: { book: 'Génesis', chapter: 3  } },
  avatar_abel:     { emoji: '🐑', bg: '#475569', label: 'Abel',     image: '/avatar_abel.png',     chapterUnlock: { book: 'Génesis', chapter: 4  } },
  avatar_abraham:  { emoji: '⭐', bg: '#7e22ce', label: 'Abraham',  image: '/avatar_abraham.png',  chapterUnlock: { book: 'Génesis', chapter: 12 } },
  // Avatar especial desbloqueable por completar los 7 días del evento Valle de Elá
  avatar_david:    { emoji: '👑', bg: '#fbbf24', label: 'David',    image: '/avatar_david.png',    eventUnlock: 'valle_ela_complete' },
  // Avatares desbloqueables por nivel (sin imagen, solo emoji)
  avatar_pergamino:{ emoji: '📜', bg: '#1e40af', label: 'Pergamino' },
  avatar_corona:   { emoji: '👑', bg: '#ca8a04', label: 'Corona Real' },
  avatar_angel:    { emoji: '😇', bg: '#f8fafc', label: 'Ángel' },
}

const SPECIAL_IDS = new Set([
  'guerrero', 'profeta', 'apostol', 'campeon',
  'avatar_moises', 'avatar_adan', 'avatar_eva', 'avatar_abel', 'avatar_abraham',
  'avatar_david',
  'avatar_pergamino', 'avatar_corona', 'avatar_angel',
])

export const AVATAR_LIST = Object.entries(AVATARS)
  .filter(([id]) => !SPECIAL_IDS.has(id))
  .map(([id, v]) => ({ id, ...v }))

export type SpecialAvatar = {
  id: string
  emoji: string
  bg: string
  label: string
  description: string
  image?: string
  chapterUnlock?: { book: string; chapter: number }
  eventUnlock?: string
}

export const SPECIAL_AVATARS: SpecialAvatar[] = [
  { id: 'guerrero', emoji: '⚔️', bg: '#d97706', label: 'Guerrero de la Fe',   description: '20 respuestas correctas en total' },
  { id: 'profeta',  emoji: '🔮', bg: '#7c3aed', label: 'Profeta',              description: 'Racha de 5 días seguidos'        },
  { id: 'apostol',  emoji: '✝️', bg: '#1d4ed8', label: 'Apóstol',              description: '200 puntos totales'              },
  { id: 'campeon',  emoji: '🏆', bg: '#ca8a04', label: 'Campeón de Duelos',    description: 'Racha de 3 victorias en duelos'  },
  // Modo Historia
  { id: 'avatar_moises',  emoji: '📜', bg: '#92400e', label: 'Moisés',  description: 'Completá Génesis 1',  image: '/avatar_moises.png',  chapterUnlock: { book: 'Génesis', chapter: 1  } },
  { id: 'avatar_adan',    emoji: '🌿', bg: '#15803d', label: 'Adán',    description: 'Completá Génesis 2',  image: '/avatar_adan.png',    chapterUnlock: { book: 'Génesis', chapter: 2  } },
  { id: 'avatar_eva',     emoji: '🍎', bg: '#be123c', label: 'Eva',     description: 'Completá Génesis 3',  image: '/avatar_eva.png',     chapterUnlock: { book: 'Génesis', chapter: 3  } },
  { id: 'avatar_abel',    emoji: '🐑', bg: '#475569', label: 'Abel',    description: 'Completá Génesis 4',  image: '/avatar_abel.png',    chapterUnlock: { book: 'Génesis', chapter: 4  } },
  { id: 'avatar_abraham', emoji: '⭐', bg: '#7e22ce', label: 'Abraham', description: 'Completá Génesis 12', image: '/avatar_abraham.png', chapterUnlock: { book: 'Génesis', chapter: 12 } },
  // Evento Valle de Elá
  { id: 'avatar_david',     emoji: '👑', bg: '#fbbf24', label: 'David',      description: 'Completá los 7 días del Valle de Elá', image: '/avatar_david.png', eventUnlock: 'valle_ela_complete' },
  // Avatares por nivel
  { id: 'avatar_pergamino', emoji: '📜', bg: '#1e40af', label: 'Pergamino',  description: 'Alcanzá el nivel 10' },
  { id: 'avatar_corona',    emoji: '👑', bg: '#ca8a04', label: 'Corona Real', description: 'Alcanzá el nivel 30' },
  { id: 'avatar_angel',     emoji: '😇', bg: '#f8fafc', label: 'Ángel',       description: 'Alcanzá el nivel 50' },
]
