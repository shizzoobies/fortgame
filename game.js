// ============================================
// Fortress Stand - Game Logic
// Pure HTML5 Canvas fortress defense game
// ============================================

// ---- Configuration ----
const CONFIG = {
    fortress: {
        maxHp: 100,
        damage: 10,
        attackSpeed: 1.0,   // shots per second
        range: 260,
        x: 100,             // center x position
        width: 80,
        height: 120,
    },
    enemies: {
        grunt: {
            name: 'Grunt',
            hp: 24,
            speed: 50,
            damage: 8,
            reward: 8,
            color: '#77aa55',
            accentColor: '#558833',
            width: 22,
            height: 28,
        },
        runner: {
            name: 'Runner',
            hp: 14,
            speed: 95,
            damage: 6,
            reward: 10,
            color: '#cc7744',
            accentColor: '#aa5522',
            width: 16,
            height: 22,
        },
        tank: {
            name: 'Tank',
            hp: 60,
            speed: 28,
            damage: 15,
            reward: 18,
            color: '#5577aa',
            accentColor: '#335588',
            width: 30,
            height: 34,
        },
        boss: {
            name: 'Warlord',
            hp: 150,
            speed: 22,
            damage: 25,
            reward: 50,
            color: '#aa44aa',
            accentColor: '#882288',
            width: 38,
            height: 42,
        },
    },
    projectile: {
        speed: 400,
        radius: 4,
        color: '#ffaa33',
        glowColor: 'rgba(255, 170, 50, 0.4)',
    },
    economy: {
        startingGold: 100,
        waveBonusBase: 15,
        waveBonusPerWave: 5,
    },
    upgrades: {
        damage: { name: 'Forge Weapons', desc: '+5 damage per level', baseCost: 20, costScale: 1.5, perLevel: 5 },
        attackSpeed: { name: 'Swift Arms', desc: '+0.3 fire rate per level', baseCost: 25, costScale: 1.5, perLevel: 0.3 },
        range: { name: 'Eagle Eye', desc: '+40 range per level', baseCost: 25, costScale: 1.5, perLevel: 40 },
        maxHp: { name: 'Fortify Walls', desc: '+30 max HP per level', baseCost: 30, costScale: 1.5, perLevel: 30 },
        repair: { name: 'Repair', desc: 'Restore 40 HP', baseCost: 20, costScale: 1.3, perLevel: 40 },
        mason: { name: 'Mason', desc: 'Heals after waves (+mine: passive)', baseCost: 35, costScale: 1.6, perLevel: 1 },
    },
    turrets: {
        archer: {
            name: 'Archer Tower', desc: 'Fast shots, medium range',
            cost: 50, damage: 6, attackSpeed: 2.0, range: 240,
            color: '#ffaa33', glowColor: 'rgba(255, 170, 50, 0.4)',
            towerColor: '#7a6a5e',
        },
        cannon: {
            name: 'Cannon Tower', desc: 'Heavy damage, short range',
            cost: 80, damage: 20, attackSpeed: 0.5, range: 180,
            color: '#ff4433', glowColor: 'rgba(255, 68, 51, 0.4)',
            towerColor: '#5a5a6e',
        },
        mage: {
            name: 'Mage Tower', desc: 'Magic bolts, long range',
            cost: 120, damage: 12, attackSpeed: 1.2, range: 340,
            color: '#8855ff', glowColor: 'rgba(136, 85, 255, 0.4)',
            towerColor: '#5a4a7e',
        },
    },
    waves: {
        baseEnemyCount: 5,
        enemyCountScale: 2,
        hpScalePerWave: 0.08,
        spawnInterval: 0.7,  // seconds between spawns
        bossWaveInterval: 5, // boss every N waves
    },
};

// ---- Canvas Setup ----
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const area = document.getElementById('game-area');
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);

// ---- Utility Functions ----
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function randRange(a, b) { return a + Math.random() * (b - a); }

// ---- Particle System ----
class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 80 * dt; // gravity
        this.life -= dt;
    }

    draw(ctx) {
        const alpha = clamp(this.life / this.maxLife, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }

    get dead() { return this.life <= 0; }
}

// ---- Floating Text ----
class FloatingText {
    constructor(x, y, text, color, size = 14) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 0.8;
        this.maxLife = 0.8;
        this.vy = -40;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        const alpha = clamp(this.life / this.maxLife, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }

    get dead() { return this.life <= 0; }
}

