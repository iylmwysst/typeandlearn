// Enemy tier configuration
const ENEMY_TIERS = {
    NORMAL: {
        spawnRate: 0.70,
        color: '#333',
        glowColor: '#666',
        baseRadius: 20, // Fixed size for Normal
        speedMultiplier: 0.7, // Reduced from 1.0 for slower gameplay
        health: 1,
        scoreMultiplier: 10,
        particleCount: 0
    },
    RARE: {
        spawnRate: 0.25,
        color: '#555',
        glowColor: '#888',
        baseRadius: 26, // Slightly larger than Normal (25-28 range)
        speedMultiplier: 0.7, // Reduced from 1.0 for slower gameplay
        health: 1,
        scoreMultiplier: 20,
        particleCount: 3
    },
    ELITE: {
        spawnRate: 0.05,
        color: '#000',
        glowColor: '#444',
        sizeMultiplier: 1.4,
        speedMultiplier: 0.7, // Same as Normal/Rare
        health: 2, // Note: Actual health is randomized to 1-2 in constructor
        scoreMultiplier: 50,
        particleCount: 5
    }
    // BOSS tier - reserved for future implementation
    // Future: Boss tier will be added here
    // - Spawn rate: 2% or every 25-30 kills
    // - Health: 3+, Size: 50+, unique mechanics
    /*
    BOSS: {
        spawnRate: 0.02,
        color: '#ff4444',
        glowColor: '#ffaa44',
        sizeMultiplier: 1.8,
        speedMultiplier: 0.6,
        health: 3,
        scoreMultiplier: 100,
        particleCount: 8
    }
    */
};

// Movement pattern types
const MOVEMENT_PATTERNS = {
    STRAIGHT: 'straight',
    ZIGZAG: 'zigzag',
    DIAGONAL: 'diagonal',
    SPIRAL: 'spiral'
};

// Asteroid class with associated word
class Asteroid {
    constructor(x, y, targetX, targetY, word, tier = 'NORMAL', movementPattern = 'straight') {
        this.x = x;
        this.y = y;
        this.word = word.toLowerCase();
        this.typedLetters = 0; // How many letters have been typed correctly

        // Tier system
        this.tier = tier;
        this.tierConfig = ENEMY_TIERS[tier];

        // ELITE tier gets random 1-2 health
        if (this.tier === 'ELITE') {
            this.maxHealth = Math.random() < 0.5 ? 1 : 2;
        } else {
            this.maxHealth = this.tierConfig.health;
        }
        this.currentHealth = this.maxHealth;

        // Size based on tier with random variation
        // Normal and Rare have fixed sizes, Elite uses size multiplier
        let baseSize;
        if (this.tierConfig.baseRadius !== undefined) {
            // Normal/Rare: Use fixed base radius
            baseSize = this.tierConfig.baseRadius;
        } else {
            // Elite: Use size multiplier with word length
            this.baseRadius = 15 + word.length * 1.5;
            baseSize = this.baseRadius * this.tierConfig.sizeMultiplier;
        }

        // Apply size variation (90-110% for all non-boss enemies)
        let sizeVariation = 0.9 + Math.random() * 0.2; // 90-110%

        // Normal and Rare units have a chance to spawn 30%+ larger
        if ((this.tier === 'NORMAL' || this.tier === 'RARE') && Math.random() < 0.15) {
            // 15% chance to be 30-50% larger
            sizeVariation = 1.3 + Math.random() * 0.2; // 130-150%
        }

        this.radius = baseSize * sizeVariation;

        // Speed based on tier (reduced for slower gameplay)
        this.baseSpeed = 0.5 + Math.random() * 0.3;
        this.speed = this.baseSpeed * this.tierConfig.speedMultiplier;

        // Store ship target for tracking
        this.shipX = targetX;
        this.shipY = targetY;

        // Movement pattern
        this.movementPattern = movementPattern;
        this.movementTimer = 0;

        // Initialize velocity based on movement pattern
        this.initializeMovement();

        this.color = this.tierConfig.color;
        this.glowColor = this.tierConfig.glowColor;
        this.isActive = false; // Is this the currently targeted asteroid?
        this.id = Date.now() + Math.random(); // Unique identifier

        // Knockback system
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.knockbackDecay = 0.85; // How fast knockback dissipates
        this.isKnockedBack = false;
        this.hitFlash = 0; // Hit flash effect counter
        this.manualMovement = false;
        this.immuneToKnockback = false;

        // Elite behaviour state tracking
        if (this.tier === 'ELITE') {
            this.eliteBaseSpeed = this.speed;
            this.defaultSpeed = this.eliteBaseSpeed * 0.7; // keep pace similar to other tiers
            this.rushSpeed = this.eliteBaseSpeed * 1.4; // Burst speed when rushing
            this.speed = this.defaultSpeed;
            this.eliteState = 'stalk';
            this.eliteStateTimer = 0;
            this.eliteRushDuration = 75 + Math.floor(Math.random() * 60); // ~1.25 - 2.25 seconds
            this.eliteTimeUntilRush = 240 + Math.floor(Math.random() * 210); // 4 - 7.5 seconds
            this.eliteSide = Math.random() < 0.5 ? -1 : 1;
            this.eliteDriftStrength = 0.18 + Math.random() * 0.18; // Subtle diagonal drift
        }

        // Bullet tracking for delayed destruction
        this.incomingBullets = 0; // Count of bullets fired at this asteroid
        this.bulletsHit = 0;       // Count of bullets that have hit
        this.markedForDestruction = false; // Word complete flag

        // Elite summoning mechanics
        if (this.tier === 'ELITE') {
            this.summonTimer = 0;
            this.summonInterval = 480; // 8 seconds at 60fps (less frequent than boss)
            this.maxSummons = 2; // Limit total summons (less than boss)
            this.summonCount = 0;
        }

        // Visual effects
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.particles = [];
        this.initializeParticles();
    }

