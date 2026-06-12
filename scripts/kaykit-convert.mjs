#!/usr/bin/env node
/**
 * kaykit-convert.mjs
 * -------------------
 * Convertit une sélection curée d'assets KayKit (.gltf + .bin + textures
 * externes) en fichiers .glb AUTONOMES (buffers + textures embarqués) vers
 * public/models/kaykit/.
 *
 * CONTRAINTE : le jeu tourne 100% OFFLINE. On n'applique AUCUNE compression
 * Draco / meshopt (leurs décodeurs sont fetchés depuis un CDN). On se contente
 * de `gltf-transform cp in.gltf out.glb` qui packe tout (mesh + textures) dans
 * un seul .glb autonome.
 *
 * Le script est IDEMPOTENT : relançable sans risque, il réécrit les .glb.
 *
 * Usage :
 *   node scripts/kaykit-convert.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

// Racines des 3 packs KayKit (dossiers Assets/gltf de chaque pack).
const PACKS = {
  forest: resolve(
    REPO,
    "3DASSET/KayKit_Forest_Nature_Pack_1.0_FREE/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf",
  ),
  platformer: resolve(
    REPO,
    "3DASSET/KayKit_Platformer_Pack_1.0_FREE/KayKit_Platformer_Pack_1.0_FREE/Assets/gltf",
  ),
  resourcebits: resolve(
    REPO,
    "3DASSET/KayKit_ResourceBits_1.0_FREE/KayKit_ResourceBits_1.0_FREE/Assets/gltf",
  ),
};

const OUT_DIR = resolve(REPO, "public/models/kaykit");

/**
 * LISTE CURÉE — éditable.
 *   pack : clé dans PACKS
 *   src  : chemin du .gltf relatif au dossier gltf du pack
 *   out  : nom de fichier .glb de sortie (kebab-case, sans extension)
 *   name : nom FR court et lisible (repris dans le manifest)
 */
const ASSETS = [
  // ---------------------------------------------------------------- FOREST
  // Arbres feuillus
  { pack: "forest", src: "Tree_1_A_Color1.gltf", out: "arbre-a", name: "Arbre A" },
  { pack: "forest", src: "Tree_1_B_Color1.gltf", out: "arbre-b", name: "Arbre B" },
  { pack: "forest", src: "Tree_2_A_Color1.gltf", out: "sapin-a", name: "Sapin A" },
  { pack: "forest", src: "Tree_2_B_Color1.gltf", out: "sapin-b", name: "Sapin B" },
  { pack: "forest", src: "Tree_3_A_Color1.gltf", out: "arbre-rond", name: "Arbre rond" },
  { pack: "forest", src: "Tree_4_A_Color1.gltf", out: "grand-arbre", name: "Grand arbre" },
  // Arbres morts / nus
  { pack: "forest", src: "Tree_Bare_1_A_Color1.gltf", out: "arbre-mort-a", name: "Arbre mort A" },
  { pack: "forest", src: "Tree_Bare_2_A_Color1.gltf", out: "arbre-mort-b", name: "Arbre mort B" },
  // Buissons
  { pack: "forest", src: "Bush_1_A_Color1.gltf", out: "buisson-a", name: "Buisson A" },
  { pack: "forest", src: "Bush_2_A_Color1.gltf", out: "buisson-b", name: "Buisson B" },
  { pack: "forest", src: "Bush_4_A_Color1.gltf", out: "buisson-fleuri", name: "Buisson fleuri" },
  // Herbes
  { pack: "forest", src: "Grass_1_A_Color1.gltf", out: "touffe-herbe-a", name: "Touffe d'herbe A" },
  { pack: "forest", src: "Grass_2_A_Color1.gltf", out: "touffe-herbe-b", name: "Touffe d'herbe B" },
  // Rochers
  { pack: "forest", src: "Rock_1_A_Color1.gltf", out: "rocher-a", name: "Rocher A" },
  { pack: "forest", src: "Rock_1_E_Color1.gltf", out: "rocher-b", name: "Rocher B" },
  { pack: "forest", src: "Rock_2_A_Color1.gltf", out: "rocher-plat", name: "Rocher plat" },
  { pack: "forest", src: "Rock_3_A_Color1.gltf", out: "rocher-moussu", name: "Rocher moussu" },
  { pack: "forest", src: "Rock_3_H_Color1.gltf", out: "gros-rocher", name: "Gros rocher" },

  // ------------------------------------------------------------ PLATFORMER
  // Décors d'événements / pickups
  { pack: "platformer", src: "yellow/star_yellow.gltf", out: "etoile-or", name: "Étoile dorée" },
  { pack: "platformer", src: "green/star_green.gltf", out: "etoile-verte", name: "Étoile verte" },
  { pack: "platformer", src: "yellow/diamond_yellow.gltf", out: "gemme", name: "Gemme" },
  { pack: "platformer", src: "green/heart_green.gltf", out: "coeur-vert", name: "Cœur vert" },
  { pack: "platformer", src: "red/heart_red.gltf", out: "coeur-rouge", name: "Cœur rouge" },
  { pack: "platformer", src: "yellow/power_yellow.gltf", out: "power-up", name: "Power-up" },
  { pack: "platformer", src: "green/flag_A_green.gltf", out: "drapeau-vert", name: "Drapeau vert" },
  { pack: "platformer", src: "red/flag_A_red.gltf", out: "drapeau-rouge", name: "Drapeau rouge" },
  // Mécanismes / hazards
  { pack: "platformer", src: "green/lever_floor_base_green.gltf", out: "levier", name: "Levier" },
  { pack: "platformer", src: "green/button_base_green.gltf", out: "bouton", name: "Bouton" },
  { pack: "platformer", src: "neutral/spring.gltf", out: "ressort", name: "Ressort sauteur" },
  { pack: "platformer", src: "neutral/cone.gltf", out: "pic", name: "Pic" },
  { pack: "platformer", src: "neutral/bomb.gltf", out: "bombe", name: "Bombe" },
  // Signalétique / structures
  { pack: "platformer", src: "neutral/sign.gltf", out: "panneau", name: "Panneau" },
  { pack: "platformer", src: "neutral/signage_finish.gltf", out: "ligne-arrivee", name: "Ligne d'arrivée" },
  { pack: "platformer", src: "neutral/structure_A.gltf", out: "arche", name: "Arche" },
  { pack: "platformer", src: "neutral/platform_wood_1x1x1.gltf", out: "plateforme-bois", name: "Plateforme de bois" },

  // ----------------------------------------------------------- RESOURCEBITS
  { pack: "resourcebits", src: "Gold_Bar.gltf", out: "lingot-or", name: "Lingot d'or" },
  { pack: "resourcebits", src: "Gold_Bars_Stack_Small.gltf", out: "pile-lingots-or", name: "Pile de lingots d'or" },
  { pack: "resourcebits", src: "Silver_Bar.gltf", out: "lingot-argent", name: "Lingot d'argent" },
  { pack: "resourcebits", src: "Iron_Bar.gltf", out: "lingot-fer", name: "Lingot de fer" },
  { pack: "resourcebits", src: "Gold_Nugget_Large.gltf", out: "pepite-or", name: "Pépite d'or" },
  { pack: "resourcebits", src: "Copper_Nuggets.gltf", out: "minerai-cuivre", name: "Minerai de cuivre" },
  { pack: "resourcebits", src: "Stone_Brick.gltf", out: "brique-pierre", name: "Brique de pierre" },
  { pack: "resourcebits", src: "Wood_Log_A.gltf", out: "buche", name: "Bûche" },
  { pack: "resourcebits", src: "Wood_Log_Stack.gltf", out: "tas-de-buches", name: "Tas de bûches" },
  { pack: "resourcebits", src: "Wood_Plank_A.gltf", out: "planche", name: "Planche" },
  { pack: "resourcebits", src: "Fuel_A_Barrel.gltf", out: "tonneau", name: "Tonneau" },
  { pack: "resourcebits", src: "Pallet_Wood.gltf", out: "palette-bois", name: "Palette de bois" },
];

