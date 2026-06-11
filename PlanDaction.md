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

## ✅ Étapes de cette session

| # | Tâche | Statut |
|---|-------|--------|
| 1 | Créer ce fichier | ✅ Fait |
| 2 | Brancher `eventNarratives.ts` (textes trash/goofy faciles à custom) dans les dialogues | ✅ Fait — toutes les popups moteur + intros UI (arbre/Boo/VS) piochent dans les pools, mémoïsé par événement |
| 3 | Autosave localStorage à chaque action + écran « Reprendre la partie ? » au boot | 🔄 En cours |
| 4 | Mur : RELANCER un dé devant le mur (au lieu de réutiliser le lancer du tour) | ⬜ |
| 5 | Slots GLB pour Arbre généreux, Arbre maudit, Topi Taupe, Boo | ⬜ |
| 6 | Banque de modèles (`public/models/manifest.json`) + sélecteur de modèles dans le LOBBY (perso par perso + éléments du décor) — plus seulement via debug | ⬜ |
| 7 | Événements CURSED random : toutes les ~10 min (configurable), image/GIF plein écran + FX ; banque dans `public/images/cursed/`, déclenchable manuellement en debug | ⬜ |
| 8 | Commit par feature + typecheck 0 erreur à chaque étape | 🔄 Continu |
| 9 | (Bonus si temps) Idées d'upgrades portfolio — voir section dédiée | ⬜ |

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
- Banque : `public/images/cursed/manifest.json` (liste de fichiers image/gif) ; fallback :
  rien ne s'affiche si vide. Composant `CursedOverlay` : timer hors reducer (App),
  affiche image random plein écran ~6 s + shake/flash/zalgo text random (pool dans
  eventNarratives `CURSED` si présent) + son ? (pas de son pour l'instant).
- Bouton debug « 💀 Cursed now » dans le DebugPanel.

## 💡 Backlog portfolio (pour les sessions suivantes)

- [ ] Sons / musique (Web Audio, assets libres dans public/sounds, volume dans ⚙️)
- [ ] Post-processing (bloom sur l'Étoile, vignette) via @react-three/postprocessing (nécessite npm install utilisateur)
- [ ] Mode plein écran TV + scaling UI (boutons plus gros à distance)
- [ ] Historique de partie / stats de fin (gorgées totales, étoiles volées…) en écran final enrichi
- [ ] Éditeur de map visuel (drag de cases) — gros chantier
- [ ] i18n EN/FR pour le portfolio
- [ ] README.md vitrine avec GIFs + déploiement GitHub Pages (`vite build` statique)
- [ ] CI GitHub Actions : typecheck + vitest

## ⚠️ Points de vigilance connus

- `npm test` jamais exécuté par l'agent (sandbox) → à lancer côté utilisateur après chaque grosse étape.
- Le smoke test `scripts/smoke.mjs` n'a pas été revérifié depuis la refonte de la map.
- `eventImages.ts` : portraits branchés dans EventPopup (fallback emoji si image manquante).
- Fins de ligne : repo en CRLF via autocrlf — ne pas s'inquiéter des warnings au commit.
