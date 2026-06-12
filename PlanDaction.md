# 📋 Plan d'action — Woody Woods Party

> **Fichier vivant.** Mis à jour à chaque étape par l'agent en cours.
> Dernière mise à jour : 2026-06-12 ~00h30 (agent Cowork session 1)
> Repo : branche `dev/fable`. Dernier commit au début de cette session : `4d84159`.

## 🧭 Contexte pour l'agent suivant

- Jeu de plateau type Mario Party × drinking game, React + TS + R3F, local multiplayer sur TV.
- Moteur = reducer pur (`src/game/reducer.ts`), testé par vitest (`reducer.test.ts`, ~45 tests).
- **Workflow sandbox** : npm registry bloqué côté agent → on ne peut PAS lancer vitest/vite ici
  (binaires natifs Linux absents). On typecheck avec `npx tsc -b --force` (fonctionne).
  L'utilisateur lance `npm test` / `npm run dev` sur sa machine Windows.
- Le montage fichier peut être en retard côté lecture bash : travailler dans `/tmp/abg`
  (copie git + `ln -s node_modules`), typechecker là-bas, puis `cp` vers le repo et committer.
- Commits : `git -c user.name="KyotoVania" -c user.email="jean-cyprien.roux@epitech.eu" commit`
  avec `core.autocrlf=true` (déjà configuré dans le repo).
- `state.config` = règles runtime éditables (Config Panel ⚙️). Les modèles GLB vivent HORS
  state (contexte `ModelsProvider`, `src/components/three/Models.tsx`) car non sérialisables.

