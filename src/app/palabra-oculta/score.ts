// Calcula puntaje según el spec:
// - 0 errores y < 30s → 50
// - 0 errores y < 60s → 40
// - 1-2 errores → 30
// - 3-4 errores → 20
// - 5+ errores → 10
// - No completado → 0
export function computeScore({ completed, errors, timeSeconds }: {
  completed: boolean; errors: number; timeSeconds: number
}): number {
  if (!completed) return 0
  if (errors === 0 && timeSeconds < 30) return 50
  if (errors === 0 && timeSeconds < 60) return 40
  if (errors >= 1 && errors <= 2)        return 30
  if (errors >= 3 && errors <= 4)        return 20
  return 10
}
