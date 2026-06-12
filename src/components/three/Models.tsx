// ============================================================
// Models.tsx — Gestion des modèles .glb chargés à chaud :
//   · ModelsProvider : registre HORS GameState (les objets Three
//     ne sont pas sérialisables) — slot → URL (objectURL ou
//     chemin public comme /models/pion.glb).
//   · FittedModel : charge un .glb, le normalise (échelle à
//     hauteur cible, posé au sol, centré) et active les ombres.
// ============================================================

import { useGLTF } from '@react-three/drei'
import {
  Component,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as THREE from 'three'
import { assetUrl } from '../../game/assets'
import type { PlayerId } from '../../game/types'
import { clearSlot, persistSlotBlob, persistSlotPath, restoreSlots } from './modelStorage'

/** Emplacements pouvant recevoir un modèle custom. */
export type ModelSlot =
  | PlayerId
  | 'STAR'
  | 'TREE_GOOD'
  | 'TREE_BAD'
  | 'MOLE'
  | 'BOO'
  | 'SHOP'
  | 'BANK_BUILDING'
  | 'BANK_NPC'

/** Une entrée de la banque de modèles (public/models/manifest.json). */
export interface ModelBankEntry {
  name: string
  file: string
}

interface ModelsApi {
  models: Partial<Record<ModelSlot, string>>
  /** Banque chargée depuis /models/manifest.json (vide si absent). */
  bank: ModelBankEntry[]
  setModel: (slot: ModelSlot, url: string | null) => void
  /** Upload utilisateur : le .glb est persisté (IndexedDB) pour survivre au reload. */
  setModelFile: (slot: ModelSlot, file: File) => void
}

const ModelsContext = createContext<ModelsApi | null>(null)

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Partial<Record<ModelSlot, string>>>({})
  const [bank, setBank] = useState<ModelBankEntry[]>([])

  // Restauration des choix persistés (reload/crash : rien à re-setup)
  useEffect(() => {
    restoreSlots()
      .then((restored) => setModels((prev) => ({ ...restored, ...prev })))
      .catch(() => {})
  }, [])

  // Banque de modèles : manifest optionnel, échec silencieux.
  useEffect(() => {
    fetch(assetUrl('/models/manifest.json'))
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown) => {
        if (Array.isArray(list)) {
          setBank(
            list
              .filter(
                (e): e is ModelBankEntry =>
                  !!e && typeof e.name === 'string' && typeof e.file === 'string',
              )
              .map((e) => ({ ...e, file: assetUrl(e.file) })),
          )
        }
      })
      .catch(() => {})
  }, [])

  const applyUrl = (slot: ModelSlot, url: string | null) =>
    setModels((prev) => {
      const old = prev[slot]
      // libère les objectURL remplacés (pas les chemins /models/…)
      if (old && old.startsWith('blob:') && old !== url) URL.revokeObjectURL(old)
      const next = { ...prev }
      if (url) next[slot] = url
      else delete next[slot]
      return next
    })

  const api = useMemo<ModelsApi>(
    () => ({
      models,
      bank,
      setModel: (slot, url) => {
        applyUrl(slot, url)
        // persistance : chemins de banque en localStorage, reset = oubli
        if (url && !url.startsWith('blob:')) persistSlotPath(slot, url)
        else if (!url) clearSlot(slot)
      },
      setModelFile: (slot, file) => {
        applyUrl(slot, URL.createObjectURL(file))
        persistSlotBlob(slot, file)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [models, bank],
  )

  return <ModelsContext.Provider value={api}>{children}</ModelsContext.Provider>
}

export function useModels(): ModelsApi {
  const ctx = useContext(ModelsContext)
  if (!ctx) throw new Error('useModels doit être appelé sous <ModelsProvider>')
  return ctx
}

// ---------- Le modèle normalisé (à utiliser DANS le Canvas) ----------

interface FittedProps {
  url: string
  /** Hauteur cible en unités monde. */
  height?: number
  /** Teinte optionnelle appliquée aux matériaux (couleur du joueur). */
  tint?: string | null
}

export function FittedModel({ url, height = 1.0, tint = null }: FittedProps) {
  const { scene } = useGLTF(url)

  const obj = useMemo(() => {
    const clone = scene.clone(true)
    // échelle → hauteur cible
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const scale = height / Math.max(size.y, 0.001)
    clone.scale.setScalar(scale)
    // posé au sol, centré en XZ
    const box2 = new THREE.Box3().setFromObject(clone)
    clone.position.set(
      -(box2.min.x + box2.max.x) / 2,
      -box2.min.y,
      -(box2.min.z + box2.max.z) / 2,
    )
    // ombres + teinte éventuelle
    clone.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (tint) {
          const mat = mesh.material as THREE.MeshStandardMaterial
          if (mat && 'color' in mat) {
            const tinted = mat.clone()
            tinted.color.lerp(new THREE.Color(tint), 0.35)
            mesh.material = tinted
          }
        }
      }
    })
    return clone
  }, [scene, height, tint])

  return <primitive object={obj} />
}

// ---------- Garde-fou : .glb introuvable ou corrompu ----------

interface BoundaryProps {
  /** Re-render propre quand l'URL change (mettre key={url} à l'usage). */
  fallback: ReactNode
  children: ReactNode
}

/** Si le chargement du modèle explose, on retombe sur le rendu par défaut. */
export class ModelErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[Models] échec de chargement du .glb :', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
