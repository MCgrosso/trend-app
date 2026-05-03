// Cliente y utilidades para la energía PVP rankeada.
// Refleja la lógica de get_current_energy() de la migración 019.

export const MAX_ENERGY     = 5
export const RECHARGE_HOURS = 2
export const RECHARGE_MS    = RECHARGE_HOURS * 60 * 60 * 1000

// Devuelve la energía "actual" calculada como stored + ticks transcurridos
// desde energy_last_recharge, capada al máximo.
export function computeCurrentEnergy(stored: number, lastRechargeIso: string, nowMs: number = Date.now()): number {
  const lastMs = new Date(lastRechargeIso).getTime()
  const ticks = Math.max(0, Math.floor((nowMs - lastMs) / RECHARGE_MS))
  return Math.min(MAX_ENERGY, Math.max(0, stored + ticks))
}

// Tiempo en ms hasta la próxima recarga. Devuelve 0 si ya está al máximo.
export function msToNextRecharge(stored: number, lastRechargeIso: string, nowMs: number = Date.now()): number {
  const current = computeCurrentEnergy(stored, lastRechargeIso, nowMs)
  if (current >= MAX_ENERGY) return 0
  const lastMs = new Date(lastRechargeIso).getTime()
  const ticksDone = Math.floor((nowMs - lastMs) / RECHARGE_MS)
  const nextTickAt = lastMs + (ticksDone + 1) * RECHARGE_MS
  return Math.max(0, nextTickAt - nowMs)
}

export function formatRechargeCountdown(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}
