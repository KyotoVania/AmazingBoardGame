// ============================================================
// assets.ts — Résolution des chemins publics compatible
// sous-chemin (GitHub Pages) : préfixe import.meta.env.BASE_URL.
// ============================================================

/** "/images/boo.png" ou "images/boo.png" → BASE_URL + "images/boo.png". */
export function assetUrl(path: string): string {
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
