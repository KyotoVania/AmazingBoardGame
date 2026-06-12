# 🌲 Woody Woods Party 🍻

> Un party game de plateau **type Mario Party × jeu à boire**, jouable sur la TV du salon.
> 4 équipes, un plateau 3D, des dés, des gorgées, une Étoile à chasser — et un Game Master
> qui pilote la soirée depuis le clavier.
>
> *A local-multiplayer board game (Mario Party–like drinking game) for the living-room TV —
> React, TypeScript, React Three Fiber. The game engine is a pure, fully-tested reducer:
> the 3D layer only animates decisions the engine has already made.*

## ✨ Features

- **Plateau 3D complet** (React Three Fiber) : île forestière nocturne procédurale (herbe, bois,
  ciel étoilé, lucioles), ~80 cases en graphe avec embranchements, panneaux directionnels animés,
  carrefours bidirectionnels à choix libre, mur destructible, trou piégé.
- **Boucle Mario Party fidèle** : cases bleues/rouges/items/chance/poisse/VS, Boo voleur,
  Toadette et son Étoile mobile, Topi Taupe qui réoriente les panneaux, arbres généreux/maudit,
  dés persos par personnage (20 persos du wiki SMP) + twist *jeu à boire* (cases gorgées,
  pénalités du podium).
- **Minijeux IRL orchestrés** : roulette de catégorie (FFA/1v1/2v2 avec tirage automatique des
  équipes), roulette de jeu configurable, saisie du podium par le GM, récompenses en dés bonus
  (lancés automatiquement EN PLUS du dé normal).
- **Cinématiques** : travelling caméra sur chaque événement, dialogues façon visual novel avec
  portraits custom, Roue de Kamek à suspense, pack d'effets (vols, étoile, mur, trou, gorgées),
  récap animé entre les manches.
- **Tout est customisable sans rebuild** : règles (⚙️ Config Panel), textes trash
  (`src/game/eventNarratives.ts`), portraits (`public/images/`), **modèles 3D .glb**
  (pions, arbres, Boo, taupe, Étoile — banque `public/models/manifest.json` ou upload direct),
  événements **cursed** périodiques (`public/images/cursed/`).
- **Autosave** à chaque action + reprise de partie au lancement.
- **God Mode** (touche `~`) : forcer les dés, téléporter, injecter des items, tooltips d'ids de
  cases au survol, déclencher minijeu/cursed à la demande.

## 🏗️ Architecture

```
src/game/        le MOTEUR — reducer pur (testé vitest, RNG seedable), graphe de plateau,
                 types stricts, config runtime, autosave, narratifs
src/components/three/   la SCÈNE — R3F : plateau, pions, dés 3D, caméra, modèles .glb
src/components/ui/      les OVERLAYS — HUD, dialogues, roulettes, podium, config panel
```

Le principe central : **le reducer décide, la 3D anime**. La face du dé est tirée *avant* que
le cube ne tournoie ; le déplacement est résolu case par case par le moteur et le pion ne fait
que sauter là où on lui dit. Résultat : tout le gameplay est testable sans navigateur
(`src/game/reducer.test.ts`, ~50 tests) et l'état complet est sérialisable (autosave triviale).

## 🚀 Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests du moteur (vitest)
npm run typecheck  # tsc -b
npm run smoke      # parcours navigateur headless + screenshots (npx playwright install chromium)
```

Build statique : `npm run build` (pour un sous-chemin type GitHub Pages :
`BASE_PATH=/AmazingBoardGame/ npm run build`).

## 🎨 Personnaliser sa soirée

| Quoi | Où |
|------|----|
| Ton des textes (trash/goofy) | `src/game/eventNarratives.ts` — pools de phrases avec `{name}`, `{amount}`… |
| Portraits des PNJ | `public/images/*.png` + `src/game/eventImages.ts` |
| Modèles 3D (pions, arbres, Boo, taupe, Étoile) | `.glb` dans `public/models/` + `manifest.json` `[{"name":"Grenouille","file":"/models/frog.glb"}]`, sélection au lobby |
| Images/GIFs cursed | `public/images/cursed/` + `manifest.json` `["jumpscare.gif"]`, intervalle dans ⚙️ |
| Règles (prix de l'Étoile, gorgées, mur, minijeux…) | bouton ⚙️ au lobby (et en partie via God Mode) |

## 🗺️ Roadmap

Voir [`PlanDaction.md`](./PlanDaction.md) — backlog priorisé issu d'un audit complet
(CI, audio procédural, minijeux jouables à l'écran, 2ᵉ plateau en pure data…).

## 📄 Licence

MIT — voir [`LICENSE`](./LICENSE).
