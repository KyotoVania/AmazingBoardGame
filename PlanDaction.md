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
- Banque : `public/images/cursed/manifest.json` (liste de fichiers image/gif) ; fallback :
  rien ne s'affiche si vide. Composant `CursedOverlay` : timer hors reducer (App),
  affiche image random plein écran ~6 s + shake/flash/zalgo text random (pool dans
  eventNarratives `CURSED` si présent) + son ? (pas de son pour l'instant).
- Bouton debug « 💀 Cursed now » dans le DebugPanel.

## 🔍 AUDIT COMPLET (agent Plan, 2026-06-12) — backlog priorisé

### Bugs / dettes repérés dans le code
- ✅ **CORRIGÉ** (`271cc8f`) `prepareRoll` : le dé bonus partait même sur lancer forcé (forcedRoll mis à null AVANT le test) → `wasForced` capturé en tête.
- ✅ **CORRIGÉ** (`271cc8f`) `LOAD_STATE` : `state.fx` sauvegardé rejouait l'effet visuel au restore → `fx: null`.
- ⬜ Reducer pas 100 % pur : `pickNarrative` (Math.random) appelé DANS le moteur → pas de replay déterministe des textes. Fix : le reducer émet `{ narrativeKey, params }`, EventPopup tire le texte. Prérequis pour i18n/2e plateau.
- ⬜ `EventPopup.popupCharacter()` devine le portrait par string-matching du titre FR (fragile) → ajouter `characterId?: EventCharacterId` dans `PendingAction.POPUP`.
- ⬜ Seed RNG hors GameState (`rng.ts` singleton) → l'autosave ne restaure pas la séquence aléatoire. Mettre `rngState` dans l'état.
- ⬜ Recul (arbre maudit/Kamek) : `pick(PREV[...])` aléatoire aux nœuds multi-prédécesseurs → peut reculer sur un chemin jamais emprunté. Mémoriser le chemin aller dans MovementState, ou documenter.
- ⬜ `CursedOverlay` : timeouts non nettoyés à l'unmount, chevauchement possible de 2 summon.
- ⬜ `LOAD_STATE` : valider la save (zod ?) ; bump manuel de SAVE_VERSION risqué si `Player` change.
- ⬜ Duplication des maps de présentation SpaceType (Board3D vs ui/labels) → registre `spaceMeta` unique.

### Backlog priorisé (quick wins → gros chantiers)
| # | Item | Effort | Valeur | Statut |
|---|------|--------|--------|--------|
| 1 | README vitrine + LICENSE MIT (GIFs, badges, archi « reducer pur, la 3D anime des décisions déjà prises ») | S | ★★★★★ | ✅ `89a62c5` (GIFs/badges restent à ajouter quand la CI existera) |
| 2 | ESLint flat config + scripts `lint`/`typecheck`/`smoke` (des eslint-disable existent sans ESLint installé !) | S | ★★★★ | ⬜ (npm install côté user requis) |
| 3 | CI GitHub Actions : install → lint → typecheck → vitest → build → smoke + artifacts screenshots | S | ★★★★★ | ⬜ |
| 4 | Fix bug dé bonus / lancer forcé | S | ★★★ | ✅ `271cc8f` |
| 5 | GitHub Pages : `base` Vite + `assetUrl()` (BASE_URL) sur tous les fetch/chemins absolus | S/M | ★★★★★ | ✅ `89a62c5` — reste : le workflow deploy.yml |
| 6 | Titres de fin cachés + twist dernière manche | S | ★★★★ | ✅ `72e0816` — 7 titres (Éponge, Dealer, Picsou, Fauché, Spéléologue, Démolisseur, Consommateur), stats itemsUsed/pitFalls/wallsBroken dans Player |
| 7 | Purifier le reducer (narratifs par clé + characterId + RNG dans l'état) | M | ★★★★ | ⬜ prérequis de 12/15 |
| 8 | Audio Web Audio 100 % procédural (`src/audio/sfx.ts`, hook `useGameAudio` branché sur `state.fx` + phases ; pièce = arpège sinus, dé = bruit filtré, étoile = arpège majeur, mur = pitch-drop, gorgées = glouglou) + mute/volume dans ⚙️ | M | ★★★★ | ⬜ |
| 9 | Duel sur case occupée + boutique de Toad (choix d'achat à 3 items) | M | ★★★ | ⬜ |
| 10 | Mode démo auto-play (bot qui dispatche des actions valides) → GIFs gratuits + preuve de pureté du moteur | M | ★★★★ | ⬜ |
| 11 | Nombre de joueurs variable 2-6 (verrou à 4 : PLAYER_IDS, garde START_GAME, layouts 2v2) | M | ★★★ | ⬜ |
| 12 | Plateau injecté (`BoardDef` dans l'état) → 2e map en pure data | M/L | ★★★★ | ⬜ |
| 13 | 2-3 minijeux JOUABLES à l'écran (buzzer clavier 4 touches, stop-la-jauge, quiz) qui pré-remplissent SET_PODIUM | L | ★★★★★ | ⬜ le chantier le plus vendeur |
| 14 | Package `party-kit` séparé | L | ★★ | ⬜ seulement après 7+12 |
| 15 | i18n complète | L | ★ | ❌ déconseillé — README bilingue suffit |

### Audio — recettes concrètes (pour l'item 8)
Pas de howler (aucun fichier) : Web Audio pur, oscillateurs + enveloppes ADSR.
Pièce 988→1319 Hz 80 ms ; dé = bursts bruit blanc filtré ; étoile = arpège majeur triangle ;
mur = bruit + pitch-drop ; gorgées = sinus modulé descendant. Débloquer l'AudioContext au
1er clic du lobby. Point d'ancrage : `useGameAudio(state)` réagissant à `fx.id` et `phase`.

## ⚠️ Points de vigilance connus

- `npm test` jamais exécuté par l'agent (sandbox) → à lancer côté utilisateur après chaque grosse étape.
- Le smoke test `scripts/smoke.mjs` n'a pas été revérifié depuis la refonte de la map.
- `eventImages.ts` : portraits branchés dans EventPopup (fallback emoji si image manquante).
- Fins de ligne : repo en CRLF via autocrlf — ne pas s'inquiéter des warnings au commit.
