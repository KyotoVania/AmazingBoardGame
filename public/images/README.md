# 🎨 Event & Character Images

This folder holds images for NPC characters and event illustrations displayed
in the visual-novel-style dialog popups (EventPopup).

## How to add images

1. **Drop your image files here** (`public/images/`).
2. **Edit `src/game/eventImages.ts`** — set the `imageUrl` field to point to
   your file, e.g.:
   ```ts
   BOO: { id: 'BOO', name: 'Boo', emoji: '👻', imageUrl: '/images/boo.png' },
   ```
3. If you want to **keep using the emoji** fallback for a character, set
   `imageUrl` to `null`:
   ```ts
   BOO: { id: 'BOO', name: 'Boo', emoji: '👻', imageUrl: null },
   ```

## Supported formats

| Format | Notes                                    |
| ------ | ---------------------------------------- |
| PNG    | ✅ Best for pixel-art / transparency     |
| JPG    | ✅ Good for photos / painted art         |
| WebP   | ✅ Smaller file size, modern browsers    |
| GIF    | ✅ Animated characters (why not?)        |

## Recommended specs

- **Size:** 256×256 px or larger
- **Aspect ratio:** Square (1:1) works best in the popup portrait area
- **Transparency:** Use PNG or WebP if you want a transparent background

## File naming convention

Use lowercase with underscores, matching the character ID:

```
tree_good.png
tree_bad.png
boo.png
mole.png
toadette.png
kamek.png
pit.png
star.png
mushroom.png
signpost.png
```

---

*No images are required to run the game — the emoji fallback system handles
everything until you're ready to add art.*
