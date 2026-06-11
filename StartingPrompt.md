Act as an Expert Frontend Developer and Game Designer.
I am building a web-based local multiplayer party game (Mario Party clone mixed with a drinking game) to be displayed on a TV (1080p).
We need a robust, fully functional V1 prototype with strict typing and highly modular code.

### 📚 KNOWLEDGE BASE & REFERENCE MATERIAL
I have provided the official Mario Party rules, item lists, and board descriptions at the bottom of this prompt inside XML tags (e.g., <WIKI_RULES>, <BOARD_LAYOUT>).
**CRITICAL:** You MUST treat these provided texts as your absolute single source of truth. Do not hallucinate items, prices, or space effects. Extract the logic strictly from these references.

### 🛠 TECH STACK
### 🛠 TECH STACK (FULL WEBGL 3D)
- React (Functional Components, Hooks)
- TypeScript (Strict mode)
- Tailwind CSS (For 2D UI overlays: HUD, menus, popups)
- **Three.js & React Three Fiber (@react-three/fiber)**: This is the core for the board, tokens, and dice. The entire game board must be rendered inside a `<Canvas>`.
- **@react-three/drei**: For camera controls (OrbitControls), environment lighting, text in 3D, and loading 3D models (`useGLTF`).
- Framer Motion 3D (framer-motion-3d) OR Spring (react-spring) for smooth 3D transitions (e.g., tokens jumping from space to space).

### 🎨 3D UI / UX REQUIREMENTS
- **The Board:** Rendered in a 3D Canvas. The camera should have a nice isometric or angled top-down perspective. Spaces are 3D cylinders or flat colored 3D tiles lying on a plane.
- **Player Tokens:** Instead of simple divs, use `<mesh>` objects (e.g., 3D cones or imported .glb models if available). When moving, the token should physically "jump" (parabolic arc in the Y-axis) from one space to the next using 3D animation.
- **The Dice:** A true 3D box geometry. When a player rolls, the dice must visually spin in 3D space on the screen, landing on the calculated face.
- **2D Overlay:** The health/sip bars, inventory, and popup events ("Drink 2 sips!") must be built with standard HTML/Tailwind layered *on top* of the 3D Canvas.
  -CRITICAL USE A BRANCH CALL dev/{YOURNAMEASANIA}
  (this will a exercice for benchmarking different ia at the same time )
### 📐 ARCHITECTURE & DATA STRUCTURE
The code must be extremely modular. Create separate files for types (`types.ts`), game configuration (`constants.ts`), and game logic (`useGameState.ts`).

1. **The Board (Hardcoded Graph)**:
    - Read the <BOARD_LAYOUT> reference to structure the map.
    - Use a Graph structure. Each space is a Node: `id`, `type`, `x/y coordinates` (for UI positioning), and `nextSpaces` (array of IDs, useful for forks).
    - Space Types: MUST strictly match the types found in the <WIKI_RULES> (e.g., Blue Space, Red Space, Event Space) + our custom drinking spaces (`SIP_PLUS`, `SIP_MINUS`).

2. **The Players**:
    - 4 Teams. Configurable at a "Lobby Screen" (Name, Color).
    - Player state includes: `id`, `name`, `color`, `currentSpaceId`, `inventory` (max 3 items), `sipsTaken`, `sipsGiven`.

3. **The Items & Dice**:
    - Extract the items, custom dice blocks, and their exact effects directly from the <WIKI_RULES> text provided.
    - Items can be used BEFORE rolling the dice.

### 🕹 THE GAME LOOP (Turn-based logic)
1. **Pre-roll Phase**: Player can use an item from inventory.
2. **Roll Phase**: Click to roll. Animated 3D/CSS dice using Framer Motion.
3. **Movement Phase**: Player token (simple 3D-looking colored block for V1) moves space by space. If a fork is reached, prompt the user to choose the path.
4. **Action Phase**: Resolve the space effect (matching the wiki rules + drinking penalties).
5. **Next Player**: Cycle through the 4 players.

### 🎲 MINIGAME PHASE (End of Round)
After all 4 players have played their turn, trigger the Minigame Phase.
1. **The Roulette**:
    - A highly configurable double-array structure in `constants.ts`. First, visually spin a category (e.g., "1v1", "2v2", "FFA"). Then, spin a specific game name within that category.
2. **The Podium Input (Drag & Drop)**:
    - A screen displaying the 4 player tokens and 4 podium slots (1st, 2nd, 3rd, 4th).
    - The Game Master drags and drops the players into their respective ranks.
3. **The Custom Rewards**:
    - 1st Place: Gold Dice (Rolls 4-10) + 0 sips.
    - 2nd Place: Silver Dice (Rolls 3-8) + 1 sip.
    - 3rd Place: Normal Dice (Rolls 1-6) + 2 sips.
    - 4th Place: Cursed Dice (Rolls 1-3) + 3 sips.

### 🎨 UI / UX REQUIREMENTS
- Use simple colored 3D blocks (using CSS shadows) for player placeholders.
- A sticky HUD on the sides showing Player Stats (Avatar, Items, Sips).
- Use Framer Motion for elastic/bouncy animations (`type: "spring"`).

Please provide the complete folder structure, the TypeScript interfaces (`types.ts`), the initial state management hook (`useGameState.ts`), and the main Board/Game Loop components. Ensure the configuration (items, minigames) is isolated.

---
<WIKI_RULES>
https://www.mariowiki.com/Super_Mario_Party#Mario_Party
voir Docs/RulesMarioParty
</WIKI_RULES>

<BOARD_LAYOUT>
https://www.ign.com/wikis/mario-party-superstars/All_Boards_(Maps)
voir Docs/BoardMarioParty

</BOARD_LAYOUT>