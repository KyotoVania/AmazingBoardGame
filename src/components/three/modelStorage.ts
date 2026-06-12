// ============================================================
// modelStorage.ts — Persistance des modèles 3D choisis (Atelier)
// à travers reloads et crashs : les choix de banque en
// localStorage, les .glb UPLOADÉS en Blob dans IndexedDB (bien
// trop gros pour le localStorage). Échec silencieux partout :
// au pire, on re-choisit son modèle.
// ============================================================

import type { ModelSlot } from './Models'

const LS_KEY = 'www-model-slots'
const DB_NAME = 'www-models'
const STORE = 'glb'

type SlotMarker = { kind: 'path'; url: string } | { kind: 'blob' }

function readMarkers(): Record<string, SlotMarker> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Record<string, SlotMarker>
  } catch {
    return {}
  }
}

function writeMarkers(markers: Record<string, SlotMarker>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(markers))
  } catch {
    /* stockage plein ou indisponible */
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: Blob): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function idbGet(key: string): Promise<Blob | undefined> {
  const db = await openDb()
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as Blob | undefined)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/** Choix de banque : on garde le chemin tel quel. */
export function persistSlotPath(slot: ModelSlot, url: string): void {
  const markers = readMarkers()
  markers[slot] = { kind: 'path', url }
  writeMarkers(markers)
  void idbDel(slot).catch(() => {})
}

/** Upload : le fichier .glb entier part dans IndexedDB. */
export function persistSlotBlob(slot: ModelSlot, blob: Blob): void {
  const markers = readMarkers()
  markers[slot] = { kind: 'blob' }
  writeMarkers(markers)
  void idbSet(slot, blob).catch(() => {})
}

export function clearSlot(slot: ModelSlot): void {
  const markers = readMarkers()
  delete markers[slot]
  writeMarkers(markers)
  void idbDel(slot).catch(() => {})
}

/** Au boot : restaure tous les slots persistés (uploads → objectURL). */
export async function restoreSlots(): Promise<Partial<Record<ModelSlot, string>>> {
  const out: Partial<Record<ModelSlot, string>> = {}
  const markers = readMarkers()
  for (const [slot, marker] of Object.entries(markers) as [ModelSlot, SlotMarker][]) {
    if (marker.kind === 'path') {
      out[slot] = marker.url
    } else {
      try {
        const blob = await idbGet(slot)
        if (blob) out[slot] = URL.createObjectURL(blob)
      } catch {
        /* base indisponible : on repart sans ce modèle */
      }
    }
  }
  return out
}
