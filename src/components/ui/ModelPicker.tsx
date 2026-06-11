// ============================================================
// ModelPicker.tsx — Sélecteur de modèle 3D pour un emplacement :
// banque (public/models/manifest.json) en dropdown, upload .glb
// direct, ou chemin manuel. Partagé entre le Lobby et le ⚙️.
// ============================================================

import { useRef } from 'react'
import { useModels, type ModelSlot } from '../three/Models'

interface Props {
  slot: ModelSlot
  /** Variante compacte (lobby) : contrôles sur une seule ligne. */
  compact?: boolean
}

export function ModelPicker({ slot, compact = false }: Props) {
  const { models, bank, setModel } = useModels()
  const fileRef = useRef<HTMLInputElement>(null)
  const current = models[slot] ?? null
  // valeur du dropdown : un fichier de la banque, sinon ''
  const bankValue = current && bank.some((b) => b.file === current) ? current : ''

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'flex-wrap'}`}>
      <select
        value={bankValue}
        onChange={(e) => setModel(slot, e.target.value || null)}
        className="bg-night-900 focus:ring-gold-400 min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2"
      >
        <option value="">
          {current && !bankValue ? '📂 fichier importé' : '— modèle par défaut —'}
        </option>
        {bank.map((entry) => (
          <option key={entry.file} value={entry.file}>
            {entry.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => fileRef.current?.click()}
        title="Importer un fichier .glb"
        className="bg-night-900 hover:bg-night-700 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-extrabold"
      >
        📂
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setModel(slot, URL.createObjectURL(file))
          e.target.value = ''
        }}
      />
      {current && (
        <button
          onClick={() => setModel(slot, null)}
          title="Revenir au modèle par défaut"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-500/80 text-[10px] font-extrabold text-white"
        >
          ✕
        </button>
      )}
    </div>
  )
}
