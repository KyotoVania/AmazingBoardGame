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

/** Cache des avatars custom (clé = dataURL). */
export const avatarTextureCache = new Map<string, THREE.CanvasTexture>()

/**
 * Texture ronde à partir d'une image utilisateur : recadrage carré
 * centré, masque circulaire, liseré clair pour détacher du décor.
 */
export function circularImageTexture(img: HTMLImageElement): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256)
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(128, 128, 118, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, sx, sy, side, side, 10, 10, 236, 236)
  ctx.restore()
  ctx.lineWidth = 10
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  ctx.beginPath()
  ctx.arc(128, 128, 118, 0, Math.PI * 2)
  ctx.stroke()
  return finalize(canvas)
}

/** Herbe procédurale : fond vert moucheté de milliers de brins. */
export function grassTexture(): THREE.CanvasTexture {
  const key = 'grass'
  const cached = cache.get(key)
  if (cached) return cached
  const [canvas, ctx] = makeCanvas(512)
  const g = ctx.createLinearGradient(0, 0, 512, 512)
  g.addColorStop(0, '#2e4d27')
  g.addColorStop(1, '#27431f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)
  const tones = ['#35592b', '#244020', '#3d6630', '#467238', '#1f3a1a']
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = tones[Math.floor(rnd() * tones.length)]
    const x = rnd() * 512
    const y = rnd() * 512
    ctx.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 3)
  }
  // quelques brins clairs
  ctx.strokeStyle = 'rgba(120,170,90,0.35)'
  ctx.lineWidth = 1
  for (let i = 0; i < 240; i++) {
    const x = rnd() * 512
    const y = rnd() * 512
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rnd() - 0.5) * 4, y - 3 - rnd() * 4)
    ctx.stroke()
  }
  const tex = finalize(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(7, 6)
  cache.set(key, tex)
  return tex
}

/** Bois procédural : planche veinée pour les chemins. */
export function woodTexture(): THREE.CanvasTexture {
  const key = 'wood'
  const cached = cache.get(key)
  if (cached) return cached
  const [canvas, ctx] = makeCanvas(256)
  ctx.fillStyle = '#c9a96a'
  ctx.fillRect(0, 0, 256, 256)
  let seed = 13
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  // veines ondulées
  for (let i = 0; i < 22; i++) {
    const y = (i / 22) * 256 + rnd() * 8
    ctx.strokeStyle = `rgba(140, 104, 56, ${0.25 + rnd() * 0.3})`
    ctx.lineWidth = 1 + rnd() * 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= 256; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3 + (rnd() - 0.5) * 4)
    }
    ctx.stroke()
  }
  // nœuds
  for (let i = 0; i < 4; i++) {
    const x = rnd() * 256
    const y = rnd() * 256
    ctx.strokeStyle = 'rgba(110, 80, 40, 0.5)'
    for (let r = 2; r < 9; r += 2.5) {
      ctx.beginPath()
      ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  const tex = finalize(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  cache.set(key, tex)
  return tex
}
