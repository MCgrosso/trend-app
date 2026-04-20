export interface Frame {
  id: string
  label: string
  emoji?: string
  category: 'basic' | 'special'
  cssClass: string
  previewColor: string
  unlock?: string
}

export const FRAMES: Frame[] = [
  // Básicos (siempre disponibles)
  { id: 'white',   label: 'Blanco',           category: 'basic',   cssClass: 'frame-white',   previewColor: '#ffffff' },
  { id: 'blue',    label: 'Azul eléctrico',   category: 'basic',   cssClass: 'frame-blue',    previewColor: '#60a5fa' },
  { id: 'emerald', label: 'Verde esmeralda',  category: 'basic',   cssClass: 'frame-emerald', previewColor: '#34d399' },
  { id: 'red',     label: 'Rojo fuego',       category: 'basic',   cssClass: 'frame-red',     previewColor: '#f87171' },
  { id: 'orange',  label: 'Naranja',          category: 'basic',   cssClass: 'frame-orange',  previewColor: '#fb923c' },
  { id: 'purple',  label: 'Morado galaxia',   category: 'basic',   cssClass: 'frame-purple',  previewColor: '#a855f7' },
  { id: 'pink',    label: 'Rosa neón',        category: 'basic',   cssClass: 'frame-pink',    previewColor: '#f472b6' },
  // Especiales (requieren logro)
  { id: 'flames',  label: 'Llamas',    emoji: '🔥', category: 'special', cssClass: 'frame-flames',   previewColor: '#f97316', unlock: 'Racha de 3 días'        },
  { id: 'galaxia', label: 'Galaxia',   emoji: '🌌', category: 'special', cssClass: 'frame-galaxia',  previewColor: '#7c3aed', unlock: '100 puntos totales'     },
  { id: 'rainbow', label: 'Arcoíris', emoji: '🌈', category: 'special', cssClass: 'frame-rainbow',  previewColor: '#ec4899', unlock: 'Racha de 5 días'        },
  { id: 'golden',  label: 'Dorado',    emoji: '👑', category: 'special', cssClass: 'frame-golden',   previewColor: '#eab308', unlock: 'Ser campeón semanal'    },
  { id: 'divine',  label: 'Divino',    emoji: '✨', category: 'special', cssClass: 'frame-divine',   previewColor: '#f1f5f9', unlock: '300 puntos totales'     },
]

export const BASIC_FRAMES  = FRAMES.filter(f => f.category === 'basic')
export const SPECIAL_FRAMES = FRAMES.filter(f => f.category === 'special')
export const FRAME_MAP     = Object.fromEntries(FRAMES.map(f => [f.id, f])) as Record<string, Frame>
