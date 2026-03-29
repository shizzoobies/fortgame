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
        bat: {
            name: 'Bat',
            hp: 10,
            speed: 80,
            damage: 5,
            reward: 12,
            color: '#885577',
            accentColor: '#663355',
            width: 18,
            height: 14,
            flying: true,
            flyHeight: 80,
        },
        dragon: {
            name: 'Dragon',
            hp: 200,
            speed: 18,
            damage: 30,
            reward: 65,
            color: '#cc4444',
            accentColor: '#aa2222',
            width: 44,
            height: 36,
            flying: true,
            flyHeight: 120,
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
        magePower: { name: 'Arcane Power', desc: '+20% ability damage', baseCost: 80, costScale: 1.6, perLevel: 0.2 },
        mageCooldown: { name: 'Chronomancy', desc: '-10% cooldowns', baseCost: 100, costScale: 1.7, perLevel: 0.1 },
        mageShield: { name: 'Ward Mastery', desc: '+25 shield HP & +2s duration', baseCost: 90, costScale: 1.5, perLevel: 1 },
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

// ---- Audio System ----
const audio = {
    ctx: null, // Web Audio context (lazy init on first interaction)
    musicVolume: 0.4,
    sfxVolume: 0.5,
    muted: false,
    currentTrack: null,
    tracks: {
        menu: new Audio('Assets/Music/Menu.mp3'),
        gameplay: new Audio('Assets/Music/Main Gameplay.mp3'),
        endless: new Audio('Assets/Music/Endless Waves.mp3'),
    },

    init() {
        for (const t of Object.values(this.tracks)) {
            t.loop = true;
            t.volume = this.musicVolume;
        }
    },

    _ensureCtx() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    },

    playMusic(trackName) {
        if (this.currentTrack === trackName) return;
        // Fade out current
        for (const [name, t] of Object.entries(this.tracks)) {
            if (name !== trackName) { t.pause(); t.currentTime = 0; }
        }
        this.currentTrack = trackName;
        const track = this.tracks[trackName];
        if (track && !this.muted) {
            track.volume = this.musicVolume;
            track.play().catch(() => {});
        }
    },

    stopMusic() {
        for (const t of Object.values(this.tracks)) { t.pause(); t.currentTime = 0; }
        this.currentTrack = null;
    },

    setMuted(muted) {
        this.muted = muted;
        if (muted) {
            for (const t of Object.values(this.tracks)) t.pause();
        } else if (this.currentTrack) {
            this.tracks[this.currentTrack].play().catch(() => {});
        }
    },

    // Generated sound effects using Web Audio API
    playSfx(type) {
        if (this.muted) return;
        try {
            const ctx = this._ensureCtx();
            const now = ctx.currentTime;
            const gain = ctx.createGain();
            gain.connect(ctx.destination);
            gain.gain.value = this.sfxVolume;

            if (type === 'shoot') {
                // Quick zap/thwip
                const osc = ctx.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
                gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.connect(gain);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'hit') {
                // Impact thud
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.connect(gain);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'death') {
                // Pop/crunch
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
                }
                const src = ctx.createBufferSource();
                src.buffer = buf;
                gain.gain.value = this.sfxVolume * 0.25;
                src.connect(gain);
                src.start(now);
            } else if (type === 'upgrade') {
                // Ascending chime
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.setValueAtTime(600, now + 0.08);
                osc.frequency.setValueAtTime(800, now + 0.16);
                gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.connect(gain);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'waveClear') {
                // Triumphant fanfare
                const osc1 = ctx.createOscillator();
                osc1.type = 'triangle';
                osc1.frequency.setValueAtTime(523, now);
                osc1.frequency.setValueAtTime(659, now + 0.15);
                osc1.frequency.setValueAtTime(784, now + 0.3);
                gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc1.connect(gain);
                osc1.start(now);
                osc1.stop(now + 0.5);
            } else if (type === 'fortressHit') {
                // Heavy impact
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
                gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.connect(gain);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'lightning') {
                // Electric crackle
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / ctx.sampleRate;
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * Math.sin(t * 3000);
                }
                const src = ctx.createBufferSource();
                src.buffer = buf;
                gain.gain.value = this.sfxVolume * 0.35;
                src.connect(gain);
                src.start(now);
            } else if (type === 'meteor') {
                // Deep explosion boom
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(80, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
                gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.connect(gain);
                osc.start(now);
                osc.stop(now + 0.5);
                // Crackle layer
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
                const src = ctx.createBufferSource();
                src.buffer = buf;
                const g2 = ctx.createGain();
                g2.gain.value = this.sfxVolume * 0.3;
                g2.connect(ctx.destination);
                src.connect(g2);
                src.start(now);
            } else if (type === 'shield') {
                // Magical hum
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.setValueAtTime(500, now + 0.1);
                osc.frequency.setValueAtTime(400, now + 0.3);
                gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.connect(gain);
                osc.start(now);
                osc.stop(now + 0.4);
            } else if (type === 'gameOver') {
                // Sad descending tone
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.8);
                gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
                osc.connect(gain);
                osc.start(now);
                osc.stop(now + 1.0);
            }
        } catch(e) { /* audio not available */ }
    },
};
audio.init();

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
            audio.playSfx('hit');
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
        this.maxHp = Math.floor(cfg.hp * Math.pow(1.12, waveNum - 1));
        this.hp = this.maxHp;
        this.speed = cfg.speed;
        this.damage = Math.ceil(cfg.damage * (1 + (waveNum - 1) * 0.05));
        this.reward = Math.floor(cfg.reward * (1 + (waveNum - 1) * 0.1));
        this.color = cfg.color;
        this.accentColor = cfg.accentColor;
        this.width = cfg.width;
        this.height = cfg.height;
        this.x = x;
        this.y = y;
        this.flying = cfg.flying || false;
        this.flyHeight = cfg.flyHeight || 0;
        this.baseY = y; // ground reference
        this.wingPhase = Math.random() * Math.PI * 2;
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

        // Flying enemies: hover above ground with sine wave
        if (this.flying) {
            this.wingPhase += dt * 6;
            this.y = this.baseY - this.flyHeight + Math.sin(this.bobPhase * 0.5) * 12;
        }
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
        } else if (this.type === 'bat') {
            this._drawBat(ctx, drawX, drawY, hw, hh);
        } else if (this.type === 'dragon') {
            this._drawDragon(ctx, drawX, drawY, hw, hh);
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

    _drawBat(ctx, x, y, hw, hh) {
        // Body (small oval)
        ctx.beginPath();
        ctx.ellipse(x, y - hh * 0.5, hw * 0.6, hh * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings (animated)
        const wingAngle = Math.sin(this.wingPhase) * 0.5;
        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.accentColor;
        // Left wing
        ctx.beginPath();
        ctx.moveTo(x - hw * 0.3, y - hh * 0.5);
        ctx.lineTo(x - hw * 1.5, y - hh * 0.8 + wingAngle * 10);
        ctx.lineTo(x - hw * 1.2, y - hh * 0.2 + wingAngle * 5);
        ctx.closePath();
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(x + hw * 0.3, y - hh * 0.5);
        ctx.lineTo(x + hw * 1.5, y - hh * 0.8 + wingAngle * 10);
        ctx.lineTo(x + hw * 1.2, y - hh * 0.2 + wingAngle * 5);
        ctx.closePath();
        ctx.fill();
        // Eyes
        if (this.hitFlash <= 0) {
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(x - 3, y - hh * 0.6, 2, 2);
            ctx.fillRect(x + 1, y - hh * 0.6, 2, 2);
        }
    }

    _drawDragon(ctx, x, y, hw, hh) {
        // Body (large, muscular)
        ctx.beginPath();
        ctx.moveTo(x - hw, y);
        ctx.lineTo(x - hw * 0.8, y - hh);
        ctx.lineTo(x + hw * 0.8, y - hh);
        ctx.lineTo(x + hw, y);
        ctx.closePath();
        ctx.fill();
        // Wings (large, animated)
        const wingAngle = Math.sin(this.wingPhase) * 0.6;
        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.accentColor;
        // Left wing
        ctx.beginPath();
        ctx.moveTo(x - hw * 0.5, y - hh * 0.7);
        ctx.lineTo(x - hw * 2.2, y - hh * 1.3 + wingAngle * 15);
        ctx.lineTo(x - hw * 1.8, y - hh * 0.3 + wingAngle * 8);
        ctx.lineTo(x - hw * 0.3, y - hh * 0.3);
        ctx.closePath();
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(x + hw * 0.5, y - hh * 0.7);
        ctx.lineTo(x + hw * 2.2, y - hh * 1.3 + wingAngle * 15);
        ctx.lineTo(x + hw * 1.8, y - hh * 0.3 + wingAngle * 8);
        ctx.lineTo(x + hw * 0.3, y - hh * 0.3);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(x, y - hh - 6, 8, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.strokeStyle = this.hitFlash > 0 ? '#fff' : '#ff6644';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 6, y - hh - 10);
        ctx.lineTo(x - 10, y - hh - 22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 6, y - hh - 10);
        ctx.lineTo(x + 10, y - hh - 22);
        ctx.stroke();
        // Eyes (glowing)
        if (this.hitFlash <= 0) {
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(x - 4, y - hh - 8, 3, 3);
            ctx.fillRect(x + 1, y - hh - 8, 3, 3);
        }
        // Fire breath hint
        ctx.fillStyle = 'rgba(255, 100, 30, 0.15)';
        ctx.beginPath();
        ctx.arc(x - hw - 5, y - hh * 0.5, 6, 0, Math.PI * 2);
        ctx.fill();
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
        // Shield absorbs damage first
        if (game.shieldHP > 0) {
            const absorbed = Math.min(amount, game.shieldHP);
            game.shieldHP -= absorbed;
            amount -= absorbed;
            if (amount <= 0) return;
        }
        this.hp = Math.max(0, this.hp - amount);
        this.hitFlash = 0.15;
        game.screenShake = 0.15;
        audio.playSfx('fortressHit');
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
                    audio.playSfx('shoot');
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
        // Accelerating enemy count: grows faster each wave
        const totalEnemies = CONFIG.waves.baseEnemyCount +
            Math.floor(num * CONFIG.waves.enemyCountScale * Math.pow(1.05, num - 1));

        // Composition based on wave number
        let gruntPct = Math.max(0.2, 1 - num * 0.07);
        let runnerPct = clamp(num * 0.06, 0, 0.3);
        let tankPct = clamp((num - 3) * 0.04, 0, 0.25);
        let batPct = clamp((num - 2) * 0.04, 0, 0.2);   // bats from wave 3
        let dragonPct = clamp((num - 7) * 0.02, 0, 0.1); // dragons from wave 8

        // Normalize
        const total = gruntPct + runnerPct + tankPct + batPct + dragonPct;
        gruntPct /= total;
        runnerPct /= total;
        tankPct /= total;
        batPct /= total;
        dragonPct /= total;

        const grunts = Math.round(totalEnemies * gruntPct);
        const runners = Math.round(totalEnemies * runnerPct);
        const tanks = Math.round(totalEnemies * tankPct);
        const bats = Math.round(totalEnemies * batPct);
        const dragons = Math.round(totalEnemies * dragonPct);

        for (let i = 0; i < grunts; i++) queue.push('grunt');
        for (let i = 0; i < runners; i++) queue.push('runner');
        for (let i = 0; i < tanks; i++) queue.push('tank');
        for (let i = 0; i < bats; i++) queue.push('bat');
        for (let i = 0; i < dragons; i++) queue.push('dragon');

        // Boss every N waves
        if (num > 0 && num % CONFIG.waves.bossWaveInterval === 0) {
            queue.push('boss');
        }
        // Dragon boss from wave 8+
        if (num >= 8 && num % 4 === 0) {
            queue.push('dragon');
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
                this.spawnTimer = Math.max(0.15, CONFIG.waves.spawnInterval - this.waveNum * 0.025);
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
    mineAccum: 0,
    mageActive: false,
    endlessMode: false,
    selectedAbility: null,
    abilityCooldowns: { lightning: 0, meteor: 0, shield: 0 },
    shieldHP: 0,
    shieldTimer: 0,
    abilityEffects: [],
    groundY: 0,
    state: 'idle', // idle, active, gameover
    screenShake: 0,
    upgradeLevels: { damage: 0, attackSpeed: 0, range: 0, maxHp: 0, repair: 0, mason: 0, magePower: 0, mageCooldown: 0, mageShield: 0 },
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
        this.mageActive = false;
        this.endlessMode = false;
        this.selectedAbility = null;
        this.abilityCooldowns = { lightning: 0, meteor: 0, shield: 0 };
        this.shieldHP = 0;
        this.shieldTimer = 0;
        this.abilityEffects = [];
        this.state = 'idle';
        this.gameSpeed = 1;
        this.screenShake = 0;
        this.upgradeLevels = { damage: 0, attackSpeed: 0, range: 0, maxHp: 0, repair: 0, mason: 0, magePower: 0, mageCooldown: 0, mageShield: 0 };
        this._generateClouds();
        this._generateStars();
        this.setupUI();
        this.updateUI();
        document.getElementById('game-over-overlay').classList.add('hidden');
        this.lastTime = performance.now();
        audio.playMusic('menu');
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

        // Stat upgrades (skip mage upgrades — shown later)
        const mageUpgradeKeys = ['magePower', 'mageCooldown', 'mageShield'];
        for (const [key, cfg] of Object.entries(CONFIG.upgrades)) {
            if (mageUpgradeKeys.includes(key)) continue;
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

        // Weapons / Mage section
        const allTurretsOwned = Object.keys(CONFIG.turrets).every(k => this.fortress.ownedTurrets.includes(k));

        if (!allTurretsOwned) {
            // Show turret shop
            const weaponHeader = document.createElement('div');
            weaponHeader.className = 'panel-section-header';
            weaponHeader.textContent = 'Weapons';
            container.appendChild(weaponHeader);

            for (const [key, cfg] of Object.entries(CONFIG.turrets)) {
                const owned = this.fortress.ownedTurrets.includes(key);
                if (owned) continue; // hide already-bought turrets
                const btn = document.createElement('button');
                btn.className = 'upgrade-btn turret-btn';
                btn.dataset.turret = key;
                btn.innerHTML = `
                    <div class="upgrade-name">
                        <span>${cfg.name}</span>
                        <span class="upgrade-cost">${cfg.cost}g</span>
                    </div>
                    <div class="upgrade-desc">${cfg.desc}</div>
                `;
                btn.style.borderLeftColor = cfg.color;
                btn.style.borderLeftWidth = '3px';
                btn.addEventListener('click', () => this.buyTurret(key));
                container.appendChild(btn);
            }
        } else if (!this.mageActive) {
            // All turrets owned — show mage purchase
            const mageHeader = document.createElement('div');
            mageHeader.className = 'panel-section-header';
            mageHeader.textContent = 'Hero';
            container.appendChild(mageHeader);

            const mageBtn = document.createElement('button');
            mageBtn.className = 'upgrade-btn mage-btn';
            mageBtn.innerHTML = `
                <div class="upgrade-name">
                    <span>Summon Mage</span>
                    <span class="upgrade-cost">500g</span>
                </div>
                <div class="upgrade-desc">Endless waves + click abilities</div>
            `;
            mageBtn.addEventListener('click', () => this.buyMage());
            mageBtn.disabled = this.gold < 500;
            container.appendChild(mageBtn);
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

        // Ability buttons (only when mage is active)
        if (this.mageActive) {
            const abilHeader = document.createElement('div');
            abilHeader.className = 'panel-section-header';
            abilHeader.textContent = 'Abilities';
            container.appendChild(abilHeader);

            const abilities = [
                { key: 'lightning', name: 'Lightning (1)', desc: 'Chain bolt, 8s CD', color: '#55aaff' },
                { key: 'meteor', name: 'Meteor (2)', desc: 'AOE blast, 15s CD', color: '#ff6633' },
                { key: 'shield', name: 'Shield (3)', desc: 'Block 50 dmg, 20s CD', color: '#44ddff' },
            ];
            for (const ab of abilities) {
                const btn = document.createElement('button');
                btn.className = 'upgrade-btn ability-btn';
                btn.dataset.ability = ab.key;
                btn.style.borderLeftColor = ab.color;
                btn.style.borderLeftWidth = '3px';
                btn.innerHTML = `
                    <div class="upgrade-name">
                        <span>${ab.name}</span>
                        <span class="upgrade-cost ability-cd">Ready</span>
                    </div>
                    <div class="upgrade-desc">${ab.desc}</div>
                `;
                btn.addEventListener('click', () => this.selectAbility(ab.key));
                container.appendChild(btn);
            }

            // Mage upgrades
            const mageUpHeader = document.createElement('div');
            mageUpHeader.className = 'panel-section-header';
            mageUpHeader.textContent = 'Mage Upgrades';
            container.appendChild(mageUpHeader);

            for (const key of mageUpgradeKeys) {
                const cfg = CONFIG.upgrades[key];
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
        }

        document.getElementById('start-wave-btn').addEventListener('click', () => this.startWave());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('speed-btn').addEventListener('click', () => this.toggleSpeed());
        document.getElementById('mute-btn').addEventListener('click', () => this.toggleMute());
        document.getElementById('endless-btn').addEventListener('click', () => this.toggleEndless());
        document.getElementById('panel-toggle').addEventListener('click', () => this.togglePanel());

        // Keyboard listeners (only add once)
        if (!this._keysAdded) {
            this._keysAdded = true;
            document.addEventListener('keydown', (e) => {
                if (e.target !== document.body) return;
                if (e.code === 'Space') { e.preventDefault(); this.toggleSpeed(); }
                if (e.code === 'Digit1' || e.code === 'Numpad1') this.selectAbility('lightning');
                if (e.code === 'Digit2' || e.code === 'Numpad2') this.selectAbility('meteor');
                if (e.code === 'Digit3' || e.code === 'Numpad3') this.selectAbility('shield');
                if (e.code === 'Escape') { this.selectedAbility = null; canvas.style.cursor = 'default'; this.updateUI(); }
            });
            // Canvas click for abilities
            canvas.addEventListener('click', (e) => {
                if (!this.mageActive || !this.selectedAbility) return;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const cx = (e.clientX - rect.left) * scaleX;
                const cy = (e.clientY - rect.top) * scaleY;
                this.castAbility(cx, cy);
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

    toggleMute() {
        audio.setMuted(!audio.muted);
        document.getElementById('mute-btn').textContent = audio.muted ? 'Sound: OFF' : 'Sound: ON';
    },

    toggleEndless() {
        this.endlessMode = !this.endlessMode;
        document.getElementById('endless-btn').textContent = this.endlessMode ? 'Endless: ON' : 'Endless: OFF';
        // If turning on while idle, auto-start next wave
        if (this.endlessMode && this.state === 'idle' && this.waveManager.waveNum > 0) {
            this.startWave();
        }
        this.updateUI();
    },

    togglePanel() {
        const panel = document.getElementById('upgrade-panel');
        const btn = document.getElementById('panel-toggle');
        panel.classList.toggle('panel-hidden');
        btn.classList.toggle('panel-open');
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
        audio.playSfx('upgrade');

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
        audio.playSfx('upgrade');
        // Rebuild UI so mage button can appear if all turrets are now owned
        this.setupUI();
        this.updateUI();
    },

    // Mage hero: enables endless mode + abilities
    buyMage() {
        if (this.state === 'gameover') return;
        if (this.mageActive) return;
        const allTurrets = Object.keys(CONFIG.turrets);
        if (!allTurrets.every(k => this.fortress.ownedTurrets.includes(k))) return;
        if (this.gold < 500) return;
        this.gold -= 500;
        this.mageActive = true;
        audio.playSfx('upgrade');
        audio.playMusic('endless');
        // If idle, auto-start the next wave
        if (this.state === 'idle') {
            this.startWave();
        }
        this.setupUI();
        this.updateUI();
    },

    selectAbility(type) {
        if (!this.mageActive) return;
        if (this.abilityCooldowns[type] > 0) return;
        this.selectedAbility = this.selectedAbility === type ? null : type;
        canvas.style.cursor = this.selectedAbility ? 'crosshair' : 'default';
        this.updateUI();
    },

    castAbility(canvasX, canvasY) {
        if (!this.mageActive || !this.selectedAbility) return;
        const ability = this.selectedAbility;
        if (this.abilityCooldowns[ability] > 0) return;

        const cdReduction = 1 - this.upgradeLevels.mageCooldown * 0.1; // -10% per level
        if (ability === 'lightning') {
            this._castLightning(canvasX, canvasY);
            this.abilityCooldowns.lightning = 8 * cdReduction;
            audio.playSfx('lightning');
        } else if (ability === 'meteor') {
            this._castMeteor(canvasX, canvasY);
            this.abilityCooldowns.meteor = 15 * cdReduction;
            audio.playSfx('meteor');
        } else if (ability === 'shield') {
            this._castShield();
            this.abilityCooldowns.shield = 20 * cdReduction;
            audio.playSfx('shield');
        }
        this.selectedAbility = null;
        canvas.style.cursor = 'default';
        this.updateUI();
    },

    _castLightning(cx, cy) {
        // Find nearest enemy to click point
        let targets = [];
        let nearest = null;
        let nearestDist = Infinity;
        for (const e of this.enemies) {
            if (e.dead) continue;
            const dx = e.x - cx;
            const dy = (e.y - e.height / 2) - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = e;
            }
        }
        if (!nearest) return;
        const mageDmgMult = 1 + this.upgradeLevels.magePower * 0.2;
        const lightningDmg = Math.floor(30 * mageDmgMult);
        targets.push(nearest);
        nearest.takeDamage(lightningDmg);

        // Chain to up to 3 nearby enemies
        for (let i = 0; i < 3; i++) {
            const last = targets[targets.length - 1];
            let chainTarget = null;
            let chainDist = Infinity;
            for (const e of this.enemies) {
                if (e.dead || targets.includes(e)) continue;
                const dx = e.x - last.x;
                const dy = e.y - last.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80 && dist < chainDist) {
                    chainDist = dist;
                    chainTarget = e;
                }
            }
            if (chainTarget) {
                targets.push(chainTarget);
                chainTarget.takeDamage(lightningDmg);
            } else break;
        }

        // Visual: lightning bolt effect
        this.abilityEffects.push({
            type: 'lightning', targets: targets.map(t => ({ x: t.x, y: t.y - t.height / 2 })),
            life: 0.4, maxLife: 0.4
        });
        this.screenShake = 0.1;
    },

    _castMeteor(cx, cy) {
        const radius = 100;
        const mageDmgMult = 1 + this.upgradeLevels.magePower * 0.2;
        const meteorDmg = Math.floor(50 * mageDmgMult);
        for (const e of this.enemies) {
            if (e.dead) continue;
            const dx = e.x - cx;
            const dy = (e.y - e.height / 2) - cy;
            if (Math.sqrt(dx * dx + dy * dy) < radius) {
                e.takeDamage(meteorDmg);
            }
        }
        // Visual: expanding ring
        this.abilityEffects.push({
            type: 'meteor', x: cx, y: cy, radius: radius,
            life: 0.6, maxLife: 0.6
        });
        this.screenShake = 0.25;
        // Particles
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(
                cx + randRange(-30, 30), cy + randRange(-30, 30),
                randRange(-80, 80), randRange(-100, -30),
                randRange(0.4, 0.8), '#ff6633', randRange(3, 6)
            ));
        }
    },

    _castShield() {
        this.shieldHP = 50 + this.upgradeLevels.mageShield * 25;
        this.shieldTimer = 5 + this.upgradeLevels.mageShield * 2;
        this.abilityEffects.push({
            type: 'shield_flash', life: 0.3, maxLife: 0.3
        });
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
        // Only switch music if not already playing the right track
        const targetTrack = this.mageActive ? 'endless' : 'gameplay';
        if (audio.currentTrack !== targetTrack) audio.playMusic(targetTrack);
        this.updateUI();
    },

    onWaveClear() {
        audio.playSfx('waveClear');
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

        // Endless mode: auto-start next wave if mage or endless toggle is active
        if (this.mageActive || this.endlessMode) {
            this.waveManager.startWave();
            if (this.mageActive && audio.currentTrack !== 'endless') audio.playMusic('endless');
        } else {
            this.state = 'idle';
            // Don't restart music — let gameplay track keep playing between waves
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
        audio.playSfx('death');
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
        audio.playSfx('gameOver');
        audio.stopMusic();
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
        this.mageActive = false;
        this.endlessMode = false;
        this.selectedAbility = null;
        this.abilityCooldowns = { lightning: 0, meteor: 0, shield: 0 };
        this.shieldHP = 0;
        this.shieldTimer = 0;
        this.abilityEffects = [];
        this.state = 'idle';
        this.gameSpeed = 1;
        this.screenShake = 0;
        this.upgradeLevels = { damage: 0, attackSpeed: 0, range: 0, maxHp: 0, repair: 0, mason: 0, magePower: 0, mageCooldown: 0, mageShield: 0 };
        document.getElementById('game-over-overlay').classList.add('hidden');
        canvas.style.cursor = 'default';
        this.setupUI();
        this._updateSpeedBtn();
        audio.playMusic('menu');
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

        // Mage button
        const mageBtn = document.querySelector('.mage-btn');
        if (mageBtn) {
            mageBtn.disabled = this.gold < 500 || this.state === 'gameover';
        }

        // Ability buttons
        document.querySelectorAll('.ability-btn').forEach(btn => {
            const key = btn.dataset.ability;
            const cd = this.abilityCooldowns[key];
            const cdEl = btn.querySelector('.ability-cd');
            if (cd > 0) {
                cdEl.textContent = Math.ceil(cd) + 's';
                btn.disabled = true;
                btn.classList.remove('ability-selected');
            } else {
                cdEl.textContent = 'Ready';
                btn.disabled = false;
                btn.classList.toggle('ability-selected', this.selectedAbility === key);
            }
        });

        // Wave button in endless mode
        if ((this.mageActive || this.endlessMode) && this.state === 'active') {
            waveBtn.textContent = `Wave ${this.waveManager.waveNum} (Endless)`;
        }

        // Endless toggle button
        const endlessBtn = document.getElementById('endless-btn');
        if (endlessBtn) {
            endlessBtn.textContent = this.endlessMode ? 'Endless: ON' : 'Endless: OFF';
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

        // Ability cooldowns
        for (const key of Object.keys(this.abilityCooldowns)) {
            if (this.abilityCooldowns[key] > 0) this.abilityCooldowns[key] -= dt;
        }
        // Shield timer
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) { this.shieldHP = 0; this.shieldTimer = 0; }
        }
        // Ability visual effects
        for (const fx of this.abilityEffects) fx.life -= dt;
        this.abilityEffects = this.abilityEffects.filter(fx => fx.life > 0);

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

        // Projectiles (can kill enemies)
        for (const p of this.projectiles) {
            p.update(dt);
        }
        this.projectiles = this.projectiles.filter(p => p.alive);

        // Give rewards for dead enemies (after projectiles so kills are counted)
        for (const e of this.enemies) {
            if (e.dead && !e._rewarded) {
                e._rewarded = true;
                if (!e.hasAttacked) { // killed, not suicide
                    this.onEnemyKill(e);
                }
            }
        }

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

        // Gold mine passive income (only during active waves)
        if (this.mineLevel > 0 && this.state === 'active') {
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

        // Mason passive healing (only during combat when mine is built)
        if (this.upgradeLevels.mason > 0 && this.mineLevel > 0 && this.state === 'active') {
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

        // Dynamic camera: zoom out if fortress is too tall for the canvas
        const fortressTopY = this.groundY - this.fortress.height - 40;
        const neededHeight = this.groundY + 60; // ground to top of fortress + margin
        const availableHeight = h;
        const cameraScale = Math.min(1.0, availableHeight / (this.fortress.height + 200));
        if (cameraScale < 1.0) {
            // Scale from bottom of canvas so ground stays anchored
            ctx.translate(0, h * (1 - cameraScale));
            ctx.scale(cameraScale, cameraScale);
        }

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

        // Ability effects
        for (const fx of this.abilityEffects) {
            const alpha = clamp(fx.life / fx.maxLife, 0, 1);
            if (fx.type === 'lightning') {
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = '#88ccff';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#55aaff';
                ctx.shadowBlur = 10;
                for (let i = 0; i < fx.targets.length - 1; i++) {
                    const a = fx.targets[i];
                    const b = fx.targets[i + 1];
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    // Jagged bolt
                    const mx = (a.x + b.x) / 2 + randRange(-15, 15);
                    const my = (a.y + b.y) / 2 + randRange(-15, 15);
                    ctx.lineTo(mx, my);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
                // Flash on each target
                for (const t of fx.targets) {
                    ctx.fillStyle = `rgba(200, 230, 255, ${alpha * 0.6})`;
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            } else if (fx.type === 'meteor') {
                const progress = 1 - fx.life / fx.maxLife;
                ctx.globalAlpha = alpha * 0.5;
                // Expanding ring
                ctx.strokeStyle = '#ff6633';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, fx.radius * progress, 0, Math.PI * 2);
                ctx.stroke();
                // Inner glow
                ctx.fillStyle = `rgba(255, 100, 30, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(fx.x, fx.y, fx.radius * progress * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else if (fx.type === 'shield_flash') {
                ctx.globalAlpha = alpha * 0.4;
                ctx.fillStyle = '#44ddff';
                const fx2 = this.fortress.x;
                const fy = this.groundY - this.fortress.height / 2;
                ctx.beginPath();
                ctx.arc(fx2, fy, this.fortress.width * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Shield dome (persistent while active)
        if (this.shieldHP > 0 && this.shieldTimer > 0) {
            const shimmer = Math.sin(performance.now() / 200) * 0.1;
            ctx.globalAlpha = 0.15 + shimmer;
            ctx.fillStyle = '#44ddff';
            const sx = this.fortress.x;
            const sy = this.groundY - this.fortress.height / 2;
            ctx.beginPath();
            ctx.arc(sx, sy, this.fortress.width * 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.4 + shimmer;
            ctx.strokeStyle = '#44ddff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1;
            // Shield HP text
            ctx.fillStyle = '#44ddff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Shield: ${Math.ceil(this.shieldHP)}`, sx, sy - this.fortress.width * 0.9 - 5);
        }

        // Mage on tower
        if (this.mageActive) {
            this._drawMage(ctx, this.groundY);
        }

        ctx.restore();
    },

    _drawMage(ctx, groundY) {
        // Mage stands on the tallest tower (left tower)
        const baseX = this.fortress.x - this.fortress.width / 2;
        const towerH = this.fortress.height + 20;
        const mx = baseX + 6;
        const my = groundY - towerH - 8;

        // Robe
        ctx.fillStyle = '#6644aa';
        ctx.beginPath();
        ctx.moveTo(mx - 5, my);
        ctx.lineTo(mx - 3, my - 14);
        ctx.lineTo(mx + 3, my - 14);
        ctx.lineTo(mx + 5, my);
        ctx.closePath();
        ctx.fill();
        // Head
        ctx.fillStyle = '#ddccaa';
        ctx.beginPath();
        ctx.arc(mx, my - 16, 3, 0, Math.PI * 2);
        ctx.fill();
        // Hat
        ctx.fillStyle = '#5533aa';
        ctx.beginPath();
        ctx.moveTo(mx - 4, my - 15);
        ctx.lineTo(mx, my - 25);
        ctx.lineTo(mx + 4, my - 15);
        ctx.closePath();
        ctx.fill();
        // Staff
        ctx.strokeStyle = '#aa8844';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mx + 4, my);
        ctx.lineTo(mx + 4, my - 20);
        ctx.stroke();
        // Staff orb (glows based on selected ability)
        const orbColor = this.selectedAbility === 'lightning' ? '#55aaff'
            : this.selectedAbility === 'meteor' ? '#ff6633'
            : this.selectedAbility === 'shield' ? '#44ddff' : '#aa88ff';
        ctx.fillStyle = orbColor;
        ctx.beginPath();
        ctx.arc(mx + 4, my - 22, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = orbColor.replace(')', ', 0.3)').replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(mx + 4, my - 22, 6, 0, Math.PI * 2);
        ctx.fill();
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
