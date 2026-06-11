/**
 * ============================================================================
 *  eventNarratives.ts — Pool de textes narratifs pour chaque événement du jeu
 * ============================================================================
 *
 *  🍺  TOUTES les phrases sont en français, ton TRASH / GOOFY.
 *      C'est un drinking game, pas un Mario Party pour enfants.
 *
 *  📝  PERSONNALISATION FACILE :
 *      - Chaque clé correspond à un type d'événement du jeu.
 *      - Chaque valeur est un tableau de chaînes avec des placeholders
 *        entre accolades : {name}, {amount}, {item}, etc.
 *      - Ajoutez, retirez ou modifiez les phrases comme bon vous semble.
 *      - Le helper `pickNarrative(key, vars)` pioche au hasard et remplace
 *        les placeholders automatiquement.
 *
 *  ⚠️  Le random utilisé ici est Math.random() (cosmétique uniquement).
 *      Le jeu possède son propre RNG seedable pour la logique de jeu.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
//  Narrative templates — 3-5 variations par événement
// ---------------------------------------------------------------------------

export const NARRATIVES = {

  /* ── Espaces de base ───────────────────────────────────────────────── */

  /** Blue space — gain de pièces. Vars : {name}, {amount} */
  BLUE: [
    `{name} atterrit sur un espace bleu et ramasse {amount} pièces comme un clochard qui trouve un billet par terre. Classe.`,
    `Oh ! {name} gagne {amount} pièces ! C'est pas Noël, mais c'est pas mal pour quelqu'un de ton niveau.`,
    `{name} touche {amount} pièces. Ça paiera même pas ton prochain verre, mais bon.`,
    `DING DING ! {amount} pièces pour {name} ! Essaie de pas tout claquer en shots cette fois.`,
    `{name} récupère {amount} pièces. Même un pigeon ferait mieux, mais on va pas cracher dessus.`,
  ],

  /** Red space — perte de pièces. Vars : {name}, {amount} */
  RED: [
    `{name} se vautre sur un espace rouge et perd {amount} pièces. T'as mal ? Tant mieux.`,
    `OUCH ! {name} perd {amount} pièces ! La vie est dure, surtout quand t'es nul.`,
    `{name} dit adieu à {amount} pièces. Comme ton ex, elles reviendront pas.`,
    `Espace rouge ! {name} se fait siphonner {amount} pièces. Pleure pas, c'est que de l'argent fictif.`,
    `{name} perd {amount} pièces sur le rouge. T'aurais dû aller au casino, le résultat serait le même.`,
  ],

  /** Start space — rien ne se passe. Vars : {name} */
  START: [
    `{name} revient à la case départ. Comme ta vie sentimentale, on tourne en rond.`,
    `{name} est de retour au point de départ ! Change rien, ça marche visiblement pas.`,
    `Case départ pour {name}. Y'a rien ici, comme dans ton frigo un dimanche soir.`,
    `{name} passe par la case départ. Pas de prime, pas de médaille, juste la honte.`,
  ],

  /* ── Objets ────────────────────────────────────────────────────────── */

  /** Item obtained. Vars : {name}, {item} */
  ITEM_GET: [
    `{name} obtient : {item} ! Range-le bien, c'est pas un jouet. Quoique...`,
    `OH LA LA ! {name} chope un(e) {item} ! Essaie de pas le gaspiller comme tes chances dans la vie.`,
    `{name} reçoit {item}. C'est Noël avant l'heure, profites-en, ça durera pas.`,
    `{item} pour {name} ! Utilise-le intelligemment. Ah non pardon, c'est toi.`,
  ],

  /** Inventory full. Vars : {name} */
  ITEM_FULL: [
    `{name} a les poches pleines ! Impossible de porter plus. Faut apprendre à lâcher prise, comme avec ton ex.`,
    `Inventaire PLEIN pour {name} ! T'es pas un sac à dos sans fond, gros.`,
    `{name} peut plus rien porter. T'es chargé(e) comme un vendredi soir à 2h du mat'.`,
    `Pas de place pour {name} ! Utilise un objet d'abord, espèce de hamster accumulateur.`,
  ],

  /* ── Espaces Chance / Malchance ────────────────────────────────────── */

  /** Lucky space — coins. Vars : {name}, {amount} */
  LUCKY_COINS: [
    `JACKPOT ! {name} trouve {amount} pièces par terre ! C'est ton jour de chance, profite, ça arrive jamais.`,
    `{name} a une chance de DINGUE et ramasse {amount} pièces ! Va jouer au loto tant que t'y es.`,
    `La roue tourne ! {name} gagne {amount} pièces grâce à Dame Fortune. Elle est bourrée aussi apparemment.`,
    `{amount} pièces tombent du ciel pour {name} ! Miraculeux, comme toi qui tiens encore debout.`,
  ],

  /** Lucky space — item. Vars : {name}, {item} */
  LUCKY_ITEM: [
    `{name} trouve un(e) {item} par un coup de chance MONUMENTAL ! T'as vendu ton âme ou quoi ?`,
    `INCROYABLE ! {name} reçoit {item} gratos ! Le destin est généreux avec les bourrés.`,
    `{name} obtient {item} par pure chance ! Même un singe avec un dé ferait pas mieux.`,
    `Cadeau du ciel ! {item} pour {name} ! Quelqu'un là-haut t'aime bien (ou te prend en pitié).`,
  ],

  /** Bad luck space — lose coins. Vars : {name}, {amount} */
  BAD_LUCK_COINS: [
    `PAS DE BOL ! {name} perd {amount} pièces ! Le karma te rattrape, sale joueur.`,
    `{name} se fait voler {amount} pièces par le destin. C'est ça de tricher à la vie.`,
    `Malchance cosmique ! {name} dit bye-bye à {amount} pièces. Bois un coup, ça ira mieux. Ou pas.`,
    `{name} perd {amount} pièces. L'univers te déteste et franchement, on comprend.`,
    `AÏEEE ! {amount} pièces envolées pour {name} ! C'est la lose incarnée.`,
  ],

  /** Bad luck space — lose item. Vars : {name}, {item} */
  BAD_LUCK_ITEM: [
    `{name} perd son/sa {item} ! HAHAHA ! C'est tragique mais tellement drôle.`,
    `Adieu {item} ! {name} se fait dépouiller par la malchance. Pleure pas, ça tache.`,
    `Le destin arrache {item} des mains de {name} ! Brutal. Impitoyable. Hilarant.`,
    `{name} dit au revoir à {item}. C'était beau tant que ça durait. Comme ton dernier couple.`,
  ],

  /* ── Gorgées ───────────────────────────────────────────────────────── */

  /** Sip plus — boire des gorgées. Vars : {name}, {amount} */
  SIP_PLUS: [
    `🍺 {name} doit boire {amount} gorgée(s) ! SANTÉ, GROSSE TÊTE !`,
    `GLOU GLOU ! {name} se tape {amount} gorgée(s) ! C'est pas une option, c'est un ORDRE.`,
    `{name} : {amount} gorgée(s) dans le gosier. Ton foie te déteste déjà, autant continuer.`,
    `{amount} gorgée(s) pour {name} ! Bois ou dégage, y'a pas de milieu ici.`,
    `Le jeu a parlé : {name} boit {amount} gorgée(s). Résister est futile. Et lâche.`,
  ],

  /* ── VS / Duel ─────────────────────────────────────────────────────── */

  /** VS space — tout le monde mise. Vars : {amount} */
  VS: [
    `⚔️ ESPACE VS ! Tout le monde mise {amount} pièces ! QUE LE PLUS BOURRÉ GAGNE !`,
    `BASTON GÉNÉRALE ! {amount} pièces sur la table ! C'est l'heure du carnage !`,
    `VS TIME ! Chaque joueur balance {amount} pièces dans le pot ! Pas de pitié pour les faibles !`,
    `🎲 DUEL ROYAL ! {amount} pièces chacun ! Que le sang coule (métaphoriquement) (ou pas) !`,
  ],

  /* ── Panneau / Signpost ────────────────────────────────────────────── */

  /** Signpost rotates. No vars. */
  SIGNPOST: [
    `Le panneau tourne ! Nouvelle direction ! C'est comme ta boussole morale : ça pointe n'importe où.`,
    `ROTATION DU PANNEAU ! Le chemin change ! Comme tes excuses quand t'es bourré(e).`,
    `Le panneau fait des siennes et change de direction ! Chaos, anarchie, PERFECTION.`,
    `Panneau qui tourne = nouveau chemin ! Surpriiiiise ! T'aimes les surprises, hein ?`,
  ],

  /* ── Fosse (Pit) ───────────────────────────────────────────────────── */

  /** Falling into a pit. Vars : {name} */
  PIT: [
    `{name} TOMBE DANS UNE FOSSE ! HAHAHAHA ! Regarde où tu marches, patate !`,
    `PLOUF ! {name} s'effondre dans le trou ! C'est le fond. Littéralement.`,
    `{name} disparaît dans une fosse ! Comme ton dignité ce soir, c'est parti sans prévenir.`,
    `OH NON ! {name} tombe dans le piège ! T'es coincé(e) là-dedans comme dans un mauvais date.`,
  ],

  /** Still stuck in pit. Vars : {name}, {roll}, {needed} */
  PIT_STUCK: [
    `{name} essaie de sortir avec un {roll}... il fallait {needed}. RATÉ ! Reste au fond, looser.`,
    `{name} lance {roll} mais il faut {needed} pour sortir. T'es pas prêt(e) visiblement.`,
    `{roll} pour {name} ! Il fallait {needed}. Toujours coincé(e) ! Prends racine tant qu'à faire.`,
    `{name} galère avec un {roll} (fallait {needed}). Le trou te va bien, reste-y.`,
  ],

  /** Escaping the pit. Vars : {name}, {roll} */
  PIT_ESCAPE: [
    `{name} s'extirpe du trou avec un {roll} ! LIBERTÉ ! Tu pues la fosse mais t'es libre !`,
    `MIRACLE ! {name} sort de la fosse avec {roll} ! Tel un phénix qui renaît... d'un trou.`,
    `{name} s'échappe enfin avec un {roll} ! Allez, file avant de retomber dedans !`,
    `{roll} ! {name} jaillit de la fosse comme un bouchon de champagne ! POP !`,
  ],

  /* ── Arbre Maléfique / Evil Tree ───────────────────────────────────── */

  /** Evil tree takes coins. Vars : {name}, {amount} */
  TREE_BAD_COINS: [
    `🌳 L'arbre maléfique vole {amount} pièces à {name} ! La nature est cruelle, comme ce jeu.`,
    `{name} se fait racketter par UN ARBRE. {amount} pièces en moins. T'as perdu contre du bois, bravo.`,
    `L'arbre sombre arrache {amount} pièces à {name} ! Même la végétation te manque de respect.`,
    `{amount} pièces volées par l'arbre ! {name}, t'es la honte de l'espèce humaine.`,
  ],

  /** Evil tree pushes back. Vars : {name}, {amount} */
  TREE_BAD_BACK: [
    `🌳 L'arbre maléfique repousse {name} de {amount} cases en arrière ! DÉGAGE, a dit l'arbre.`,
    `{name} se fait yeeter de {amount} cases par un arbre ! La nature reprend ses droits, VIOLEMMENT.`,
    `RECULE DE {amount} ! L'arbre en a marre de ta tronche, {name}. Et on le comprend.`,
    `{name} vole en arrière de {amount} cases ! L'arbre t'a giflé comme ta mère quand t'avais 5 ans.`,
  ],

  /* ── Arbre Gentil / Good Tree ──────────────────────────────────────── */

  /** Good tree offers choice. Vars : {name} */
  TREE_GOOD_PROMPT: [
    `🌳 L'arbre bienveillant sourit à {name} ! "Choisis ton cadeau, petit(e) alcoolique !"`,
    `{name} rencontre l'arbre gentil ! Il est généreux, pas comme toi quand c'est ta tournée.`,
    `L'arbre sacré s'adresse à {name} : "Approche, voyageur titubant, j'ai des cadeaux !"`,
    `{name} trouve l'arbre bienveillant ! Pour une fois que quelque chose de bien t'arrive...`,
  ],

  /** Good tree gives coins. Vars : {name}, {amount} */
  TREE_GOOD_COINS: [
    `L'arbre file {amount} pièces à {name} ! Généreux comme un oncle bourré à Noël.`,
    `{amount} pièces de la part de l'arbre pour {name} ! Dis merci au moins, mal élevé(e).`,
    `{name} reçoit {amount} pièces de l'arbre ! C'est beau la nature quand ça paye.`,
  ],

  /** Good tree gives extra dice. Vars : {name} */
  TREE_GOOD_DICE: [
    `L'arbre offre un dé bonus à {name} ! Double tour, double chance de faire n'importe quoi !`,
    `DÉ BONUS pour {name} grâce à l'arbre ! Relance, et essaie de pas te planter cette fois.`,
    `{name} obtient un dé supplémentaire de l'arbre ! C'est comme un deuxième shot : dangereux mais tentant.`,
  ],

  /* ── Mur / Wall ────────────────────────────────────────────────────── */

  /** Breaking a wall. Vars : {name}, {roll}, {needed} */
  WALL_BREAK: [
    `💥 {name} DÉFONCE le mur avec un {roll} (fallait {needed}) ! HULK SMASH version picole !`,
    `BOUM ! {name} explose le mur ({roll} vs {needed}) ! T'es une machine de destruction !`,
    `{name} lance {roll} et pulvérise le mur ({needed} requis) ! Qui a besoin de portes ?!`,
    `Le mur TREMBLE et s'écroule devant {name} ! {roll} contre {needed} ! VICTOIRE BRUTALE !`,
  ],

  /** Failing to break wall. Vars : {name}, {roll}, {needed}, {newStrength} */
  WALL_FAIL: [
    `{name} lance {roll} contre le mur (fallait {needed}). RATÉ. Le mur rigole. Force restante : {newStrength}.`,
    `{name} se pète les phalanges sur le mur ({roll} vs {needed}). Aïe. Résistance du mur : {newStrength}.`,
    `{roll} pour {name} mais le mur tient bon ({needed} requis) ! Le mur est à {newStrength} maintenant. Réessaie, champion.`,
    `Le mur résiste à {name} ({roll}/{needed}). Force : {newStrength}. Ce mur a plus de volonté que toi.`,
  ],

  /* ── Étoile / Star ─────────────────────────────────────────────────── */

  /** Buying a star. Vars : {name}, {cost} */
  STAR_BUY: [
    `⭐ {name} ACHÈTE UNE ÉTOILE pour {cost} pièces ! ON EST PAS LÀ POUR JOUER, ON EST LÀ POUR GAGNER !`,
    `{name} claque {cost} pièces pour une ÉTOILE ! Baller move ! Bois un coup pour célébrer !`,
    `ÉTOILE ACHETÉE ! {name} lâche {cost} pièces comme un boss ! Ça c'est du POWER MOVE !`,
    `{name} s'offre une étoile ({cost} pièces) ! Tu flambes comme ton foie ce soir.`,
    `UNE ÉTOILE pour {name} ! {cost} pièces, prix d'ami ! T'es riche ou juste inconscient(e) ?`,
  ],

  /* ── Distribution de gorgées ───────────────────────────────────────── */

  /** Distributing sips. Vars : {from}, {to}, {amount} */
  SIP_DISTRIBUTE: [
    `🍺 {from} envoie {amount} gorgée(s) à {to} ! C'est ça l'amitié TOXIQUE !`,
    `{from} force {to} à boire {amount} gorgée(s) ! Pas de pitié entre potes !`,
    `{amount} gorgée(s) de {from} vers {to} ! BOIS, ESCLAVE DU JEU !`,
    `{from} → {to} : {amount} gorgée(s) ! La vengeance est un plat qui se boit frais.`,
    `{to} reçoit {amount} gorgée(s) de la part de {from} ! Ton foie envoie ses condoléances.`,
  ],

  /* ── Boo ───────────────────────────────────────────────────────────── */

  /** Boo intro — offering services. Vars : {name} */
  BOO_INTRO: [
    `👻 BOO apparaît devant {name} ! "Héhéhé... Qui veux-tu ruiner ce soir ?"`,
    `{name} invoque BOO ! Le fantôme des coups bas est à ton service. Qui va souffrir ?`,
    `BOO se pointe ! {name}, c'est l'heure de faire des ennemis. Choisis ta victime !`,
    `👻 "Boooonsoir {name}... J'ai faim de chaos. Qui on dépouille ?" — Boo, probablement.`,
  ],

  /** Boo stole coins. Vars : {name}, {target}, {amount} */
  BOO_STEAL_COINS: [
    `👻 BOO vole {amount} pièces à {target} pour {name} ! Crime parfait. Presque.`,
    `{name} envoie Boo racketter {target} : {amount} pièces volées ! C'est du vol, mais c'est DRÔLE.`,
    `Boo dépouille {target} de {amount} pièces pour {name} ! L'amitié, c'est surfait de toute façon.`,
    `{amount} pièces arrachées à {target} par Boo ! {name} sourit comme un psychopathe. Beau.`,
  ],

  /** Boo stole a star. Vars : {name}, {target} */
  BOO_STEAL_STAR: [
    `👻 BOO VOLE UNE ÉTOILE À {target} POUR {name} ! C'EST MONSTRUEUX ! C'EST MAGNIFIQUE !`,
    `{name} fait voler l'ÉTOILE de {target} par Boo ! Le crime du siècle ! Bois en l'honneur de cette trahison !`,
    `ÉTOILE VOLÉE ! {target} se fait dépouiller par Boo pour {name} ! Les amitiés meurent ce soir.`,
    `Boo arrache l'étoile de {target} ! {name} jubile ! C'est officiel : t'as plus d'amis.`,
  ],

  /* ── Objets utilisables ────────────────────────────────────────────── */

  /** Mushroom (extra dice). Vars : {name} */
  ITEM_MUSHROOM: [
    `🍄 {name} bouffe un champignon ! Tour bonus ! Pas SÛR que ce soit légal mais on s'en fout !`,
    `{name} utilise un Champignon ! Double dé ! Tu vas aller VITE (vers ta propre destruction).`,
    `CHAMPIGNON pour {name} ! Ça te donne des ailes ! Enfin, des jambes en plus. Tu comprends.`,
    `{name} gobe le champi ! Attention, ça risque de monter... au sens figuré. Quoique.`,
  ],

  /** Golden Mushroom (triple dice). Vars : {name} */
  ITEM_GOLDEN_MUSHROOM: [
    `🍄✨ {name} utilise le CHAMPIGNON DORÉ ! TROIS DÉS ! C'EST LA FOLIE FURIEUSE !`,
    `CHAMPIGNON DORÉ activé par {name} ! Triple lancé ! T'es soit un génie soit complètement taré !`,
    `{name} dégaine le champi en or ! TROIS DÉS D'UN COUP ! On est dans le turbo, bébé !`,
    `{name} croque le champignon doré ! Triple tour ! Ton personnage va tellement vite qu'il voit double. Comme toi.`,
  ],

  /** Poison — targeting someone. Vars : {name}, {target} */
  ITEM_POISON: [
    `☠️ {name} empoisonne {target} ! Sale coup ! Mais tellement satisfaisant.`,
    `{name} balance du poison sur {target} ! C'est VICIEUX, c'est LÂCHE, c'est PARFAIT.`,
    `POISON ! {name} intoxique {target} ! L'amitié c'est sacré ? Pas ici.`,
    `{target} se fait empoisonner par {name} ! Bienvenue dans l'enfer, population : toi.`,
  ],

  /** Rigged dice. Vars : {name}, {value} */
  ITEM_RIGGED_DICE: [
    `🎲 {name} utilise un DÉ TRUQUÉ ! Résultat garanti : {value} ! C'est de la TRICHE et c'est BEAU.`,
    `{name} sort le dé pipé : {value} assuré ! Les tricheurs prospèrent dans ce jeu.`,
    `DÉ TRUQUÉ activé ! {name} obtient {value} ! La morale est morte et {name} l'a tuée.`,
    `{name} triche ouvertement avec un dé truqué ({value}) ! Pas de honte, que de la STRATÉGIE.`,
  ],

  /** Coinado — stealing coins. Vars : {name}, {target}, {amount} */
  ITEM_COINADO: [
    `🌪️ COINADO ! {name} aspire {amount} pièces à {target} ! C'est une tornade de LARCIN !`,
    `{name} déclenche le Coinado sur {target} ! {amount} pièces volées dans le tourbillon !`,
    `COINADO ! {name} → {target} ! {amount} pièces changent de mains ! C'est beau, le capitalisme sauvage.`,
    `{name} lâche le Coinado ! {target} perd {amount} pièces dans la tempête ! Pas de parapluie pour ça.`,
  ],

  /** Fly Guy — stealing item. Vars : {name}, {target}, {item} */
  ITEM_FLY_GUY: [
    `🪰 Fly Guy vole {item} à {target} pour {name} ! Petit mais VICIEUX !`,
    `{name} envoie Fly Guy piquer {item} à {target} ! Le petit volant frappe encore !`,
    `Fly Guy en mission ! {item} arraché à {target} pour {name} ! C'est du grand banditisme aérien.`,
    `{name} utilise Fly Guy pour choper {item} de {target} ! Crime volant parfaitement exécuté !`,
  ],

  /** Golden Pipe — teleport to star. Vars : {name} */
  ITEM_GOLDEN_PIPE: [
    `🚀 {name} utilise le TUYAU DORÉ et se téléporte vers l'étoile ! SHORTCUT ULTIME !`,
    `TUYAU DORÉ ! {name} disparaît et réapparaît devant l'étoile ! C'est de la MAGIE (ou de la triche).`,
    `{name} active le Tuyau Doré ! TÉLÉPORTATION ! Tu viens de skip la moitié du plateau, espèce de malin.`,
    `{name} plonge dans le Tuyau Doré ! WOOOOSH ! Prochaine station : l'étoile ! Tous les coups sont permis !`,
  ],

  /** Hidden block — found a star. Vars : {name} */
  ITEM_HIDDEN_BLOCK_STAR: [
    `❓⭐ {name} TROUVE UN BLOC CACHÉ AVEC UNE ÉTOILE ! QUOI ?! C'EST QUOI CETTE CHANCE DE DINGUE ?!`,
    `BLOC CACHÉ ! {name} récupère une ÉTOILE GRATUITE ! Les autres joueurs sont en PLS.`,
    `{name} tape dans un bloc invisible et... UNE ÉTOILE EN SORT ?! Le favoritisme cosmique est RÉEL.`,
    `ÉTOILE CACHÉE trouvée par {name} ! C'est officiel, l'univers joue favoris. Et c'est toi le chouchou.`,
  ],

  /** Hidden block — found coins. Vars : {name}, {amount} */
  ITEM_HIDDEN_BLOCK_COINS: [
    `❓ {name} trouve un bloc caché avec {amount} pièces ! Pas mal pour quelqu'un qui sait même pas où il va.`,
    `BLOC CACHÉ ! {name} ramasse {amount} pièces ! La chance sourit aux ivrognes apparemment.`,
    `{name} percute un bloc invisible : {amount} pièces ! C'est ton front qui a servi de détecteur.`,
    `{amount} pièces dans un bloc caché pour {name} ! Tu trébuches sur la fortune, littéralement.`,
  ],

  /* ── Événements CURSED (interruptions random à l'écran) ───────────── */

  /** Cursed random event — texte hurlé par-dessus l'image. No vars. */
  CURSED: [
    `⚠️ INTERRUPTION COSMIQUE ⚠️ TOUT LE MONDE BOIT UNE GORGÉE. C'est la règle. On l'a inventée à l'instant.`,
    `LE VOID VOUS REGARDE. Le dernier qui pose son verre sur la table boit 2 gorgées.`,
    `ERREUR 418 : VOUS ÊTES UNE THÉIÈRE. Le plus grand de la pièce boit.`,
    `IL EST LÀ. IL A TOUJOURS ÉTÉ LÀ. Trinquez avec votre voisin de gauche ou subissez sa colère.`,
    `MOMENT CURSED : parlez tous avec un accent jusqu'au prochain tour de dé, sinon gorgée.`,
    `LE JEU EXIGE UN SACRIFICE. Le joueur avec le moins de pièces boit une gorgée de la honte.`,
    `BZZZT— SIGNAL CORROMPU. Échangez vos places autour de la table. MAINTENANT.`,
  ],
} as const;

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

/** Clé valide pour accéder aux narratifs. */
export type NarrativeKey = keyof typeof NARRATIVES;

// ---------------------------------------------------------------------------
//  Helper — pick & interpolate
// ---------------------------------------------------------------------------

/**
 * Pioche un texte narratif au hasard pour l'événement `key`
 * et remplace les placeholders `{xxx}` par les valeurs fournies dans `vars`.
 *
 * Utilise `Math.random()` — c'est du cosmétique, pas besoin du RNG seedable.
 *
 * @example
 *   pickNarrative('BLUE', { name: 'Jean-Kévin', amount: 3 })
 *   // => "Jean-Kévin touche 3 pièces. Ça paiera même pas ton prochain verre, mais bon."
 */
export function pickNarrative(
  key: NarrativeKey,
  vars: Record<string, string | number> = {},
): string {
  const pool = NARRATIVES[key];
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Remplace chaque {placeholder} par la valeur correspondante
  return template.replace(/\{(\w+)\}/g, (match, placeholder) => {
    const value = vars[placeholder];
    return value !== undefined ? String(value) : match;
  });
}
