// ============================================================
// SoundControls.tsx — Petit panneau autonome de réglage du son :
// slider de volume + bouton mute 🔇/🔊 + note « déposez vos sons
// dans public/sounds/ ». Lit/écrit via getSoundPrefs/setSoundPrefs
// et se resynchronise sur l'événement DOM 'www-sound-prefs'.
// Style Tailwind v4 cohérent avec le projet (bg-night, text-cream…).
// ============================================================

import { useEffect, useState } from 'react'
import { getSoundPrefs, onSoundPrefsChange, setSoundPrefs } from './useGameSounds'

export function SoundControls() {
  const [prefs, setPrefs] = useState(getSoundPrefs)

  // Resynchronisation si un autre composant change les préférences.
  useEffect(() => onSoundPrefsChange(setPrefs), [])

  const toggleMute = () => setPrefs(setSoundPrefs({ muted: !prefs.muted }))
  const onVolume = (v: number) => setPrefs(setSoundPrefs({ volume: v, muted: false }))

  return (
    <section className="bg-night-800/60 flex flex-col gap-2 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMute}
          className="bg-night-900/70 hover:bg-night-700 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
          title={prefs.muted ? 'Réactiver le son' : 'Couper le son'}
        >
          {prefs.muted ? '🔇' : '🔊'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={prefs.muted ? 0 : prefs.volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="accent-gold-400 h-2 flex-1 cursor-pointer"
          aria-label="Volume des sons"
        />
        <span className="text-cream/80 w-9 text-right text-sm font-extrabold tabular-nums">
          {Math.round((prefs.muted ? 0 : prefs.volume) * 100)}
        </span>
      </div>
      <p className="text-cream/50 text-[11px] font-bold">
        Déposez vos sons (mp3/ogg) dans <code className="text-cream/70">public/sounds/</code> et
        renommez <code className="text-cream/70">manifest.example.json</code> en{' '}
        <code className="text-cream/70">manifest.json</code>.
      </p>
    </section>
  )
}
