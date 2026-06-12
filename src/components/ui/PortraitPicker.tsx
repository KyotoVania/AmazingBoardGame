// ============================================================
// PortraitPicker.tsx — Personnalise le portrait d'UN personnage
// de dialogue (EventPopup) : aperçu rond, dropdown de la banque
// (public/images/characters/manifest.json), upload direct (avec
// recompression auto des grosses images) et bouton ✕ de reset.
// Style aligné sur ModelPicker.tsx (bg-night-800, text-cream…).
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { EVENT_CHARACTERS, type EventCharacterId } from '../../game/eventImages'
import {
  loadPortraitBank,
  setPortraitOverride,
  usePortraitUrl,
  type PortraitBankEntry,
} from '../../game/portraitOverrides'

interface Props {
  characterId: EventCharacterId
}

/** Au-delà de cette taille, on recompresse l'upload en JPEG 256×256. */
const MAX_RAW_BYTES = 400 * 1024

/** Lit un fichier en dataURL. */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Recompresse une dataURL en JPEG 256×256 (couvre le cadre), qualité 0.8. */
function compress(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      // cover : on cadre le plus grand carré centré de l'image source
      const side = Math.min(img.width, img.height)
      const sx = (img.width - side) / 2
      const sy = (img.height - side) / 2
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('image illisible'))
    img.src = dataUrl
  })
}

export function PortraitPicker({ characterId }: Props) {
  const def = EVENT_CHARACTERS[characterId]
  const current = usePortraitUrl(characterId)
  const [bank, setBank] = useState<PortraitBankEntry[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Banque optionnelle : chargée une fois, échec silencieux → [].
  useEffect(() => {
    let alive = true
    loadPortraitBank().then((entries) => {
      if (alive) setBank(entries)
    })
    return () => {
      alive = false
    }
  }, [])

  // override personnalisé = tout ce qui n'est pas le défaut du registre
  const isCustom = current !== null && current !== def.imageUrl
  // valeur du dropdown : un fichier de la banque, sinon ''
  const bankValue = current && bank.some((b) => b.file === current) ? current : ''
  const isUpload = isCustom && !bankValue

  const onUpload = async (file: File) => {
    try {
      let url = await readAsDataURL(file)
      if (file.size > MAX_RAW_BYTES) url = await compress(url)
      setPortraitOverride(characterId, url)
    } catch {
      // lecture impossible : on n'écrase rien
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Aperçu rond : image custom/défaut, sinon emoji du registre */}
      <span className="bg-night-900 grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xl shadow-inner">
        {current ? (
          <img src={current} alt={def.name} className="h-full w-full object-cover" />
        ) : (
          def.emoji
        )}
      </span>

      <span className="text-cream w-24 shrink-0 truncate text-xs font-extrabold" title={def.name}>
        {def.name}
      </span>

      <select
        value={bankValue}
        onChange={(e) => setPortraitOverride(characterId, e.target.value || null)}
        className="bg-night-900 focus:ring-gold-400 min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2"
      >
        <option value="">
          {isUpload ? '📂 image importée' : '— portrait par défaut —'}
        </option>
        {bank.map((entry) => (
          <option key={entry.file} value={entry.file}>
            {entry.name}
          </option>
        ))}
      </select>

      <button
        onClick={() => fileRef.current?.click()}
        title="Importer une image"
        className="bg-night-900 hover:bg-night-700 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-extrabold"
      >
        📂
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void onUpload(file)
          e.target.value = ''
        }}
      />

      {isCustom && (
        <button
          onClick={() => setPortraitOverride(characterId, null)}
          title="Revenir au portrait par défaut"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-500/80 text-[10px] font-extrabold text-white"
        >
          ✕
        </button>
      )}
    </div>
  )
}
