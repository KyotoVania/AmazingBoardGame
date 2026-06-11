### 🛠 GAME MODES: LIVE vs DEBUG (GOD MODE)
To ensure the game is fully testable before the actual party, the application must have two distinct modes: `LIVE_MODE` and `DEBUG_MODE`.

1. **The Toggle**:
   - Implement a hidden toggle (e.g., pressing the `~` key or a tiny invisible button in the top-left corner of the screen) to switch between `LIVE` and `DEBUG` mode.

2. **DEBUG_MODE Features (The Game Master Panel)**:
   - When `DEBUG_MODE` is active, display a floating, semi-transparent UI panel (using Tailwind) overlaid on the 3D canvas.
   - This panel must give the developer/host total control over the game state to test animations and logic instantly:
     - **Force Dice Roll**: An input to type a specific number (e.g., "4") and force the current player to roll exactly that number.
     - **Teleport Player**: A dropdown of all space IDs to instantly move a player to a specific tile (to test Space effects without rolling).
     - **Inject Item**: A dropdown to instantly give a specific item to a player's inventory.
     - **Trigger Minigame Phase**: A giant button to instantly skip the board phase and launch the Roulette/Minigame sequence.
     - **Edit Stats**: Inputs to manually add/remove "sips" (gorgées) to check if the UI updates correctly.

3. **LIVE_MODE (Default)**:
   - In this mode, the Debug Panel is completely hidden.
   - The game relies purely on standard player inputs and RNG.

Ensure that the State Management (`useGameState.ts`) exposes these override functions so the Debug component can easily manipulate the state without breaking the turn-based loop.