export type Medal = {
  icon: string
  label: string
  textColor: string
  borderColor: string
  bgColor: string
}

export function getMedal(weeklyScore: number, isChampion: boolean): Medal | null {
  if (isChampion && weeklyScore > 0)
    return { icon: '👑', label: 'Campeón',  textColor: 'text-yellow-200', borderColor: 'border-yellow-400/60', bgColor: 'bg-yellow-900/30' }
  if (weeklyScore >= 150)
    return { icon: '🥇', label: 'Oro',       textColor: 'text-yellow-400', borderColor: 'border-yellow-600/50', bgColor: 'bg-yellow-900/20' }
  if (weeklyScore >= 100)
    return { icon: '🥈', label: 'Plata',     textColor: 'text-gray-300',   borderColor: 'border-gray-500/50',   bgColor: 'bg-gray-800/30'   }
  if (weeklyScore >= 50)
    return { icon: '🥉', label: 'Bronce',    textColor: 'text-orange-400', borderColor: 'border-orange-600/50', bgColor: 'bg-orange-900/20' }
  return null
}
