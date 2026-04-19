export const AVATARS: Record<string, { emoji: string; bg: string; label: string }> = {
  leon:     { emoji: '🦁', bg: '#f97316', label: 'León' },
  aguila:   { emoji: '🦅', bg: '#3b82f6', label: 'Águila' },
  ballena:  { emoji: '🐋', bg: '#06b6d4', label: 'Ballena' },
  estrella: { emoji: '🌟', bg: '#a855f7', label: 'Estrella' },
  fuego:    { emoji: '🔥', bg: '#ef4444', label: 'Fuego' },
}

export const AVATAR_LIST = Object.entries(AVATARS).map(([id, v]) => ({ id, ...v }))
