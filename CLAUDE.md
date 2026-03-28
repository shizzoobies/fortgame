# Claude Code Build Brief

You are building a complete playable browser game prototype called **Fortress Stand**.

## Primary goal
Create a polished, single-screen, pure web prototype using:
- HTML
- CSS
- JavaScript
- HTML5 Canvas

Do not use React, Vite, TypeScript, Webpack, Phaser, Pixi, or any external libraries unless explicitly requested later.

## Overall product
A side-view fortress defense game where:
- the fortress sits on the left side of the battlefield
- enemies march in from the right
- the fortress auto-attacks enemies in range
- the player earns gold from kills and wave clears
- the player buys upgrades between waves
- waves scale upward until the fortress is destroyed

## Core build rules
1. Build the game as a clean, self-contained static website.
2. Use only a few files:
   - `index.html`
   - `styles.css`
   - `game.js`
   - optional `assets/` folder only if genuinely needed
3. Make it fully playable by opening `index.html` locally in a browser.
4. All art should be generated with HTML/CSS/canvas primitives or simple inline SVG/data-driven drawing. Do not depend on downloaded art assets.
5. Create a visually cohesive, readable prototype with satisfying feedback.
6. Keep the code modular and readable, but do not overengineer.
7. Comment the code enough that a human can quickly continue development.
8. Optimize for game feel and clarity over feature bloat.

## Important design target
This is not a lane tower defense with placed towers.
This is a fortress/base defense survival game with upgrades and wave escalation.

## Required features

### 1. Layout
Create a single-screen layout with:
- top HUD bar
- main game canvas
- side or bottom upgrade panel
- wave controls
- game over overlay
- restart button

### 2. Fortress
The fortress must have:
- max health
- current health
- base damage
- attack speed
- attack range
- simple visual state changes when hit

The fortress should auto-target enemies in range and fire projectiles or visible attacks.

### 3. Enemies
Implement at least 3 enemy types:
- Grunt: low HP, normal speed
- Tank: high HP, slow speed
- Runner: low HP, fast speed

Enemies should:
- move from right to left
- have health bars or readable damage feedback
- damage the fortress when they reach it
- die with visible feedback and reward gold

### 4. Waves
Implement a wave system with:
- Start Wave button
- wave counter
- scalable enemy count and stats
- short downtime between waves
- every few waves becoming noticeably harder
- optional mini-boss after wave 5 if scope allows

### 5. Economy
Player earns gold from:
- enemy kills
- wave completion bonus

Gold is spent between waves on upgrades.

### 6. Upgrades
Implement at least these upgrades:
- Increase Damage
- Increase Attack Speed
- Increase Max Health
- Repair Fortress

Optional later upgrade:
- Increase Range
- Multi-shot
- Splash damage

Upgrade costs should scale upward.

### 7. Combat feedback
Add:
- projectiles or clear attack effect
- hit flashes
- floating damage text if easy to support
- death feedback
- fortress hit feedback
- screen shake or impact pulse if lightweight

### 8. UI requirements
Show:
- current wave
- fortress HP
- gold
- wave state
- selected or hovered upgrade details if practical

The UI should feel like a real game prototype, not a developer mockup.

### 9. Game over / restart
When fortress HP reaches 0:
- stop the wave
- show game over overlay
- show wave reached
- show restart button
- allow full reset without refreshing browser

## Technical expectations
- Use `requestAnimationFrame`
- Use delta time in updates
- Separate update and render logic
- Use classes or clearly separated objects for:
  - Game
  - Fortress
  - Enemy
  - Projectile
  - WaveManager
  - Upgrade system
- Keep numbers easy to tune in constants/config objects
- Avoid magic numbers where possible

## Art and visual style
Use a clean fantasy-flat style built entirely in code.
No placeholder programmer art unless it is intentionally stylized.
Use:
- layered backgrounds
- fortress silhouette with detail
- readable enemies with distinct shapes/colors/accents
- polished buttons/panels
- simple particle effects
- gradients, shadows, and subtle glow where useful

You may use:
- canvas drawing
- CSS panels
- inline SVG if needed
- generated stars, banners, clouds, smoke, sparks, etc.

Do not use:
- external image asset packs
- external icon libraries
- third-party UI kits

## Feel targets
The game should feel:
- readable
- punchy
- responsive
- satisfying
- replayable

Even if feature scope is moderate, prioritize:
- smooth combat
- clear progression
- nice UI polish
- balanced numbers

## Folder output
Please generate the project as:
- `index.html`
- `styles.css`
- `game.js`

If needed, also include:
- `README.md`

## Build order
1. Scaffold HTML/CSS/JS
2. Create main canvas and game loop
3. Implement fortress, enemies, projectiles
4. Implement waves
5. Implement gold and upgrades
6. Implement UI/HUD sync
7. Add polish and visual feedback
8. Add game over and restart
9. Tune balance and clean up code

## Definition of done
The game is done when:
- it runs locally by opening `index.html`
- all required systems work
- the game looks intentionally designed
- the player can survive several waves, buy upgrades, and eventually lose
- restart works cleanly
- the code is readable and editable

## After initial completion
Once the first version works, propose a short phase-2 roadmap, but do not implement phase 2 unless asked.

Read `GAME_SPEC.md`, `TASKLIST.md`, and `ART_DIRECTION.md` before coding.
