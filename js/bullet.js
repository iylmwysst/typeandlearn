// Bullet class for visual effect when destroying asteroids
class Bullet {
    constructor(startX, startY, target, inRange, isSpecial = false) {
        this.target = target; // Reference to the target asteroid
        this.alive = true;
        this.hasHit = false;
        this.isTracking = true; // Enable homing behavior
        this.isSpecial = isSpecial; // Special power bullet flag
        this.knockbackStrength = isSpecial ? 1 : 0.6; // Reduced knockback by 80% for minimal bounce effect
        this.lifetime = 0; // Track how long bullet has been alive
        this.maxLifetime = 300; // 5 seconds at 60fps - plenty of time to catch targets

        // Trail effect
        this.trail = [];

        if (isSpecial) {
            // SPECIAL POWER BULLET
            this.mode = 'direct';
            this.color = '#000'; // Black color
            this.radius = 5; // Bigger than normal (normal is 3)
            this.speed = 12; // Faster than normal
            this.glowIntensity = 15; // Moderate glow
            this.trailColor = '#333'; // Dark gray trail
            this.particleCount = 8; // More particles
            this.maxTrailLength = 16; // Longer trail
            this.homingStrength = 0.3; // Stronger homing

            // Always direct shot for power bullets
            this.x = startX;
            this.y = startY;
            const dir = getDirectionVector(startX, startY, target.x, target.y);
            this.vx = dir.x * this.speed;
            this.vy = dir.y * this.speed;
        } else {
            // NORMAL BULLET
            this.speed = 10; // Increased from 8 to better catch moving targets
            this.radius = 3;
            this.homingStrength = 0.35; // Increased from 0.25 for better tracking
            this.maxTrailLength = 12; // Slightly longer trail to show curve

            // RANGE-BASED BEHAVIOR
            this.inRange = inRange;

            if (inRange) {
                // DIRECT SHOT: Fire straight from ship center
                this.mode = 'direct';
                this.x = startX; // Fire from center
                this.y = startY;
                this.color = '#000'; // Black
                this.side = 0; // No side offset

                // Calculate direct vector to target
                const direction = getDirectionVector(startX, startY, target.x, target.y);
                this.vx = direction.x * this.speed;
                this.vy = direction.y * this.speed;
            } else {
                // ARC SHOT: Fire from side with delayed homing
                this.mode = 'arc';
                this.side = Math.random() < 0.5 ? -1 : 1; // -1 = left, 1 = right
                const sideOffset = 25; // 25px from ship center
                this.x = startX + (this.side * sideOffset);
                this.y = startY;
                this.color = '#333'; // Dark gray

                // Initial velocity is to the side (perpendicular to target)
                this.vx = this.side * this.speed; // Fire sideways
                this.vy = -this.speed * 0.5; // Slight upward

                // Random delay before homing starts (0.1-0.3 seconds at 60fps)
                // 6-18 frames = 0.1-0.3 seconds
                this.homingDelay = 6 + Math.floor(Math.random() * 13); // 6 to 18 frames
                this.homingTimer = 0;

                // Arc trajectory properties
                this.arcStrength = 0.3; // Lateral force for arc effect
                this.arcPhase = 0; // Track arc progression
            }
        }
    }

    update() {
        // Increment lifetime
        this.lifetime++;

        // Store previous position for trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        if (this.mode === 'direct') {
            // DIRECT MODE: Straight shot with immediate homing
            if (this.target && this.isTracking) {
                // Calculate direction to target's current position (track even if off-screen)
                const targetDir = getDirectionVector(this.x, this.y, this.target.x, this.target.y);

                // Desired velocity toward target
                const desiredVx = targetDir.x * this.speed;
                const desiredVy = targetDir.y * this.speed;

                // Smoothly blend current velocity with desired velocity for curved homing
                this.vx += (desiredVx - this.vx) * this.homingStrength;
                this.vy += (desiredVy - this.vy) * this.homingStrength;

                // Maintain consistent speed
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (currentSpeed > 0) {
                    this.vx = (this.vx / currentSpeed) * this.speed;
                    this.vy = (this.vy / currentSpeed) * this.speed;
                }
            }
        } else if (this.mode === 'arc') {
            // ARC MODE: Delay homing for 0.3 seconds
            this.homingTimer++;

            if (this.homingTimer < this.homingDelay) {
                // Phase 1: Fire to the side (no homing)
                // Just move with initial velocity (already set in constructor)
                // No homing applied yet
            } else {
                // Phase 2: After delay, start homing with arc effect
                if (this.target && this.isTracking) {
                    // Arc trajectory: Create parabolic curve (track even if off-screen)
                    this.arcPhase += 0.15; // Increment arc phase

                    // Calculate direction to target's current position
                    const targetDir = getDirectionVector(this.x, this.y, this.target.x, this.target.y);

                    // Desired velocity toward target
                    const desiredVx = targetDir.x * this.speed;
                    const desiredVy = targetDir.y * this.speed;

                    // Smoothly blend current velocity with desired velocity for curved homing
                    this.vx += (desiredVx - this.vx) * this.homingStrength;
                    this.vy += (desiredVy - this.vy) * this.homingStrength;

                    // Apply arc effect: Curve outward first, then inward toward target
                    // Use sine wave to create smooth arc (peaks early, then decreases)
                    const arcEffect = Math.sin(this.arcPhase) * this.arcStrength;
                    this.vx += this.side * arcEffect;

                    // Maintain consistent speed
                    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                    if (currentSpeed > 0) {
                        this.vx = (this.vx / currentSpeed) * this.speed;
                        this.vy = (this.vy / currentSpeed) * this.speed;
                    }
                }
            }
        }

