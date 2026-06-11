// ============================================================
// rng.ts — Générateur pseudo-aléatoire seedable (mulberry32).
// Seedable pour rendre le moteur testable de façon déterministe.
// ============================================================

let state = (Date.now() ^ 0x9e3779b9) >>> 0

export function setSeed(seed: number): void {
  state = seed >>> 0
}

/** Nombre flottant uniforme dans [0, 1). */
export function rand(): number {
  state = (state + 0x6d2b79f5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Entier uniforme dans [min, max] inclus. */
export function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

/** Élément aléatoire d'un tableau non vide. */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}
