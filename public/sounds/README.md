# 🔊 Banque de sons — `public/sounds/`

Le jeu joue **vos propres sons**. Aucun son n'est généré : si vous ne déposez
rien ici, le jeu reste **totalement silencieux** (aucune erreur).

## Mise en route

1. **Renommez** `manifest.example.json` en **`manifest.json`**.
2. **Déposez vos fichiers audio** (`.mp3` ou `.ogg`) dans ce dossier, à côté du
   manifest.
3. Dans `manifest.json`, **associez chaque clé à votre fichier** :

   ```json
   {
     "dice_roll": "mon-lancer-de-de.mp3",
     "coins": "ka-ching.ogg"
   }
   ```

   - La **clé** (à gauche) est fixe : voir la liste ci-dessous.
   - La **valeur** (à droite) est le nom de votre fichier dans `public/sounds/`.
   - Vous pouvez **n'en remplir que certaines** : les clés absentes restent muettes.

Le réglage du **volume** et le **mute** se font en jeu (panneau « son »). Au
premier clic/tap, le navigateur débloque l'autoplay automatiquement.

## Liste des clés et quand chaque son joue

| Clé           | Joué quand…                                                          |
| ------------- | ------------------------------------------------------------------- |
| `dice_roll`   | le joueur entre dans la phase de **lancer de dé** (ROLLING)         |
| `step`        | le pion **saute d'une case à l'autre** pendant le déplacement       |
| `coins`       | un **vol de pièces** se produit (Coinado, Boo…)                     |
| `star_steal`  | un **vol d'Étoile** se produit (Boo)                               |
| `roulette`    | la **roulette de minijeu** démarre (catégorie ou titre)             |
| `podium`      | on arrive au **podium** de fin de manche                            |
| `rewards`     | on arrive à l'écran de **récompenses**                              |
| `turn`        | un **nouveau tour** commence (TURN_START)                           |
| `wall`        | un **mur** barre le passage et propose de le casser (WALL_PROMPT)   |
| `gameover`    | la partie est **terminée** (GAME_OVER)                              |
| `cursed`      | un **événement CURSED** se déclenche (image/GIF plein écran)        |

## Formats conseillés

- `.mp3` ou `.ogg`, courts (quelques secondes max).
- Les sons peuvent **se chevaucher** : chaque déclenchement joue une copie
  indépendante (utile pour `step` qui s'enchaîne vite).