// ---- Projectile ----
class Projectile {
    constructor(x, y, target, damage, color, glowColor) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = CONFIG.projectile.speed;
        this.radius = CONFIG.projectile.radius;
        this.color = color || CONFIG.projectile.color;
        this.glowColor = glowColor || CONFIG.projectile.glowColor;
        this.alive = true;
        this.trail = [];
    }

    update(dt) {
        if (!this.target || this.target.dead) {
            this.alive = false;
            return;
        }
        const tx = this.target.x;
        const ty = this.target.y - this.target.height / 2;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 10) {
            this.target.takeDamage(this.damage);
            this.alive = false;
            return;
        }

        // Store trail positions
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 6) this.trail.shift();

        const nx = dx / dist;
        const ny = dy / dist;
        this.x += nx * this.speed * dt;
        this.y += ny * this.speed * dt;
    }

    draw(ctx) {
        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = (i / this.trail.length) * 0.4;
            const r = this.radius * (i / this.trail.length) * 0.8;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Glow
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ---- Enemy ----
class Enemy {
    constructor(type, x, y, waveNum) {
        const cfg = CONFIG.enemies[type];
        this.type = type;
        this.name = cfg.name;
        this.maxHp = Math.floor(cfg.hp * (1 + CONFIG.waves.hpScalePerWave * (waveNum - 1)));
        this.hp = this.maxHp;
        this.speed = cfg.speed;
        this.damage = cfg.damage;
        this.reward = Math.floor(cfg.reward * (1 + (waveNum - 1) * 0.1)); // +10% gold per wave
        this.color = cfg.color;
        this.accentColor = cfg.accentColor;
        this.width = cfg.width;
        this.height = cfg.height;
        this.x = x;
        this.y = y;
        this.dead = false;
        this.hitFlash = 0;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.hasAttacked = false;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 0.12;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
        }
    }

    update(dt, fortressX) {
        if (this.dead) return;

        // Move toward fortress
        if (this.x > fortressX + CONFIG.fortress.width / 2 + 5) {
            this.x -= this.speed * dt;
        } else if (!this.hasAttacked) {
            this.hasAttacked = true;
        }

        this.bobPhase += dt * (this.speed * 0.08);
        if (this.hitFlash > 0) this.hitFlash -= dt;
    }

    draw(ctx) {
        if (this.dead) return;

        const bobY = Math.sin(this.bobPhase) * 2;
        const drawX = this.x;
        const drawY = this.y + bobY;
        const hw = this.width / 2;
        const hh = this.height;

        // Hit flash override
        if (this.hitFlash > 0) {
            ctx.fillStyle = '#fff';
        } else {
            ctx.fillStyle = this.color;
        }

        // Draw based on type
        if (this.type === 'grunt') {
            this._drawGrunt(ctx, drawX, drawY, hw, hh);
        } else if (this.type === 'runner') {
            this._drawRunner(ctx, drawX, drawY, hw, hh);
        } else if (this.type === 'tank') {
            this._drawTank(ctx, drawX, drawY, hw, hh);
        } else if (this.type === 'boss') {
            this._drawBoss(ctx, drawX, drawY, hw, hh);
        }

        // Health bar
        if (this.hp < this.maxHp) {
            const barW = this.width + 8;
            const barH = 4;
            const barX = drawX - barW / 2;
            const barY = drawY - hh - 8;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);
            const pct = this.hp / this.maxHp;
            ctx.fillStyle = pct > 0.5 ? '#55cc55' : pct > 0.25 ? '#ddaa33' : '#dd4444';
            ctx.fillRect(barX, barY, barW * pct, barH);
        }
    }

    _drawGrunt(ctx, x, y, hw, hh) {
        // Body
        ctx.beginPath();
        ctx.moveTo(x - hw, y);
        ctx.lineTo(x - hw * 0.7, y - hh);
        ctx.lineTo(x + hw * 0.7, y - hh);
        ctx.lineTo(x + hw, y);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(x, y - hh - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        if (this.hitFlash <= 0) {
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(x - 3, y - hh - 7, 2, 2);
            ctx.fillRect(x + 1, y - hh - 7, 2, 2);
        }
        // Weapon (small spear line)
        ctx.strokeStyle = this.hitFlash > 0 ? '#fff' : this.accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - hw - 2, y - hh * 0.3);
        ctx.lineTo(x - hw - 2, y - hh - 8);
        ctx.stroke();
    }

    _drawRunner(ctx, x, y, hw, hh) {
        // Lean body
        ctx.beginPath();
        ctx.moveTo(x - hw, y);
        ctx.lineTo(x - hw * 0.3, y - hh);
        ctx.lineTo(x + hw * 0.8, y - hh * 0.8);
        ctx.lineTo(x + hw, y);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(x + hw * 0.2, y - hh - 3, 4, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        if (this.hitFlash <= 0) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(x + hw * 0.2 - 2, y - hh - 5, 2, 2);
            ctx.fillRect(x + hw * 0.2 + 1, y - hh - 5, 2, 2);
        }
    }

    _drawTank(ctx, x, y, hw, hh) {
        // Broad body
        ctx.beginPath();
        ctx.moveTo(x - hw, y);
        ctx.lineTo(x - hw, y - hh * 0.85);
        ctx.lineTo(x - hw * 0.5, y - hh);
        ctx.lineTo(x + hw * 0.5, y - hh);
        ctx.lineTo(x + hw, y - hh * 0.85);
        ctx.lineTo(x + hw, y);
        ctx.closePath();
        ctx.fill();
        // Shield
        if (this.hitFlash <= 0) {
            ctx.fillStyle = this.accentColor;
        }
        ctx.beginPath();
        ctx.moveTo(x - hw - 4, y - hh * 0.2);
        ctx.lineTo(x - hw - 4, y - hh * 0.8);
        ctx.lineTo(x - hw - 1, y - hh * 0.85);
        ctx.lineTo(x - hw - 1, y - hh * 0.15);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(x, y - hh - 5, 6, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        if (this.hitFlash <= 0) {
            ctx.fillStyle = '#4488ff';
            ctx.fillRect(x - 3, y - hh - 7, 2, 3);
            ctx.fillRect(x + 1, y - hh - 7, 2, 3);
        }
    }

    _drawBoss(ctx, x, y, hw, hh) {
        // Big armored body
        ctx.beginPath();
        ctx.moveTo(x - hw, y);
        ctx.lineTo(x - hw * 0.9, y - hh);
        ctx.lineTo(x + hw * 0.9, y - hh);
        ctx.lineTo(x + hw, y);
        ctx.closePath();
        ctx.fill();
        // Shoulder pads
        if (this.hitFlash <= 0) ctx.fillStyle = this.accentColor;
        ctx.fillRect(x - hw - 4, y - hh * 0.85, 8, 8);
        ctx.fillRect(x + hw - 4, y - hh * 0.85, 8, 8);
        // Head with horns
        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(x, y - hh - 7, 8, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.strokeStyle = this.hitFlash > 0 ? '#fff' : '#cc88cc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 7, y - hh - 10);
        ctx.lineTo(x - 12, y - hh - 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 7, y - hh - 10);
        ctx.lineTo(x + 12, y - hh - 20);
        ctx.stroke();
        // Eyes
        if (this.hitFlash <= 0) {
            ctx.fillStyle = '#ff44ff';
            ctx.fillRect(x - 4, y - hh - 9, 3, 3);
            ctx.fillRect(x + 1, y - hh - 9, 3, 3);
        }
    }
}

// ---- Fortress ----
class Fortress {
    constructor() {
        this.maxHp = CONFIG.fortress.maxHp;
        this.hp = this.maxHp;
        this.damage = CONFIG.fortress.damage;
        this.attackSpeed = CONFIG.fortress.attackSpeed;
        this.range = CONFIG.fortress.range;
        this.x = CONFIG.fortress.x;
        this.baseWidth = CONFIG.fortress.width;
        this.baseHeight = CONFIG.fortress.height;
        this.attackCooldown = 0;
        this.hitFlash = 0;
        this.recoil = 0;
        this.bannerPhase = 0;
        // Turret system: starts with one default turret
        this.turrets = [
            { type: 'default', damage: this.damage, attackSpeed: this.attackSpeed,
              range: this.range, cooldown: 0, recoil: 0,
              color: CONFIG.projectile.color, glowColor: CONFIG.projectile.glowColor,
              towerColor: '#7a6a5e' }
        ];
        this.ownedTurrets = []; // track purchased turret type keys
    }

    // Dynamic width/height based on turret count
    get width() { return this.baseWidth + Math.max(0, this.turrets.length - 1) * 25; }
    get height() { return this.baseHeight + Math.max(0, this.turrets.length - 1) * 10; }

    reset() {
        this.maxHp = CONFIG.fortress.maxHp;
        this.hp = this.maxHp;
        this.damage = CONFIG.fortress.damage;
        this.attackSpeed = CONFIG.fortress.attackSpeed;
        this.range = CONFIG.fortress.range;
        this.attackCooldown = 0;
        this.hitFlash = 0;
        this.recoil = 0;
        this.turrets = [
            { type: 'default', damage: this.damage, attackSpeed: this.attackSpeed,
              range: this.range, cooldown: 0, recoil: 0,
              color: CONFIG.projectile.color, glowColor: CONFIG.projectile.glowColor,
              towerColor: '#7a6a5e' }
        ];
        this.ownedTurrets = [];
    }

    addTurret(typeKey) {
        const cfg = CONFIG.turrets[typeKey];
        this.turrets.push({
            type: typeKey, damage: cfg.damage, attackSpeed: cfg.attackSpeed,
            range: cfg.range, cooldown: 0, recoil: 0,
            color: cfg.color, glowColor: cfg.glowColor,
            towerColor: cfg.towerColor,
        });
        this.ownedTurrets.push(typeKey);
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        this.hitFlash = 0.15;
        game.screenShake = 0.15;
    }

    update(dt, enemies) {
        if (this.hitFlash > 0) this.hitFlash -= dt;
        this.bannerPhase += dt * 2;

        // Update default turret stats to match fortress upgrades
        const def = this.turrets[0];
        if (def && def.type === 'default') {
            def.damage = this.damage;
            def.attackSpeed = this.attackSpeed;
            def.range = this.range;
        }

        // Each turret attacks independently
        for (let ti = 0; ti < this.turrets.length; ti++) {
            const t = this.turrets[ti];
            t.cooldown -= dt;
            if (t.recoil > 0) t.recoil -= dt * 8;

            // Effective range: turret base range + any range upgrades beyond default
            const rangeBonus = this.range - CONFIG.fortress.range;
            const effectiveRange = (t.type === 'default') ? this.range : t.range + rangeBonus;

            if (t.cooldown <= 0) {
                let nearest = null;
                let nearestDist = Infinity;
                for (const e of enemies) {
                    if (e.dead) continue;
                    const dist = e.x - this.x;
                    if (dist > 0 && dist < effectiveRange && dist < nearestDist) {
                        nearestDist = dist;
                        nearest = e;
                    }
                }
                if (nearest) {
                    t.cooldown = 1 / t.attackSpeed;
                    t.recoil = 1;
                    const pos = this._getTurretFirePos(ti);
                    game.projectiles.push(new Projectile(pos.x, pos.y, nearest, t.damage, t.color, t.glowColor));
                }
            }
        }
    }

    // Get the firing position for turret at index ti
    _getTurretFirePos(ti) {
        const baseX = this.x - this.width / 2;
        const baseY = game.groundY;
        const towerW = 22;
        if (ti === 0) {
            // Default turret (rightmost tower)
            const turretX = baseX + this.width - 17;
            const turretH = this.height + 30;
            return { x: turretX + towerW + 4, y: baseY - turretH + 14 };
        } else {
            // Additional turrets placed along the wall from right to left
            const spacing = 28;
            const tx = baseX + this.width - 17 - ti * spacing;
            const turretH = this.height + 15 + ti * 5;
            return { x: tx + towerW + 4, y: baseY - turretH + 14 };
        }
    }

    draw(ctx, groundY) {
        const baseX = this.x - this.width / 2;
        const baseY = groundY;
        const flash = this.hitFlash > 0;

        // Main wall
        const wallColor = flash ? '#ff8866' : '#6b5b4f';
        const wallDark = flash ? '#cc5533' : '#4a3d34';
        ctx.fillStyle = wallColor;
        ctx.fillRect(baseX + 10, baseY - this.height + 10, this.width - 20, this.height - 10);

        // Stone texture lines
        ctx.strokeStyle = wallDark;
        ctx.lineWidth = 1;
        const maxRows = Math.floor(this.height / 20);
        for (let row = 0; row < maxRows; row++) {
            const ry = baseY - 15 - row * 20;
            if (ry < baseY - this.height + 10) break;
            ctx.beginPath();
            ctx.moveTo(baseX + 12, ry);
            ctx.lineTo(baseX + this.width - 12, ry);
            ctx.stroke();
            const offset = row % 2 === 0 ? 0 : 12;
            for (let col = offset; col < this.width - 24; col += 24) {
                ctx.beginPath();
                ctx.moveTo(baseX + 12 + col, ry);
                ctx.lineTo(baseX + 12 + col, ry - 20);
                ctx.stroke();
            }
        }

        // Left tower (always present)
        const towerW = 22;
        const towerH = this.height + 20;
        ctx.fillStyle = flash ? '#ff9977' : '#7a6a5e';
        ctx.fillRect(baseX - 5, baseY - towerH, towerW, towerH);
        ctx.fillStyle = flash ? '#ffaa88' : '#8a7a6e';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(baseX - 5 + i * 8, baseY - towerH - 8, 6, 8);
        }

        // Draw each turret tower (right to left)
        for (let ti = 0; ti < this.turrets.length; ti++) {
            const t = this.turrets[ti];
            const recoilOff = t.recoil * 3;
            const spacing = 28;
            let tx, th;
            if (ti === 0) {
                tx = baseX + this.width - 17 - recoilOff;
                th = this.height + 30;
            } else {
                tx = baseX + this.width - 17 - ti * spacing - recoilOff;
                th = this.height + 15 + ti * 5;
            }
            // Tower body
            ctx.fillStyle = flash ? '#ff9977' : t.towerColor;
            ctx.fillRect(tx, baseY - th, towerW, th);
            // Battlements
            ctx.fillStyle = flash ? '#ffaa88' : '#8a7a6e';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(tx + i * 8, baseY - th - 8, 6, 8);
            }
            // Cannon slit (colored by turret type)
            ctx.fillStyle = flash ? '#ffcc99' : t.color;
            ctx.fillRect(tx + towerW - 2, baseY - th + 12, 8, 5);
            // Glow
            ctx.fillStyle = t.glowColor;
            ctx.beginPath();
            ctx.arc(tx + towerW + 4, baseY - th + 14, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Gate
        ctx.fillStyle = flash ? '#aa4422' : '#3a2a1e';
        const gateW = 18;
        const gateH = 28;
        const gateX = baseX + 30;
        ctx.fillRect(gateX - gateW / 2, baseY - gateH, gateW, gateH);
        ctx.beginPath();
        ctx.arc(gateX, baseY - gateH, gateW / 2, Math.PI, 0);
        ctx.fill();

        // Banner on left tower
        const bannerX = baseX + 5;
        const bannerY = baseY - towerH - 8;
        const bannerWave = Math.sin(this.bannerPhase) * 3;
        ctx.fillStyle = flash ? '#ff6644' : '#cc3333';
        ctx.beginPath();
        ctx.moveTo(bannerX, bannerY);
        ctx.lineTo(bannerX + 14 + bannerWave, bannerY + 5);
        ctx.lineTo(bannerX + 12 + bannerWave * 0.5, bannerY + 12);
        ctx.lineTo(bannerX, bannerY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bannerX, bannerY + 10);
        ctx.lineTo(bannerX, bannerY - 8);
        ctx.stroke();

        // Range indicator
        ctx.strokeStyle = 'rgba(255, 170, 50, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.x + this.range, baseY);
        ctx.lineTo(this.x + this.range, baseY - 200);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// ---- Wave Manager ----
class WaveManager {
    constructor() {
        this.waveNum = 0;
        this.active = false;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.enemiesAlive = 0;
        this.totalSpawned = 0;
    }

    reset() {
        this.waveNum = 0;
        this.active = false;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.enemiesAlive = 0;
        this.totalSpawned = 0;
    }

    startWave() {
        this.waveNum++;
        this.active = true;
        this.spawnQueue = this._generateWave(this.waveNum);
        this.spawnTimer = 0.5; // brief delay before first spawn
        this.totalSpawned = 0;
        this.enemiesAlive = this.spawnQueue.length;
    }

    _generateWave(num) {
        const queue = [];
        const totalEnemies = CONFIG.waves.baseEnemyCount + Math.floor(num * CONFIG.waves.enemyCountScale);

        // Composition based on wave number
        let gruntPct = Math.max(0.3, 1 - num * 0.08);
        let runnerPct = clamp(num * 0.06, 0, 0.35);
        let tankPct = clamp((num - 3) * 0.05, 0, 0.3);

        // Normalize
        const total = gruntPct + runnerPct + tankPct;
        gruntPct /= total;
        runnerPct /= total;
        tankPct /= total;

        const grunts = Math.round(totalEnemies * gruntPct);
        const runners = Math.round(totalEnemies * runnerPct);
        const tanks = Math.round(totalEnemies * tankPct);

        for (let i = 0; i < grunts; i++) queue.push('grunt');
        for (let i = 0; i < runners; i++) queue.push('runner');
        for (let i = 0; i < tanks; i++) queue.push('tank');

        // Boss every N waves
        if (num > 0 && num % CONFIG.waves.bossWaveInterval === 0) {
            queue.push('boss');
        }

        // Shuffle
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }

        return queue;
    }

    update(dt) {
        if (!this.active) return;

        // Spawn enemies
        if (this.spawnQueue.length > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                const type = this.spawnQueue.shift();
                const cfg = CONFIG.enemies[type];
                const spawnX = canvas.width + 20 + Math.random() * 40;
                const enemy = new Enemy(type, spawnX, game.groundY, this.waveNum);
                game.enemies.push(enemy);
                this.totalSpawned++;
                this.spawnTimer = CONFIG.waves.spawnInterval - Math.min(this.waveNum * 0.02, 0.3);
            }
        }

        // Check wave completion
        if (this.spawnQueue.length === 0 && this.totalSpawned > 0) {
            const allDead = game.enemies.length === 0 || game.enemies.every(e => e.dead);
            if (allDead) {
                this.active = false;
                game.onWaveClear();
            }
        }
    }
}

// ---- Main Game ----
const game = {
    fortress: null,
    enemies: [],
    projectiles: [],
    particles: [],
    floatingTexts: [],
    waveManager: null,
    gold: CONFIG.economy.startingGold,
    totalGoldEarned: 0,
    totalKills: 0,
    mineLevel: 0,
    mineAccum: 0, // accumulator for fractional gold
    groundY: 0,
    state: 'idle', // idle, active, gameover
    screenShake: 0,
    upgradeLevels: { damage: 0, attackSpeed: 0, range: 0, maxHp: 0, repair: 0, mason: 0 },
    lastTime: 0,
    clouds: [],
    stars: [],

    init() {
        resizeCanvas();
        this.groundY = canvas.height - 60;
        this.fortress = new Fortress();
        this.waveManager = new WaveManager();
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.gold = CONFIG.economy.startingGold;
        this.totalGoldEarned = 0;
        this.totalKills = 0;
        this.mineLevel = 0;
        this.mineAccum = 0;
        this.state = 'idle';
        this.gameSpeed = 1;
        this.screenShake = 0;
        this.upgradeLevels = { damage: 0, attackSpeed: 0, range: 0, maxHp: 0, repair: 0, mason: 0 };
        this._generateClouds();
        this._generateStars();
        this.setupUI();
        this.updateUI();
        document.getElementById('game-over-overlay').classList.add('hidden');
        this.lastTime = performance.now();
        this._startLoop();
    },

    _startLoop() {
        const self = this;
        this._loopRunning = true;

        // Use rAF when tab is visible, MessageChannel fallback when hidden
        // MessageChannel is not throttled in background tabs
        const channel = new MessageChannel();
        channel.port2.onmessage = function() {
            if (!self._loopRunning) return;
            const now = performance.now();
            self.loop(now);
            scheduleNext();
        };

        function scheduleNext() {
            if (!self._loopRunning) return;
            if (document.hidden) {
                // Background: use MessageChannel (not throttled)
                channel.port1.postMessage(null);
            } else {
                // Foreground: use rAF for smooth rendering
                requestAnimationFrame(() => {
                    if (!self._loopRunning) return;
                    const now = performance.now();
                    self.loop(now);
                    scheduleNext();
                });
            }
        }

        // Listen for visibility changes to switch strategies
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && self._loopRunning) {
                scheduleNext();
            }
        });

        scheduleNext();
    },

    _generateClouds() {
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * canvas.width,
                y: 30 + Math.random() * 80,
                w: 60 + Math.random() * 80,
                h: 20 + Math.random() * 15,
                speed: 5 + Math.random() * 10,
                alpha: 0.1 + Math.random() * 0.15,
            });
        }
    },

    _generateStars() {
        this.stars = [];
        for (let i = 0; i < 30; i++) {
            this.stars.push({
                x: Math.random() * 2000,
                y: Math.random() * 120,
                size: 0.5 + Math.random() * 1.5,
                alpha: 0.2 + Math.random() * 0.5,
            });
        }
    },

    setupUI() {
        const container = document.getElementById('upgrade-buttons');
        container.innerHTML = '';

        // Stat upgrades
        for (const [key, cfg] of Object.entries(CONFIG.upgrades)) {
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn';
            btn.dataset.upgrade = key;
            btn.innerHTML = `
                <div class="upgrade-name">
                    <span>${cfg.name}</span>
                    <span class="upgrade-cost">${this._getUpgradeCost(key)}g</span>
                </div>
                <div class="upgrade-desc">${cfg.desc}</div>
                <div class="upgrade-level">Level ${this.upgradeLevels[key]}</div>
            `;
            btn.addEventListener('click', () => this.buyUpgrade(key));
            container.appendChild(btn);
        }

        // Weapons section
        const weaponHeader = document.createElement('div');
        weaponHeader.className = 'panel-section-header';
        weaponHeader.textContent = 'Weapons';
        container.appendChild(weaponHeader);

        for (const [key, cfg] of Object.entries(CONFIG.turrets)) {
            const btn = document.createElement('button');
            btn.className = 'upgrade-btn turret-btn';
            btn.dataset.turret = key;
            const owned = this.fortress.ownedTurrets.includes(key);
            btn.innerHTML = `
                <div class="upgrade-name">
                    <span>${cfg.name}</span>
                    <span class="upgrade-cost">${owned ? 'Owned' : cfg.cost + 'g'}</span>
                </div>
                <div class="upgrade-desc">${cfg.desc}</div>
            `;
            btn.style.borderLeftColor = cfg.color;
            btn.style.borderLeftWidth = '3px';
            if (owned) btn.disabled = true;
            btn.addEventListener('click', () => this.buyTurret(key));
            container.appendChild(btn);
        }

        // Gold Mine section
        const mineHeader = document.createElement('div');
        mineHeader.className = 'panel-section-header';
        mineHeader.textContent = 'Economy';
        container.appendChild(mineHeader);

        const mineBtn = document.createElement('button');
        mineBtn.className = 'upgrade-btn mine-btn';
        mineBtn.dataset.upgrade = 'mine';
        mineBtn.innerHTML = `
            <div class="upgrade-name">
                <span>Gold Mine</span>
                <span class="upgrade-cost">${this._getMineCost()}g</span>
            </div>
            <div class="upgrade-desc">${this.mineLevel < 2 ? '+3g/s per level' : '+15% income per level'}</div>
            <div class="upgrade-level">Level ${this.mineLevel}</div>
        `;
        mineBtn.addEventListener('click', () => this.buyMine());
        container.appendChild(mineBtn);

        document.getElementById('start-wave-btn').addEventListener('click', () => this.startWave());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('speed-btn').addEventListener('click', () => this.toggleSpeed());

        // Space key for speed toggle
        if (!this._spaceListenerAdded) {
            this._spaceListenerAdded = true;
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && e.target === document.body) {
                    e.preventDefault();
                    this.toggleSpeed();
                }
            });
        }
    },

    toggleSpeed() {
        const speeds = [1, 2, 3];
        const idx = speeds.indexOf(this.gameSpeed);
        this.gameSpeed = speeds[(idx + 1) % speeds.length];
        this._updateSpeedBtn();
    },

    _updateSpeedBtn() {
        const btn = document.getElementById('speed-btn');
        btn.textContent = `${this.gameSpeed}x Speed (Space)`;
        btn.classList.remove('fast', 'fastest');
        if (this.gameSpeed === 2) btn.classList.add('fast');
        if (this.gameSpeed === 3) btn.classList.add('fastest');
    },

    _getUpgradeCost(key) {
        const cfg = CONFIG.upgrades[key];
        return Math.floor(cfg.baseCost * Math.pow(cfg.costScale, this.upgradeLevels[key]));
    },

    buyUpgrade(key) {
        if (this.state === 'gameover') return;
        const cost = this._getUpgradeCost(key);
        if (this.gold < cost) return;

        this.gold -= cost;
        this.upgradeLevels[key]++;

        const cfg = CONFIG.upgrades[key];
        switch (key) {
            case 'damage':
                this.fortress.damage += cfg.perLevel;
                break;
            case 'attackSpeed':
                this.fortress.attackSpeed += cfg.perLevel;
                break;
            case 'range':
                this.fortress.range += cfg.perLevel;
                break;
            case 'maxHp':
                this.fortress.maxHp += cfg.perLevel;
                this.fortress.hp += Math.floor(cfg.perLevel / 2); // heal a bit too
                this.fortress.hp = Math.min(this.fortress.hp, this.fortress.maxHp);
                break;
            case 'repair':
                this.fortress.hp = Math.min(this.fortress.hp + cfg.perLevel, this.fortress.maxHp);
                break;
            case 'mason':
                // Mason is passive — healing logic handled in onWaveClear and update loop
                break;
        }

        this.updateUI();
    },

    buyTurret(typeKey) {
        if (this.state === 'gameover') return;
        if (this.fortress.ownedTurrets.includes(typeKey)) return;
        const cfg = CONFIG.turrets[typeKey];
        if (this.gold < cfg.cost) return;
        this.gold -= cfg.cost;
        this.fortress.addTurret(typeKey);
        this.updateUI();
    },

    // Gold mine: passive income
    buyMine() {
        if (this.state === 'gameover') return;
        const cost = this._getMineCost();
        if (this.gold < cost) return;
        this.gold -= cost;
        this.mineLevel++;
        this.updateUI();
    },

    _getMineCost() {
        return Math.floor(60 * Math.pow(1.8, this.mineLevel));
    },

    _getMineIncome() {
        // Levels 1-2: flat 3 gold/sec per level
        // Levels 3+: compound — each level adds 15% more income
        if (this.mineLevel <= 2) return this.mineLevel * 3;
        const base = 6; // level 2 output
        return base * Math.pow(1.15, this.mineLevel - 2);
    },

    startWave() {
        if (this.state !== 'idle') return;
        this.state = 'active';
        this.waveManager.startWave();
        this.updateUI();
    },

    onWaveClear() {
        this.state = 'idle';
        const bonus = CONFIG.economy.waveBonusBase + CONFIG.economy.waveBonusPerWave * this.waveManager.waveNum;
        this.gold += bonus;
        this.totalGoldEarned += bonus;
        this.floatingTexts.push(new FloatingText(
            canvas.width / 2, canvas.height / 2 - 30,
            `Wave ${this.waveManager.waveNum} Clear! +${bonus}g`,
            '#ffd700', 20
        ));

        // Mason heals after each wave clear
        if (this.upgradeLevels.mason > 0) {
            const heal = this._getMasonHeal();
            const actual = Math.min(heal, this.fortress.maxHp - this.fortress.hp);
            if (actual > 0) {
                this.fortress.hp += actual;
                this.floatingTexts.push(new FloatingText(
                    this.fortress.x, game.groundY - this.fortress.height - 20,
                    `+${Math.floor(actual)} HP`, '#55cc55', 14
                ));
            }
        }
        this.updateUI();
    },

    _getMasonHeal() {
        // Base heal: 8 HP per mason level after each wave
        return this.upgradeLevels.mason * 8;
    },

    _getMasonPassiveHeal() {
        // Passive HP/sec when mine is built: 1 HP/sec per mason level
        if (this.mineLevel <= 0) return 0;
        return this.upgradeLevels.mason * 1;
    },

    onEnemyKill(enemy) {
        this.gold += enemy.reward;
        this.totalGoldEarned += enemy.reward;
        this.totalKills++;

        // Death particles
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(
                enemy.x, enemy.y - enemy.height / 2,
                randRange(-60, 60), randRange(-80, -20),
                randRange(0.3, 0.6), enemy.color, randRange(2, 5)
            ));
        }

        // Floating gold text
        this.floatingTexts.push(new FloatingText(
            enemy.x, enemy.y - enemy.height - 10,
            `+${enemy.reward}g`, '#ffd700', 13
        ));

        this.updateUI();
    },

    gameOver() {
        this.state = 'gameover';
        document.getElementById('final-wave').textContent = this.waveManager.waveNum;
        document.getElementById('final-kills').textContent = this.totalKills;
        document.getElementById('final-gold').textContent = this.totalGoldEarned;
        document.getElementById('game-over-overlay').classList.remove('hidden');
    },

    restart() {
        this._loopRunning = false;
        this.fortress.reset();
        this.waveManager.reset();
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.gold = CONFIG.economy.startingGold;
        this.totalGoldEarned = 0;
        this.totalKills = 0;
        this.mineLevel = 0;
        this.mineAccum = 0;
        this.state = 'idle';
        this.gameSpeed = 1;
        this.screenShake = 0;
        this.upgradeLevels = { damage: 0, attackSpeed: 0, range: 0, maxHp: 0, repair: 0, mason: 0 };
        document.getElementById('game-over-overlay').classList.add('hidden');
        this.setupUI();
        this._updateSpeedBtn();
        this.updateUI();
        this.lastTime = performance.now();
        this._startLoop();
    },

    updateUI() {
        // HUD
        document.getElementById('hud-wave').textContent = Math.max(1, this.waveManager.waveNum);
        document.getElementById('hud-gold').textContent = this.gold;

        const hpPct = this.fortress.hp / this.fortress.maxHp;
        document.getElementById('hud-hp-fill').style.width = (hpPct * 100) + '%';
        document.getElementById('hud-hp-text').textContent = `${Math.ceil(this.fortress.hp)} / ${this.fortress.maxHp}`;

        const hpFill = document.getElementById('hud-hp-fill');
        hpFill.classList.remove('warning', 'critical');
        if (hpPct <= 0.25) hpFill.classList.add('critical');
        else if (hpPct <= 0.5) hpFill.classList.add('warning');

        // Wave status
        const status = document.getElementById('hud-wave-status');
        if (this.state === 'active') {
            status.textContent = 'Under Attack!';
            status.className = 'hud-status active';
        } else if (this.state === 'gameover') {
            status.textContent = 'Defeated';
            status.className = 'hud-status active';
        } else {
            status.textContent = 'Ready';
            status.className = 'hud-status';
        }

        // Wave button
        const waveBtn = document.getElementById('start-wave-btn');
        waveBtn.disabled = this.state !== 'idle';
        waveBtn.textContent = this.state === 'idle'
            ? `Start Wave ${this.waveManager.waveNum + 1}`
            : (this.state === 'active' ? 'Wave in Progress...' : 'Game Over');

        // Stat upgrade buttons
        const buttons = document.querySelectorAll('.upgrade-btn:not(.turret-btn):not(.mine-btn)');
        buttons.forEach(btn => {
            const key = btn.dataset.upgrade;
            if (!key) return;
            const cost = this._getUpgradeCost(key);
            const canAfford = this.gold >= cost && this.state !== 'gameover';
            const repairDisabled = key === 'repair' && this.fortress.hp >= this.fortress.maxHp;
            btn.disabled = !canAfford || this.state === 'gameover' || repairDisabled;
            btn.querySelector('.upgrade-cost').textContent = cost + 'g';
            let levelText = `Level ${this.upgradeLevels[key]}`;
            if (key === 'repair') levelText = `HP: ${Math.ceil(this.fortress.hp)}/${this.fortress.maxHp}`;
            else if (key === 'mason') {
                const ml = this.upgradeLevels.mason;
                const passiveNote = this.mineLevel > 0 ? ` +${ml}hp/s` : '';
                levelText = ml > 0 ? `Lv${ml} (+${ml * 8}hp/wave${passiveNote})` : 'Level 0';
            }
            btn.querySelector('.upgrade-level').textContent = levelText;
        });

        // Turret buttons
        document.querySelectorAll('.turret-btn').forEach(btn => {
            const key = btn.dataset.turret;
            const cfg = CONFIG.turrets[key];
            const owned = this.fortress.ownedTurrets.includes(key);
            btn.querySelector('.upgrade-cost').textContent = owned ? 'Owned' : cfg.cost + 'g';
            btn.disabled = owned || this.gold < cfg.cost || this.state === 'gameover';
        });

        // Mine button
        const mineBtn = document.querySelector('.mine-btn');
        if (mineBtn) {
            const mineCost = this._getMineCost();
            mineBtn.querySelector('.upgrade-cost').textContent = mineCost + 'g';
            const income = this._getMineIncome();
            const incomeStr = income % 1 === 0 ? income : income.toFixed(1);
            mineBtn.querySelector('.upgrade-level').textContent =
                this.mineLevel > 0 ? `Level ${this.mineLevel} (+${incomeStr}g/s)` : 'Level 0';
            mineBtn.querySelector('.upgrade-desc').textContent =
                this.mineLevel < 2 ? '+3g/s per level' : '+15% income per level';
            mineBtn.disabled = this.gold < mineCost || this.state === 'gameover';
        }
    },

    // ---- Game Loop ----
    loop(now) {
        const rawDt = Math.min((now - this.lastTime) / 1000, 0.05);
        this.lastTime = now;
        const dt = rawDt * this.gameSpeed;

        this.update(dt);
        this.render();
    },

    update(dt) {
        if (this.state === 'gameover') return;

        // Screen shake decay
        if (this.screenShake > 0) this.screenShake -= dt;

        // Update clouds
        for (const c of this.clouds) {
            c.x -= c.speed * dt;
            if (c.x + c.w < 0) c.x = canvas.width + c.w;
        }

        // Fortress
        this.fortress.update(dt, this.enemies);

        // Enemies
        for (const e of this.enemies) {
            e.update(dt, this.fortress.x);
            // Enemy attacks fortress
            if (!e.dead && e.hasAttacked) {
                this.fortress.takeDamage(e.damage);
                e.dead = true;

                // Impact particles
                for (let i = 0; i < 5; i++) {
                    this.particles.push(new Particle(
                        this.fortress.x + this.fortress.width / 2, e.y - e.height / 2,
                        randRange(-40, 40), randRange(-60, -10),
                        randRange(0.2, 0.5), '#ff6644', randRange(2, 4)
                    ));
                }
                this.floatingTexts.push(new FloatingText(
                    this.fortress.x + 20, this.fortress.y || (this.groundY - 60),
                    `-${e.damage}`, '#ff4444', 15
                ));

                if (this.fortress.hp <= 0) {
                    this.gameOver();
                    return;
                }
                this.updateUI();
            }
        }

        // Give rewards for dead enemies
        for (const e of this.enemies) {
            if (e.dead && !e._rewarded) {
                e._rewarded = true;
                if (!e.hasAttacked) { // killed, not suicide
                    this.onEnemyKill(e);
                }
            }
        }

        // Projectiles (can kill more enemies this frame)
        for (const p of this.projectiles) {
            p.update(dt);
        }
        this.projectiles = this.projectiles.filter(p => p.alive);

        // Particles
        for (const p of this.particles) p.update(dt);
        this.particles = this.particles.filter(p => !p.dead);

        // Floating text
        for (const t of this.floatingTexts) t.update(dt);
        this.floatingTexts = this.floatingTexts.filter(t => !t.dead);

        // Wave manager checks completion (must run before dead enemy cleanup
        // so it can see all enemies including ones killed this frame)
        this.waveManager.update(dt);

        // Now remove dead enemies
        this.enemies = this.enemies.filter(e => !e.dead);

        // Gold mine passive income (works in idle and active states)
        if (this.mineLevel > 0) {
            this.mineAccum += this._getMineIncome() * dt;
            if (this.mineAccum >= 1) {
                const earned = Math.floor(this.mineAccum);
                this.gold += earned;
                this.totalGoldEarned += earned;
                this.mineAccum -= earned;
                // Show floating gold text from mine position
                const mineX = this.fortress.x - this.fortress.width / 2 - 35;
                this.floatingTexts.push(new FloatingText(
                    mineX + randRange(-5, 5), this.groundY - 30,
                    `+${earned}g`, '#ffd700', 11
                ));
                this.updateUI();
            }
        }

        // Mason passive healing (only when mine is built)
        if (this.upgradeLevels.mason > 0 && this.mineLevel > 0) {
            const healRate = this._getMasonPassiveHeal();
            if (healRate > 0 && this.fortress.hp < this.fortress.maxHp) {
                this.fortress.hp = Math.min(this.fortress.hp + healRate * dt, this.fortress.maxHp);
                this.updateUI();
            }
        }
    },

    render() {
        const w = canvas.width;
        const h = canvas.height;

        // Screen shake offset
        let shakeX = 0, shakeY = 0;
        if (this.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * 6;
            shakeY = (Math.random() - 0.5) * 6;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // ---- Background ----
        // Sky gradient (dusk/twilight feel)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
        skyGrad.addColorStop(0, '#0a0a1e');
        skyGrad.addColorStop(0.3, '#16213e');
        skyGrad.addColorStop(0.6, '#1a3050');
        skyGrad.addColorStop(1, '#2a4060');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, this.groundY);

        // Stars
        for (const s of this.stars) {
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = '#fff';
            ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        ctx.globalAlpha = 1;

        // Clouds
        for (const c of this.clouds) {
            ctx.globalAlpha = c.alpha;
            ctx.fillStyle = '#4a6080';
            ctx.beginPath();
            ctx.ellipse(c.x + c.w / 2, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(c.x + c.w * 0.3, c.y + 3, c.w * 0.35, c.h * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Distant mountains
        ctx.fillStyle = '#1a2a3a';
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        for (let x = 0; x <= w; x += 60) {
            const mh = 40 + Math.sin(x * 0.005 + 1) * 30 + Math.sin(x * 0.012) * 20;
            ctx.lineTo(x, this.groundY - mh);
        }
        ctx.lineTo(w, this.groundY);
        ctx.closePath();
        ctx.fill();

        // Mid hills
        ctx.fillStyle = '#1e3040';
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        for (let x = 0; x <= w; x += 40) {
            const mh = 15 + Math.sin(x * 0.008 + 3) * 15 + Math.sin(x * 0.02) * 8;
            ctx.lineTo(x, this.groundY - mh);
        }
        ctx.lineTo(w, this.groundY);
        ctx.closePath();
        ctx.fill();

        // Ground
        const groundGrad = ctx.createLinearGradient(0, this.groundY, 0, h);
        groundGrad.addColorStop(0, '#3a5a3a');
        groundGrad.addColorStop(0.3, '#2a4a2a');
        groundGrad.addColorStop(1, '#1a3a1a');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, this.groundY, w, h - this.groundY);

        // Ground line
        ctx.strokeStyle = '#4a6a4a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.lineTo(w, this.groundY);
        ctx.stroke();

        // ---- Game Objects ----
        // Fortress
        // Gold mine (drawn behind fortress)
        if (this.mineLevel > 0) {
            this._drawMine(ctx, this.groundY);
        }

        // Fortress
        this.fortress.draw(ctx, this.groundY);

        // Enemies
        for (const e of this.enemies) e.draw(ctx);

        // Projectiles
        for (const p of this.projectiles) p.draw(ctx);

        // Particles
        for (const p of this.particles) p.draw(ctx);

        // Floating text
        for (const t of this.floatingTexts) t.draw(ctx);

        ctx.restore();
    },

    _drawMine(ctx, groundY) {
        const mineX = this.fortress.x - this.fortress.width / 2 - 35;
        const mineY = groundY;
        const lvl = this.mineLevel;
        const mineW = 20 + lvl * 6;
        const mineH = 18 + lvl * 4;

        // Mine shaft
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(mineX - mineW / 2, mineY - mineH, mineW, mineH);
        // Roof
        ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.moveTo(mineX - mineW / 2 - 4, mineY - mineH);
        ctx.lineTo(mineX, mineY - mineH - 10 - lvl * 2);
        ctx.lineTo(mineX + mineW / 2 + 4, mineY - mineH);
        ctx.closePath();
        ctx.fill();
        // Entrance
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(mineX - 5, mineY - 12, 10, 12);
        // Gold sparkle
        const sparkle = (Math.sin(performance.now() / 200) + 1) / 2;
        ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + sparkle * 0.4})`;
        ctx.beginPath();
        ctx.arc(mineX, mineY - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        // Income label
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        const mIncome = this._getMineIncome();
        const mIncStr = mIncome % 1 === 0 ? mIncome : mIncome.toFixed(1);
        ctx.fillText(`+${mIncStr}g/s`, mineX, mineY - mineH - 12 - lvl * 2);
    },
};

// ---- Start ----
game.init();
