// ============================================================
// textures.ts — Textures générées au runtime via canvas 2D.
// Zéro asset réseau : les emojis et chiffres sont dessinés avec
// les fontes système, donc le jeu fonctionne 100% offline.
// ============================================================

import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponible')
  return [canvas, ctx]
}

function finalize(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Texture transparente avec un emoji / texte centré (pour les sprites). */
export function spriteTexture(text: string): THREE.CanvasTexture {
  const key = `sprite:${text}`
  const cached = cache.get(key)
  if (cached) return cached
  const [canvas, ctx] = makeCanvas(256)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '170px sans-serif'
  ctx.fillText(text, 128, 140)
  const tex = finalize(canvas)
  cache.set(key, tex)
  return tex
}

/** Étiquette posée à plat sur une case (texte court, contour sombre). */
export function labelTexture(text: string, color = '#ffffff'): THREE.CanvasTexture {
  const key = `label:${text}:${color}`
  const cached = cache.get(key)
  if (cached) return cached
  const [canvas, ctx] = makeCanvas(256)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const isEmoji = /\p{Extended_Pictographic}/u.test(text)
  ctx.font = isEmoji ? '150px sans-serif' : `900 ${text.length > 2 ? 110 : 150}px Arial, sans-serif`
  if (!isEmoji) {
    ctx.lineWidth = 18
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.strokeText(text, 128, 138)
  }
  ctx.fillStyle = color
  ctx.fillText(text, 128, 138)
  const tex = finalize(canvas)
  cache.set(key, tex)
  return tex
}

/** Face de dé : fond teinté, valeur centrée, bonus/malus de pièces. */
export function diceFaceTexture(
  value: number,
  coins: number | undefined,
  bg: string,
): THREE.CanvasTexture {
  const key = `face:${value}:${coins ?? 0}:${bg}`
  const cached = cache.get(key)
  if (cached) return cached
  const [canvas, ctx] = makeCanvas(256)
  // fond
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 256, 256)
  // panneau intérieur clair arrondi
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.beginPath()
  ctx.roundRect(18, 18, 220, 220, 36)
  ctx.fill()
  // valeur
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#1c1917'
  ctx.font = '900 132px Arial, sans-serif'
  ctx.fillText(String(value), 128, coins ? 112 : 130)
  // pièces éventuelles (faces 0 des dés persos)
  if (coins) {
    ctx.font = '700 52px Arial, sans-serif'
    ctx.fillStyle = coins > 0 ? '#15803d' : '#b91c1c'
    ctx.fillText(`${coins > 0 ? '+' : ''}${coins} 🪙`, 128, 196)
  }
  const tex = finalize(canvas)
  cache.set(key, tex)
  return tex
}