    initializeMovement() {
        switch(this.movementPattern) {
            case MOVEMENT_PATTERNS.STRAIGHT:
                // Straight down with slight drift
                const drift = (Math.random() - 0.5) * 0.2;
                this.vx = drift * this.speed;
                this.vy = this.speed * 1.2;
                break;
            case MOVEMENT_PATTERNS.ZIGZAG:
                // Zigzag pattern
                this.vx = 0;
                this.vy = this.speed * 1.0;
                this.zigzagAmplitude = 2;
                this.zigzagFrequency = 0.05;
                break;
            case MOVEMENT_PATTERNS.DIAGONAL:
                // Diagonal descent
                const direction = Math.random() < 0.5 ? -1 : 1;
                this.vx = direction * this.speed * 0.6;
                this.vy = this.speed * 1.0;
                break;
            case MOVEMENT_PATTERNS.SPIRAL:
                // Spiral pattern
                this.vx = 0;
                this.vy = this.speed * 0.8;
                this.spiralRadius = 30;
                this.spiralSpeed = 0.03;
                this.spiralAngle = 0;
                break;
            default:
                this.vx = 0;
                this.vy = this.speed;
        }
    }

    updateEliteMovement() {
        if (this.eliteStateTimer === undefined) return;

        this.eliteStateTimer++;

        if (this.eliteState === 'stalk' && this.eliteStateTimer >= this.eliteTimeUntilRush) {
            this.eliteState = 'rush';
            this.eliteStateTimer = 0;
            this.speed = this.rushSpeed;
            this.eliteRushDuration = 75 + Math.floor(Math.random() * 60); // ~1.25 - 2.25 seconds
        } else if (this.eliteState === 'rush' && this.eliteStateTimer >= this.eliteRushDuration) {
            this.eliteState = 'stalk';
            this.eliteStateTimer = 0;
            this.speed = this.defaultSpeed;
            this.eliteTimeUntilRush = 210 + Math.floor(Math.random() * 180);
            this.eliteSide = Math.random() < 0.5 ? -1 : 1; // Switch drift direction
            this.eliteDriftStrength = 0.18 + Math.random() * 0.18;
        }

        const toShip = getDirectionVector(this.x, this.y, this.shipX, this.shipY);

        if (this.eliteState === 'stalk') {
            // Bias movement with a perpendicular component to create diagonal stalking
            const perpendicular = {
                x: -toShip.y,
                y: toShip.x
            };

            const forwardBias = 0.85;
            const bias = this.eliteDriftStrength * this.eliteSide;
            const combinedX = (toShip.x * forwardBias) + (perpendicular.x * bias);
            const combinedY = (toShip.y * forwardBias) + (perpendicular.y * bias);
            const mag = Math.sqrt(combinedX * combinedX + combinedY * combinedY) || 1;

            this.vx = (combinedX / mag) * this.defaultSpeed;
            this.vy = (combinedY / mag) * this.defaultSpeed;

            // Periodically flip drift to keep elites near the arena center
            if (this.eliteStateTimer % 180 === 0) {
                this.eliteSide *= -1;
            }

            if (this.x < 40 && this.eliteSide < 0) {
                this.eliteSide = 1;
            } else if (this.x > 760 && this.eliteSide > 0) {
                this.eliteSide = -1;
            }
        } else {
            // Rush: head directly for the ship at high speed
            this.vx = toShip.x * this.rushSpeed;
            this.vy = toShip.y * this.rushSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;
    }

    initializeParticles() {
        // Create particles for rare/elite/boss enemies
        const count = this.tierConfig.particleCount;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                angle: (Math.PI * 2 * i) / count,
                distance: this.radius * 1.2,
                speed: 0.02 + Math.random() * 0.02,
                size: 2 + Math.random() * 2
            });
        }
    }

    applyKnockback(bulletVx, bulletVy, strength = 8) {
        if (this.immuneToKnockback) {
            return;
        }
        // Calculate knockback direction (SAME as bullet direction - push away from ship)
        const knockbackDir = {
            x: bulletVx,  // Push in bullet direction (away from ship)
            y: bulletVy   // Push in bullet direction (away from ship)
        };

        // Normalize
        const mag = Math.sqrt(knockbackDir.x ** 2 + knockbackDir.y ** 2);
        if (mag > 0) {
            knockbackDir.x /= mag;
            knockbackDir.y /= mag;
        }

        // Apply knockback velocity
        this.knockbackVx = knockbackDir.x * strength;
        this.knockbackVy = knockbackDir.y * strength;
        this.isKnockedBack = true;

        // Visual feedback
        this.hitFlash = 15; // frames
    }

    update(shipX, shipY) {
        // Update ship position for tracking
        if (shipX !== undefined && shipY !== undefined) {
            this.shipX = shipX;
            this.shipY = shipY;
        }

        this.movementTimer++;

        // Elite summoning mechanic - summon NORMAL units only
        if (this.tier === 'ELITE' && this.summonCount < this.maxSummons) {
            this.summonTimer++;
            if (this.summonTimer >= this.summonInterval) {
                this.summonTimer = 0;
                this.summonCount++;
                // Return summon signal to game controller
                return { summon: true, position: { x: this.x, y: this.y }, summonerType: 'ELITE' };
            }
        }

        // Apply knockback if active
        if (this.isKnockedBack) {
            this.x += this.knockbackVx;
            this.y += this.knockbackVy;

            // Decay knockback over time
            this.knockbackVx *= this.knockbackDecay;
            this.knockbackVy *= this.knockbackDecay;

            // Stop knockback when velocity is very small
            if (Math.abs(this.knockbackVx) < 0.1 && Math.abs(this.knockbackVy) < 0.1) {
                this.knockbackVx = 0;
                this.knockbackVy = 0;
                this.isKnockedBack = false;
            }
        } else {
            if (this.manualMovement) {
                // Position updates handled externally (e.g., boss segments/core)
            } else if (this.tier === 'ELITE') {
                this.updateEliteMovement();
            } else {
                // Normal movement (only when not knocked back)
                // Apply movement pattern
                switch(this.movementPattern) {
                    case MOVEMENT_PATTERNS.STRAIGHT:
                        // Track ship position directly
                        const dir = getDirectionVector(this.x, this.y, this.shipX, this.shipY);
                        this.vx = dir.x * this.speed;
                        this.vy = dir.y * this.speed;
                        break;
                    case MOVEMENT_PATTERNS.ZIGZAG:
                        // Add horizontal sine wave while falling
                        this.vx = Math.sin(this.movementTimer * this.zigzagFrequency) * this.zigzagAmplitude;
                        this.vy = this.speed;
                        break;
                    case MOVEMENT_PATTERNS.DIAGONAL:
                        // Drift diagonally while steering toward the ship
                        const diagDir = getDirectionVector(this.x, this.y, this.shipX, this.shipY);
                        const targetVx = diagDir.x * this.speed;
                        const targetVy = diagDir.y * this.speed;
                        this.vx = (this.vx * 0.9) + targetVx * 0.1;
                        this.vy = (this.vy * 0.9) + targetVy * 0.1;

                        const diagMagnitude = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
                        const maxDiagSpeed = this.speed;
                        if (diagMagnitude > maxDiagSpeed) {
                            this.vx = (this.vx / diagMagnitude) * maxDiagSpeed;
                            this.vy = (this.vy / diagMagnitude) * maxDiagSpeed;
                        }
                        break;
                    case MOVEMENT_PATTERNS.SPIRAL:
                        // Circular motion while descending
                        this.spiralAngle += this.spiralSpeed;
                        const centerX = this.x - this.vx;
                        this.x = centerX + Math.cos(this.spiralAngle) * this.spiralRadius * 0.5;
                        this.vy = this.speed * 0.8;
                        break;
                }

                if (!this.manualMovement) {
                    this.x += this.vx;
                    this.y += this.vy;
                }
            }
        }

        // Update pulse phase for visual effects
        this.pulsePhase += 0.05;

        // Update particles
        for (let particle of this.particles) {
            particle.angle += particle.speed;
        }

        // Update hit flash
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }

        return null; // No summon
    }

    takeDamage(amount = 1) {
        this.currentHealth -= amount;
        return this.currentHealth <= 0; // Returns true if destroyed
    }

    addIncomingBullet() {
        this.incomingBullets++;
    }

    bulletHit() {
        this.bulletsHit++;
    }

    shouldDestroy() {
        // Destroy only if marked AND all bullets have hit
        return this.markedForDestruction &&
               this.incomingBullets > 0 &&
               this.bulletsHit >= this.incomingBullets;
    }

    resetTyping() {
        // Reset typing state for multi-hit enemies
        this.typedLetters = 0;
        this.isActive = false;
    }

    changeWord(newWord) {
        // Change the word to a new one (for ELITE enemies after taking damage)
        this.word = newWord.toLowerCase();
        this.typedLetters = 0;

        // Recalculate size for Elite if needed (size based on word length)
        if (this.tier === 'ELITE' && this.tierConfig.sizeMultiplier) {
            this.baseRadius = 15 + newWord.length * 1.5;
            this.radius = this.baseRadius * this.tierConfig.sizeMultiplier;
        }
    }

    draw(ctx) {
        ctx.save();

        // Spawn animation for boss-summoned enemies
        let spawnScale = 1.0;
        if (this.isSpawning && this.spawnStartTime) {
            const elapsed = Date.now() - this.spawnStartTime;
            const progress = Math.min(1, elapsed / this.spawnDuration);

            // Ease-out cubic for smooth spawn
            spawnScale = 1 - Math.pow(1 - progress, 3);

            if (progress >= 1) {
                this.isSpawning = false;
                this.spawnStartTime = null;
            }
        }

        // Draw particles for rare/elite/boss
        if (this.particles.length > 0) {
            this.drawParticles(ctx);
        }

        // Pulsing effect for elite
        let pulseScale = 1.0;
        if (this.tier === 'ELITE') {
            pulseScale = 1.0 + Math.sin(this.pulsePhase) * 0.1;
        }

        // Boss core shrinking effect based on health
        let healthScale = 1.0;
        if (this.isBossCore && this.maxHealth > 1) {
            const healthPercent = this.currentHealth / this.maxHealth;
            // Scale from 1.0 (full health) to 0.4 (near death)
            healthScale = 0.4 + (healthPercent * 0.6);
        }

        const currentRadius = this.radius * pulseScale * healthScale * spawnScale;

        // Spawn animation glow effect
        if (this.isSpawning && spawnScale < 1) {
            ctx.save();
            ctx.globalAlpha = (1 - spawnScale) * 0.6;
            ctx.fillStyle = 'rgba(120, 30, 30, 0.8)';
            ctx.shadowColor = 'rgba(120, 30, 30, 0.9)';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius + 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Hit flash effect
        if (this.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.hitFlash / 15;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius + 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Glow effect
        if (this.isActive) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 15;
        } else if (this.tier !== 'NORMAL') {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.tier === 'ELITE' ? 12 : 8;
        }

        // Check if dark mode is active for color adjustment
        const isDark = document.body.classList.contains('dark-mode');

        // Draw asteroid circle with tier color (adjusted for dark mode)
        let fillColor = this.color;
        let strokeColor = this.isActive ? (isDark ? '#e0e0e0' : '#000') : this.glowColor;

        // Lighten asteroid colors in dark mode
        if (isDark) {
            if (this.tier === 'NORMAL') fillColor = '#999';
            else if (this.tier === 'RARE') fillColor = '#bbb';
            else if (this.tier === 'ELITE') fillColor = '#777';

            // Adjust glow colors for dark mode
            if (!this.isActive) {
                if (this.tier === 'NORMAL') strokeColor = '#ccc';
                else if (this.tier === 'RARE') strokeColor = '#ddd';
                else if (this.tier === 'ELITE') strokeColor = '#aaa';
            }
        }

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = this.tier === 'ELITE' ? 3 : 2;

        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw surface details (craters)
        ctx.shadowBlur = 0;
        ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.3)';
        const craterCount = 3;
        for (let i = 0; i < craterCount; i++) {
            const angle = (i / craterCount) * Math.PI * 2;
            const craterX = this.x + Math.cos(angle) * currentRadius * 0.4;
            const craterY = this.y + Math.sin(angle) * currentRadius * 0.4;
            ctx.beginPath();
            ctx.arc(craterX, craterY, currentRadius * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw health bar for multi-hit enemies
        if (this.maxHealth > 1) {
            this.drawHealthBar(ctx);
        }

        ctx.restore();

        // Draw word text
        this.drawWord(ctx);
    }

    drawParticles(ctx) {
        ctx.save();
        for (let particle of this.particles) {
            const px = this.x + Math.cos(particle.angle) * particle.distance;
            const py = this.y + Math.sin(particle.angle) * particle.distance;

            ctx.fillStyle = this.glowColor;
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(px, py, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawHealthBar(ctx) {
        const barWidth = this.radius * 2;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 15;

        ctx.save();
        ctx.shadowBlur = 0;

        // White background bar for high contrast
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health bar with black/white theme
        const healthPercent = this.currentHealth / this.maxHealth;
        // Black health bar with varying intensity based on health
        const intensity = Math.floor(healthPercent * 255);
        const healthColor = `rgb(${255 - intensity}, ${255 - intensity}, ${255 - intensity})`;
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * healthPercent, barHeight - 2);

        // Strong black border for definition
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.restore();
    }

    drawWord(ctx) {
        ctx.save();
        ctx.font = 'bold 16px Courier New';
        ctx.textBaseline = 'middle';

        // Measure text widths
        const fullWordWidth = ctx.measureText(this.word).width;
        const typedPart = this.word.substring(0, this.typedLetters);
        const remainingPart = this.word.substring(this.typedLetters);
        const typedWidth = this.typedLetters > 0 ? ctx.measureText(typedPart).width : 0;

        // Calculate starting X position (left side of the word, centered)
        const startX = this.x - fullWordWidth / 2;
        const textY = this.y + this.radius + 15;

        // Draw text background for readability - white background with border
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(
            startX - 4,
            this.y + this.radius + 5,
            fullWordWidth + 8,
            20
        );

        // Draw border around text
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            startX - 4,
            this.y + this.radius + 5,
            fullWordWidth + 8,
            20
        );

        // Check if dark mode is active
        const isDark = document.body.classList.contains('dark-mode');

        // Draw typed letters in muted color (left-aligned from startX)
        if (this.typedLetters > 0) {
            ctx.textAlign = 'left';
            ctx.fillStyle = isDark ? '#777' : '#bbb';
            ctx.fillText(typedPart, startX, textY);
        }

        // Draw remaining letters with high contrast (left-aligned after typed letters)
        if (remainingPart.length > 0) {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#000';
            ctx.fontWeight = 'bold';
            ctx.fillText(remainingPart, startX + typedWidth, textY);
        }

        ctx.restore();
    }

    getNextLetter() {
        if (this.typedLetters < this.word.length) {
            return this.word[this.typedLetters];
        }
        return null;
    }

    typeCorrectLetter() {
        this.typedLetters++;
        return this.isComplete();
    }

    isComplete() {
        return this.typedLetters >= this.word.length;
    }

    setActive(active) {
        this.isActive = active;
    }

    getDistanceToPoint(x, y) {
        return distance(this.x, this.y, x, y);
    }
}
