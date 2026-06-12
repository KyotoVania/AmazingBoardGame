# Banque de portraits de personnages

Ce dossier contient les images proposées dans le **PortraitPicker** (le sélecteur
qui permet de remplacer le portrait d'un personnage de dialogue : Boo, Kamek,
Toadette, Flutter, les arbres, Topi Taupe, etc.).

## Comment ajouter une image à la banque

1. Dépose ton image dans ce dossier, par exemple `boo2.png`.
   - Formats : PNG, JPG, WebP, GIF.
   - Idéalement carrée (256×256 ou plus), elle sera affichée en rond.

2. Copie `manifest.example.json` en `manifest.json` (s'il n'existe pas encore),
   puis ajoute une entrée :

   ```json
   [
     { "name": "Boo qui louche", "file": "/images/characters/boo2.png" }
   ]
   ```

   - `name` : libellé affiché dans le menu déroulant.
   - `file` : chemin public de l'image (commence par `/images/characters/…`).

3. L'image apparaît alors dans le dropdown du PortraitPicker.

## Notes

- Le `manifest.json` est **optionnel** : s'il est absent, la banque est vide et
  seul l'upload direct reste possible.
- Les choix de l'utilisateur (banque ou upload) sont sauvegardés localement
  dans le navigateur (`localStorage`, clé `www-portraits`).
- L'upload d'une image lourde (> 400 Ko) est automatiquement recompressé en
  JPEG 256×256 pour ne pas saturer le stockage local.
