// ============================================================
// cameraMode.ts — Mini-store hors-React pour le mode caméra.
//   'follow'   : la caméra suit le pion du joueur actif (défaut).
//   'overview' : vue d'ensemble du plateau entier.
// Aucune dépendance au GameState. Le toggle émet un événement DOM
// custom 'www-camera-mode' que CameraRig (et l'UI) peuvent écouter.
// ============================================================

export type CameraMode = 'follow' | 'overview'

const EVENT_NAME = 'www-camera-mode'
let current: CameraMode = 'follow'

export function getCameraMode(): CameraMode {
  return current
}

export function setCameraMode(mode: CameraMode): void {
  if (mode === current) return
  current = mode
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<CameraMode>(EVENT_NAME, { detail: mode }))
  }
}

export function toggleCameraMode(): CameraMode {
  setCameraMode(current === 'follow' ? 'overview' : 'follow')
  return current
}

/** S'abonne aux changements de mode ; renvoie une fonction de désabonnement. */
export function onCameraModeChange(cb: (mode: CameraMode) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: Event) => cb((e as CustomEvent<CameraMode>).detail)
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
