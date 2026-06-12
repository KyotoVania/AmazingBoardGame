// ============================================================
// customBoard.ts — Persistance du plateau custom (Atelier).
// Le BoardDef édité est stocké en localStorage et réinjecté au
// boot AVANT le rendu (main.tsx) pour que l'autosave et la 3D
// retrouvent les mêmes cases.
// ============================================================

import { setActiveBoard, validateBoardDef, type BoardDef } from './board'

const STORAGE_KEY = 'www-custom-board'

export function readCustomBoard(): BoardDef | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const def = JSON.parse(raw) as BoardDef
    if (!def?.seeds?.length || !def.name) return null
    return def
  } catch {
    return null
  }
}

/** Sauvegarde (ou efface avec null) le plateau custom. */
export function writeCustomBoard(def: BoardDef | null): void {
  try {
    if (def === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(def))
  } catch {
    /* stockage indisponible : tant pis */
  }
}

/**
 * À appeler au boot : réinjecte le plateau custom s'il existe et
 * reste valide (sinon il est purgé pour ne pas casser le jeu).
 */
export function bootCustomBoard(): void {
  const def = readCustomBoard()
  if (!def) return
  const { errors } = validateBoardDef(def)
  if (errors.length > 0) {
    writeCustomBoard(null)
    return
  }
  setActiveBoard(def)
}