// ---------------------------------------------------------------------------

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const results = [];
  let totalBytes = 0;
  let okCount = 0;
  let failCount = 0;

  console.log(`\nConversion KayKit -> ${OUT_DIR}\n`);

  for (const asset of ASSETS) {
    const packRoot = PACKS[asset.pack];
    if (!packRoot) {
      console.error(`  [SKIP] pack inconnu "${asset.pack}" pour ${asset.out}`);
      failCount++;
      continue;
    }
    const srcPath = resolve(packRoot, asset.src);
    const outPath = resolve(OUT_DIR, `${asset.out}.glb`);

    if (!existsSync(srcPath)) {
      console.error(`  [SKIP] introuvable : ${srcPath}`);
      failCount++;
      continue;
    }

    try {
      // `cp` repacke le gltf (mesh + textures externes) dans un .glb autonome.
      // Pas de Draco / meshopt : décodeurs CDN interdits en mode offline.
      execFileSync("npx", ["gltf-transform", "cp", srcPath, outPath], {
        cwd: REPO,
        stdio: ["ignore", "ignore", "pipe"],
      });
      const bytes = statSync(outPath).size;
      totalBytes += bytes;
      okCount++;
      results.push({ name: asset.name, file: `kaykit/${asset.out}.glb`, bytes });
      console.log(`  [OK]   ${asset.name.padEnd(24)} -> ${asset.out}.glb (${fmtKB(bytes)})`);
    } catch (err) {
      failCount++;
      const msg = err.stderr ? err.stderr.toString().trim().split("\n").pop() : err.message;
      console.error(`  [FAIL] ${asset.out} : ${msg}`);
    }
  }

  console.log(`\n--- Récapitulatif ---`);
  console.log(`  Convertis : ${okCount}/${ASSETS.length}`);
  if (failCount) console.log(`  Échecs    : ${failCount}`);
  console.log(`  Taille totale : ${fmtKB(totalBytes)} (${(totalBytes / 1024 / 1024).toFixed(2)} Mo)`);
  console.log(`  Dossier : ${OUT_DIR}\n`);

  if (totalBytes > 20 * 1024 * 1024) {
    console.warn("  ATTENTION : total > 20 Mo, envisager de reduire la selection.");
  }

  return results;
}

main();