        // Move bullet
        this.x += this.vx;
        this.y += this.vy;

        // Check collision with target asteroid
        if (this.target && !this.hasHit) {
            const dist = distance(this.x, this.y, this.target.x, this.target.y);
            if (dist < this.target.radius + this.radius) {
                this.hasHit = true;
                this.alive = false;
                // Return hit info with bullet velocity for knockback
                return {
                    hit: true,
                    bulletVx: this.vx,
                    bulletVy: this.vy,
                    knockbackStrength: this.knockbackStrength
                };
            }
        }

        // Remove if timeout exceeded
        if (this.lifetime > this.maxLifetime) {
            this.alive = false;
        }

        // Remove if way too far off screen (200px buffer to allow tracking off-screen targets)
        if (this.x < -200 || this.x > 1000 || this.y < -200 || this.y > 800) {
            this.alive = false;
        }

        // If target was destroyed before we hit it, remove bullet
        if (this.target && this.target.currentHealth !== undefined && this.target.currentHealth <= 0) {
            this.alive = false;
        }

        return { hit: false }; // No hit
    }

    draw(ctx) {
        // Detect dark mode for adaptive colors
        const isDarkMode = document.body.classList.contains('dark-mode');

        if (this.isSpecial) {
            // SPECIAL BULLET RENDERING
            ctx.save();

            // Enhanced trail - thicker and brighter (adapt to dark mode)
            const baseTrailColor = this.trailColor || this.color;
            const trailColor = isDarkMode ? '#f0f0f0' : baseTrailColor;
            ctx.strokeStyle = trailColor;
            ctx.lineWidth = 3;

            for (let i = 0; i < this.trail.length - 1; i++) {
                const baseAlpha = (i / this.trail.length) * 0.8;
                const alpha = isDarkMode ? Math.min(1, baseAlpha * 2) : baseAlpha;  // Double alpha in dark mode
                ctx.globalAlpha = alpha;
                ctx.shadowColor = trailColor;
                ctx.shadowBlur = isDarkMode ? 20 : 15;
                ctx.beginPath();
                ctx.moveTo(this.trail[i].x, this.trail[i].y);
                ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
                ctx.stroke();
            }

            // Outer glow
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 12;
            ctx.shadowColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';

            // Main bullet - larger circle (adapt to dark mode)
            ctx.fillStyle = isDarkMode ? '#f0f0f0' : this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner core - white center
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 8;
            ctx.shadowColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Particle ring around bullet (rotating)
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = isDarkMode ? '#ddd' : '#666';
            ctx.shadowBlur = 4;
            const particleAngle = Date.now() * 0.005;
            for (let i = 0; i < 6; i++) {
                const angle = particleAngle + (i * Math.PI * 2 / 6);
                const px = this.x + Math.cos(angle) * this.radius * 1.5;
                const py = this.y + Math.sin(angle) * this.radius * 1.5;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        } else {
            // NORMAL BULLET RENDERING
            ctx.save();

            // Different visual styles for direct vs arc shots
            const isDirect = this.mode === 'direct';
            const trailBrightness = isDirect ? 1.2 : 0.8; // Direct shots are brighter
            const shadowBlur = isDirect ? 18 : 12; // Direct shots have more glow

            // Adapt colors for dark mode
            const bulletColor = isDarkMode
                ? (isDirect ? '#f0f0f0' : '#e0e0e0')  // Very light colors for dark mode
                : this.color;                          // Original dark colors for light mode

            // Enhanced trail
            ctx.strokeStyle = bulletColor;
            ctx.lineWidth = isDirect ? 2.5 : 2; // Direct shots have thicker trails

            for (let i = 0; i < this.trail.length - 1; i++) {
                const baseAlpha = (i / this.trail.length) * 0.6 * trailBrightness;
                const alpha = isDarkMode ? Math.min(1, baseAlpha * 2.5) : baseAlpha;  // Much brighter in dark mode
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = isDarkMode ? (isDirect ? 15 : 10) : 0;
                ctx.shadowColor = isDarkMode ? bulletColor : 'transparent';
                ctx.beginPath();
                ctx.moveTo(this.trail[i].x, this.trail[i].y);
                ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
                ctx.stroke();
            }

            // Draw bullet with enhanced glow
            ctx.globalAlpha = 1;
            ctx.fillStyle = bulletColor;
            ctx.shadowColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = isDirect ? 8 : 6;

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw inner glow (brighter for direct shots)
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = isDirect ? 6 : 4;
            ctx.shadowColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Optional: Draw targeting line to show homing (only for direct shots or arc shots after homing starts)
            const showTargetLine = this.isTracking && this.target &&
                                 (isDirect || (this.mode === 'arc' && this.homingTimer >= this.homingDelay));

            if (showTargetLine) {
                ctx.globalAlpha = isDirect ? 0.2 : 0.1; // Direct shots have more visible line
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.target.x, this.target.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.restore();
        }
    }

    isAlive() {
        return this.alive;
    }
}

// Explosion effect when asteroid is destroyed
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.alive = true;
        this.maxAge = 30; // frames
        this.age = 0;

        // Create particles
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 * i) / 15;
            const speed = random(2, 5);
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: random(2, 4),
                color: randomElement(['#000', '#333', '#666', '#999'])
            });
        }
    }

    update() {
        this.age++;
        if (this.age > this.maxAge) {
            this.alive = false;
        }

        // Update particles
        for (let particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.95; // Friction
            particle.vy *= 0.95;
        }
    }

    draw(ctx) {
        ctx.save();
        const alpha = 1 - (this.age / this.maxAge);

        for (let particle of this.particles) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    isAlive() {
        return this.alive;
    }
}
