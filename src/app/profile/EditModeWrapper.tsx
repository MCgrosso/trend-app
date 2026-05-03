'use client'

import { useState } from 'react'
import { Pencil, X, Check } from 'lucide-react'

// Wrapper que oculta los paneles de edición por default (perfil se ve "como
// los demás lo ven") y los expande al pulsar "Editar perfil". Cancelar/Listo
// vuelve a colapsar. Los editores internos siguen autoguardando, así el botón
// "Listo" solo cierra el panel — los cambios ya quedaron persistidos.
export default function EditModeWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-100 font-semibold py-2.5 rounded-xl transition-colors text-sm"
      >
        <Pencil size={14} /> Editar perfil
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-purple-900/30 border border-purple-500/40 rounded-xl px-3 py-2">
        <span className="text-purple-100 text-xs font-semibold inline-flex items-center gap-1.5">
          <Pencil size={12} /> Modo edición
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-purple-200/70 hover:text-white text-xs flex items-center gap-1"
        >
          <X size={12} /> Cerrar
        </button>
      </div>

      {children}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 bg-gray-700/60 hover:bg-gray-600/70 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:brightness-110 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
        >
          <Check size={14} /> Listo
        </button>
      </div>
    </div>
  )
}
