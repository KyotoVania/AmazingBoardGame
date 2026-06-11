# 🧊 3D Models

This folder holds 3D models used for board pieces, player tokens, and other
in-game objects rendered via Three.js.

## Supported formats

| Format | Loader              | Notes                                    |
| ------ | -------------------- | ---------------------------------------- |
| GLB    | `GLTFLoader`         | ✅ **Recommended** — binary glTF, fast   |
| GLTF   | `GLTFLoader`         | ✅ Works, but GLB is more compact        |
| FBX    | `FBXLoader`          | ⚠️ Works, but heavier — see below       |

## Using FBX files (e.g. from Unity)

Three.js can load FBX files directly with `FBXLoader` from
`three/examples/jsm/loaders/FBXLoader`:

```ts
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

const loader = new FBXLoader()
loader.load('/models/my_model.fbx', (fbx) => {
  scene.add(fbx)
})
```

However, **converting FBX → GLB is strongly recommended** for web use because:
- GLB files are smaller and load faster
- Better material/texture compatibility with Three.js
- No dependency on the FBX SDK

## Converting FBX to GLB

### Option 1: Blender (free, most reliable)
1. Open Blender → File → Import → FBX (.fbx)
2. Check that materials and textures look correct
3. File → Export → glTF 2.0 (.glb/.gltf)
4. Settings: Format = "glTF Binary (.glb)", check "Apply Modifiers"
5. Save to `public/models/`

### Option 2: `fbx2gltf` CLI tool (Facebook/Meta)
```bash
# Install
npm install -g fbx2gltf

# Convert
fbx2gltf --input my_model.fbx --output my_model.glb
```
GitHub: https://github.com/facebookincubator/FBX2glTF

### Option 3: Online converters
- https://products.aspose.app/3d/conversion/fbx-to-glb
- https://anyconv.com/fbx-to-glb-converter/

> ⚠️ Online converters may not handle complex materials or animations
> perfectly. Blender is the safest bet for Unity-exported FBX files.

## File organization

```
public/models/
├── README.md          ← You are here
├── player_token.glb   ← Player piece model
├── star.glb           ← Star collectible
├── board_tile.glb     ← Board tile decoration
└── ...
```

## Tips for Unity → Web pipeline

- Export FBX from Unity with "Binary" format (not ASCII)
- Embed textures in the FBX if possible, or place them alongside the file
- Keep poly count reasonable for web (< 10k tris per model is ideal)
- Bake lighting into textures/vertex colors if you want a similar look

---

*No models are required to run the game — the default rendering uses
programmatic Three.js geometries and canvas textures as placeholders.*