## ✅ Session Fable (2026-06-12, machine perso — npm/vitest/chromium DISPONIBLES ici)

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Tests jamais exécutés → 2 échecs trouvés et corrigés (walk() consommait le FORK_CHOICE observé ; assertion 5 forks pré-bidirectionnel) | ✅ `ad07ef5` — 84/84 verts |
| 2 | **Plateau injectable** : BoardDef sérialisable, `setActiveBoard()` (exports vivants mutés en place, zéro importeur touché), `validateBoardDef`, persistance localStorage `www-custom-board` réinjectée au boot (main.tsx), garde-fou autosave (save → cases inexistantes = ignorée), 3 tests | ✅ `0b6300b` |
| 3 | **Banque KayKit** : 47 .glb autonomes (2,5 Mo, zéro Draco/CDN) via `scripts/kaykit-convert.mjs` (idempotent), manifest FR, `3DASSET/` gitignoré | ✅ `e4c95b0` (agent Opus) |
| 4 | **Sons banque de fichiers** : `src/audio/useGameSounds.ts` (11 clés sur transitions d'état), prefs localStorage, `SoundControls`, `public/sounds/README.md` | ✅ `b9447d9` (agent Opus) |
| 5 | **Portraits customisables** : overrides localStorage + banque `public/images/characters/` + upload recompressé, branché dans EventPopup | ✅ `0d86dd3` (agent Opus) |
| 6 | **🎨 L'Atelier** : hub custom séparé (map/modèles/portraits/sons/règles), lobby désencombré | ✅ `eaecc6a` |
| 7 | **Éditeur de map** : image source en fond (opacité/calage), cases posables/déplaçables, liens →/↔/suppr au clic, drapeaux, validation live, undo Ctrl+Z, export/import JSON, « Jouer cette map » | ✅ `eaecc6a` |
| 8 | **Décor 3D posable** : outil 🌳 (banque → clic sur la map, taille/rotation), `BoardDef.decor` (chemins bruts du manifest, portables), rendu FittedModel dans Board3D | ✅ `e0d6191` |
| 9 | **Wow alliés** : arrivée en courant depuis le bord + poussière, file indienne « canards », mini-dés violets à côté du dé (somme = bonus moteur exact) | ✅ `540aa80` (agent Opus) |
| 10 | **Bloom + vignettage** (@react-three/postprocessing, multisampling 0) | ✅ `da0a97a` |

Notes pour l'agent suivant :
- `npm run smoke` détecte maintenant tout chromium du cache ms-playwright (plus besoin de la version exacte) et gère les 2 modes du podium (FFA / équipes) + traverse l'Atelier.
- L'éditeur révèle que le tracé actuel diverge de imgMap (boucle intérieure absente) : l'utilisateur va retracer lui-même via l'Atelier — ne pas retoucher les seeds à la main.
- Backlog restant inchangé : items 2 (ESLint), 3 (CI), 7 (purifier reducer), 10 (mode démo), 11 (2-6 joueurs), 13 (minijeux jouables).

## ✅ Étapes de la session Cowork 1 (2026-06-12 ~00h30)

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Créer ce fichier | ✅ Fait |
| 2 | Brancher `eventNarratives.ts` (textes trash/goofy faciles à custom) dans les dialogues | ✅ Fait — toutes les popups moteur + intros UI (arbre/Boo/VS) piochent dans les pools, mémoïsé par événement |
| 3 | Autosave localStorage à chaque action + écran « Reprendre la partie ? » au boot | ✅ Fait — `autosave.ts`, action `LOAD_STATE` (fusion robuste avec les défauts), `ResumeBanner` au lobby, purge en GAME_OVER, 2 tests. Commit `dfb83de` |
| 4 | Mur : RELANCER un dé devant le mur (au lieu de réutiliser le lancer du tour) | ✅ Fait — `WALL_PROMPT`/`WALL_TRY`, jet dédié 1-6 (honore forcedRoll debug), dialogue 🧱, narratifs WALL_BREAK/FAIL, tests réécrits déterministes. Commit `e8088c3` |
| 5 | Slots GLB pour Arbre généreux, Arbre maudit, Topi Taupe, Boo | ✅ Fait — slots `TREE_GOOD/TREE_BAD/MOLE/BOO` (+STAR, P1-P4), `CustomOrDefault` avec `ModelErrorBoundary` (repli silencieux si .glb cassé/404). Commit `a7c4e82` |
| 6 | Banque de modèles + sélecteur au LOBBY | ✅ Fait — `public/models/manifest.json` (`[{"name","file"}]`), `ModelPicker` partagé (dropdown banque + upload + ✕), intégré dans chaque carte joueur du lobby + section « Modèles 3D du plateau » + onglet ⚙️. Commit `a7c4e82` |
| 7 | Événements CURSED random | ✅ Fait — `CursedOverlay` : toutes les `config.cursedIntervalMin` min (défaut 10, 0=off, réglable ⚙️), image random de `public/images/cursed/manifest.json` (`["fichier.gif"]`), strobo+glitch+shake+consigne du pool `CURSED` (eventNarratives), bouton 💀 dans le DebugPanel (event `www-cursed-now`). Commit `c58266d` |
| 8 | Commit par feature + typecheck 0 erreur à chaque étape | ✅ 6 commits : `2f0d306` → `c58266d` |
| 9 | Idées d'upgrades portfolio | 🔄 audit lancé, voir section Backlog enrichie |

## 📣 À dire à l'utilisateur au réveil

- Lancer `npm test` (les tests mur/Kamek/carrefours/save ont changé) puis `npm run dev`.
- Pour la banque : remplir `public/models/manifest.json`, ex.
  `[{ "name": "Grenouille", "file": "/models/frog.glb" }]`
- Pour le cursed : déposer des images/GIFs dans `public/images/cursed/` et lister les noms
  dans `public/images/cursed/manifest.json`, ex. `["jumpscare1.gif", "cursed_cat.png"]`.
- Les sorts BAD_LUCK/GIVE/SIPS/BACK de Kamek, le mur, et tous les dialogues parlent
  désormais en mode trash via `eventNarratives.ts` (c'est LE fichier à éditer pour le ton).

## 📝 Détails d'implémentation décidés

### 2. Narratifs
- `src/game/eventNarratives.ts` existe déjà (pools de phrases FR trash avec placeholders `{name}`, `{amount}`…).
- Brancher dans `EventPopup`/reducer : helper `narrate(key, vars)` qui pioche une phrase random
  et remplace les placeholders. Le reducer continue d'émettre titre+texte mais le TEXTE
  vient du pool quand la clé existe.

### 3. Autosave
- `useGameState.tsx` : effet qui sérialise `state` (JSON) dans `localStorage('www-autosave')`
  à chaque changement (hors LOBBY). Au boot, si une save existe et phase ≠ GAME_OVER →
  écran/bandeau « Reprendre la partie (manche X, joueur Y) ? » → action `LOAD_STATE`.
- Attention : ne PAS sauver les avatars dataURL ? Si, ils sont dans le state et c'est voulu
  (quelques dizaines de Ko). Les modèles GLB ne sont pas sauvegardés (hors state).

### 4. Mur
- Nouveau pending `WALL_PROMPT { spaceId, strength }` quand on ATTEINT le mur :
  bouton « 🎲 Tenter le mur » → nouveau jet 1-6 (résolu moteur, montré en dialogue), pas le
  lancer du tour. Réussite → mur cassé, on continue le mouvement. Échec → mur -1, on s'arrête.
- Garder le déplacement restant en attente pendant le prompt (movement.remaining intact).

### 5/6. Modèles
- Slots ajoutés : `TREE_GOOD`, `TREE_BAD`, `MOLE`, `BOO` (en plus de P1..P4, STAR).
- `public/models/manifest.json` : `[{ "name": "Pion grenouille", "file": "/models/frog.glb" }]`
  → fetché au boot par `ModelsProvider` (échec silencieux si absent).
- LobbyScreen : sous le choix de perso, un sélecteur « Modèle 3D » (banque + upload).
  Section « Décor » dans le lobby pour STAR/TREE_GOOD/TREE_BAD/MOLE/BOO.
- ConfigPanel garde son onglet modèles (in-game debug).

### 7. Cursed events
- `state.config.cursedIntervalMin` (défaut 10, 0 = off) éditable dans ⚙️.
- Banque : `public/images/cursed/manifest.json` (liste de fichiers image/gif) ; f