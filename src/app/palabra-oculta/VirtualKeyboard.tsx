'use client'

// Spanish alphabet (27 letters), distributed in 3 mobile-friendly rows.
const ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
]

export default function VirtualKeyboard({
  used,
  correct,
  wrong,
  disabled,
  onPick,
}: {
  used: Set<string>
  correct: Set<string>
  wrong: Set<string>
  disabled: boolean
  onPick: (letter: string) => void
}) {
  return (
    <div className="space-y-1.5">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
          {row.map(L => {
            const isCorrect = correct.has(L)
            const isWrong   = wrong.has(L)
            const isUsed    = used.has(L) || isCorrect || isWrong
            return (
              <button
                key={L}
                type="button"
                disabled={disabled || isUsed}
                onClick={() => onPick(L)}
                className={`w-8 h-10 sm:w-9 sm:h-11 rounded-md font-bebas text-xl flex items-center justify-center border-2 transition-all duration-150 disabled:cursor-default ${
                  isCorrect
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : isWrong
                      ? 'bg-red-600/40 border-red-500 text-red-100'
                      : isUsed
                        ? 'bg-gray-800/60 border-gray-700/60 text-gray-600'
                        : 'bg-purple-900/40 border-purple-700/50 text-white hover:bg-purple-700/50 hover:border-purple-400 active:scale-95'
                }`}
              >
                {L}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
