// ============================================================================
// eventImages.ts — Centralized image registry for NPC / event characters
// ============================================================================
//
// 🎨 HOW TO ADD CUSTOM IMAGES:
//
//   1. Drop your image files in:  public/images/
//      e.g. public/images/boo.png, public/images/kamek.png
//
//   2. Set the `imageUrl` field below to the path relative to public/
//      e.g. imageUrl: assetUrl('/images/boo.png')
//
//   3. To use the emoji fallback instead, set imageUrl to null:
//      e.g. imageUrl: null
//
//   Supported formats: PNG, JPG, WebP, GIF
//   Recommended size:  256×256 or larger, square aspect ratio
//
//   The EventPopup component will automatically display the image if
//   available, or fall back to a big emoji if imageUrl is null or the
//   image fails to load.
// ============================================================================

import { assetUrl } from './assets'

/** All known NPC / event character IDs used in dialog popups */
export type EventCharacterId =
  | 'TREE_GOOD' | 'TREE_BAD'
  | 'BOO' | 'MOLE' | 'TOADETTE'
  | 'KAMEK' | 'PIT' | 'STAR'
  | 'MUSHROOM' | 'SIGNPOST'

/** Definition for a single event character's visual representation */
export interface EventCharacterDef {
  id: EventCharacterId
  /** Display name (French, goofy tone encouraged) */
  name: string
  /** Emoji used as fallback when no image is available */
  emoji: string
  /** Path to image in public/images/. Set to null to use emoji fallback. */
  imageUrl: string | null
}

// ---------------------------------------------------------------------------
// CHARACTER REGISTRY
// ---------------------------------------------------------------------------
// To swap in real art, just change the imageUrl to your file path.
// Set imageUrl to null to keep using the emoji placeholder.
// ---------------------------------------------------------------------------

export const EVENT_CHARACTERS: Record<EventCharacterId, EventCharacterDef> = {
  TREE_GOOD: {
    id: 'TREE_GOOD',
    name: "L'Arbre généreux",
    emoji: '🌳',
    imageUrl: assetUrl('/images/tree_good.png'),
  },
  TREE_BAD: {
    id: 'TREE_BAD',
    name: "L'Arbre maudit",
    emoji: '🌳',
    imageUrl: assetUrl('/images/tree_bad.png'),
  },
  BOO: {
    id: 'BOO',
    name: 'Boo',
    emoji: '👻',
    imageUrl: assetUrl('/images/boo.png'),
  },
  MOLE: {
    id: 'MOLE',
    name: 'Topi Taupe',
    emoji: '🦫',
    imageUrl: assetUrl('/images/mole.png'),
  },
  TOADETTE: {
    id: 'TOADETTE',
    name: 'Toadette',
    emoji: '⭐',
    imageUrl: assetUrl('/images/toadette.png'),
  },
  KAMEK: {
    id: 'KAMEK',
    name: 'Kamek',
    emoji: '🧙',
    imageUrl: assetUrl('/images/kamek.png'),
  },
  PIT: {
    id: 'PIT',
    name: 'Le Trou',
    emoji: '🕳️',
    imageUrl: assetUrl('/images/pit.png'),
  },
  STAR: {
    id: 'STAR',
    name: 'Étoile',
    emoji: '⭐',
    imageUrl: assetUrl('/images/star.png'),
  },
  MUSHROOM: {
    id: 'MUSHROOM',
    name: 'Champignon',
    emoji: '🍄',
    imageUrl: assetUrl('/images/mushroom.png'),
  },
  SIGNPOST: {
    id: 'SIGNPOST',
    name: 'Panneau',
    emoji: '🪧',
    imageUrl: assetUrl('/images/signpost.png'),
  },
}

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

/**
 * Returns the emoji and optional imageUrl for a given character ID.
 * Useful in components that need to render a character portrait with
 * automatic emoji fallback.
 */
export function getCharacterImage(id: EventCharacterId): {
  emoji: string
  imageUrl: string | null
} {
  const def = EVENT_CHARACTERS[id]
  return { emoji: def.emoji, imageUrl: def.imageUrl }
}
