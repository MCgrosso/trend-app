'use client'

import { AVATAR_LIST } from '@/lib/avatars'

export default function AvatarPicker({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex gap-4 justify-center flex-wrap">
      {AVATAR_LIST.map(a => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id)}
          className="flex flex-col items-center gap-1.5 focus:outline-none"
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150 ${
              selected === a.id
                ? 'ring-4 ring-white/80 scale-110 shadow-lg'
                : 'ring-2 ring-white/20 opacity-60 hover:opacity-90 hover:scale-105'
            }`}
            style={{ backgroundColor: a.bg }}
          >
            {a.emoji}
          </div>
          <span className={`text-[11px] font-medium transition-colors ${selected === a.id ? 'text-white' : 'text-gray-400'}`}>
            {a.label}
          </span>
        </button>
      ))}
    </div>
  )
}
