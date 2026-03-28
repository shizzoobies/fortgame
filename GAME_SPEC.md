# GAME_SPEC.md

## Working title
Fortress Stand

## Genre
Single-screen fortress defense / survival / upgrade game

## Platform
Browser first

## Camera / perspective
2D side view

## Core fantasy
The player commands a fortress under siege and survives escalating enemy waves by strengthening the fortress between battles.

## Core loop
1. Start wave
2. Enemies spawn and advance
3. Fortress auto-attacks
4. Enemies damage fortress if they reach it
5. Kills and wave clear award gold
6. Player buys upgrades
7. Start next wave

## MVP scope
This prototype should include:
- 1 fortress
- 1 battlefield
- 3 enemy types
- 1 projectile type minimum
- 4 upgrades
- endless wave scaling
- game over and restart

## Fortress stats
Starting suggested values:
- Max HP: 100
- Current HP: 100
- Damage: 10
- Attack Speed: 1.0 shots/sec
- Range: 260

Suggested behavior:
- Target nearest enemy in range
- Fire simple projectile
- Brief recoil, flash, or pulse on attack
- Flash or shake when damaged

## Enemy roster

### Grunt
- HP: 24
- Speed: normal
- Contact damage: 8
- Reward: 8 gold

### Runner
- HP: 14
- Speed: fast
- Contact damage: 6
- Reward: 10 gold

### Tank
- HP: 60
- Speed: slow
- Contact damage: 15
- Reward: 18 gold

Optional mini-boss later:
- HP: large
- slow
- stronger damage
- higher reward

## Wave design
Suggested wave formula:
- wave number increases enemy count
- wave number also scales enemy HP modestly
- composition changes over time
- early waves mostly grunts
- then runners appear
- tanks begin after a few waves

Example:
- Wave 1: 5 grunts
- Wave 2: 6 grunts, 1 runner
- Wave 3: 8 grunts, 2 runners
- Wave 4: 8 grunts, 2 runners, 1 tank
- Wave 5: 10 grunts, 3 runners, 2 tanks

The actual formula can be procedural rather than hardcoded.

## Economy
Suggested starting gold: 30

Gold sources:
- per kill
- end-of-wave bonus

## Upgrade shop
Implement these upgrades:

### Damage Upgrade
- increases fortress damage
- starting cost: 20
- cost increases each purchase

### Attack Speed Upgrade
- increases fire rate
- starting cost: 25
- cost increases each purchase

### Max Health Upgrade
- increases maximum HP and optionally current HP by some amount
- starting cost: 30

### Repair
- restores current HP
- starting cost: 20
- capped so it cannot exceed max HP

Optional later:
- Range upgrade
- Multi-shot
- Burn damage
- Splash shot

## Balance guidance
The player should:
- survive early waves with little stress
- start making meaningful tradeoffs by wave 4-6
- usually lose eventually
- feel stronger each time they invest wisely

## UI
Must show:
- Wave
- Gold
- Fortress HP bar
- Buttons for upgrades
- Start Wave button
- During downtime, upgrade panel is active
- During active wave, Start Wave is disabled

## Art direction summary
Code-generated fantasy defense look:
- sky gradient
- layered distant hills
- battlefield strip
- fortress with towers/wall/banner
- enemies as distinct silhouettes with detail
- glowing projectiles, sparks, dust, hit flashes

## Audio
Not required for MVP.
If added later, use generated simple sound effects only.

## Save system
Not required for MVP.

## Win condition
None for MVP. Endless survival until defeat.

## Lose condition
Fortress HP reaches 0.
