// Personajes de cuerpo entero (sprites LPC). Sin "use client": se puede usar
// tanto desde server components como desde client components.

export const CHARACTERS = ['chico', 'chica'] as const
export type Character = typeof CHARACTERS[number]
export const DEFAULT_CHARACTER: Character = 'chico'

/** attack = acertó (ataca al rival) · hit = recibe el golpe · win/lose = resultado final */
export type FullBodyState = 'idle' | 'attack' | 'win' | 'lose' | 'hit' | 'enter'

export function normalizeCharacter(value: unknown): Character {
  return (CHARACTERS as readonly unknown[]).includes(value) ? (value as Character) : DEFAULT_CHARACTER
}
