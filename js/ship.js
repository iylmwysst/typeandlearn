// Player ship class (fixed at bottom center of canvas)
class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseY = y; // Store original Y position
        this.size = 25;
        this.color = '#000';
        this.attackRange = 220; // Range for direct shots vs arc shots

        // Animation state
        this.idlePhase = 0;
        this.recoilAmount = 0;
        this.recoilDecay = 0.85;
        this.engineGlowPhase = 0;
    }

    update() {
        // Idle bobbing animation
        this.idlePhase += 0.04;
        const idleBob = Math.sin(this.idlePhase) * 1.5;
        this.y = this.baseY + idleBob;

        // Engine glow animation
        this.engineGlowPhase += 0.15;

        // Recoil decay
        if (this.recoilAmount > 0.1) {
            this.recoilAmount *= this.recoilDecay;
        } else {
            this.recoilAmount = 0;
        }
    }

    fireBullet(side = 'center') {
        // Trigger recoil
        this.recoilAmount = 3;
    }

    draw(ctx) {
        ctx.save();

        // Draw attack range indicator BEFORE translating to ship center
        this.drawRangeIndicator(ctx);

        // Now translate to ship position (with recoil)
        ctx.translate(this.x, this.y + this.recoilAmount);

        // Draw ship body with multiple layers
        this.drawShipBody(ctx);

        ctx.restore();
    }

    drawShipBody(ctx) {
        const s = this.size;

        // B2 Bomber style - Flying wing design with wide wingspan

        // Main flying wing body (wide triangular shape) - Medium gray base
        ctx.fillStyle = '#606060';
        ctx.strokeStyle = '#303030';
        ctx.lineWidth = 2;

        ctx.beginPath();
        // Center nose point
        ctx.moveTo(0, -s * 0.9);
        // Wide left wing
        ctx.lineTo(-s * 1.8, s * 0.2);
        ctx.lineTo(-s * 1.6, s * 0.6);
        // Left center
        ctx.lineTo(-s * 0.3, s * 0.5);
        // Center back (jagged trailing edge like B2)
        ctx.lineTo(0, s * 0.4);
        // Right center
        ctx.lineTo(s * 0.3, s * 0.5);
        // Wide right wing
        ctx.lineTo(s * 1.6, s * 0.6);
        ctx.lineTo(s * 1.8, s * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center body highlight (lighter gray gradient)
        const gradient = ctx.createLinearGradient(-s * 0.3, -s * 0.5, s * 0.3, s * 0.3);
        gradient.addColorStop(0, 'rgba(220, 220, 220, 0.9)');
        gradient.addColorStop(0.5, 'rgba(180, 180, 180, 0.7)');
        gradient.addColorStop(1, 'rgba(140, 140, 140, 0.4)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.8);
        ctx.lineTo(-s * 0.25, s * 0.3);
        ctx.lineTo(0, s * 0.35);
        ctx.lineTo(s * 0.25, s * 0.3);
        ctx.closePath();
        ctx.fill();

        // Wing edge highlights (white/light gray for definition)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;

        // Left wing leading edge
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.9);
        ctx.lineTo(-s * 1.8, s * 0.2);
        ctx.stroke();

        // Right wing leading edge
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.9);
        ctx.lineTo(s * 1.8, s * 0.2);
        ctx.stroke();

        // Cockpit (white with glow)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -s * 0.2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit glow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(0, -s * 0.2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -s * 0.2, 4, 0, Math.PI * 2);
        ctx.stroke();

        // Engine glow effect (two engines at rear) - brighter
        const engineGlow = Math.sin(this.engineGlowPhase) * 0.3 + 0.7;

        // Left engine glow
        ctx.fillStyle = `rgba(200, 200, 200, ${engineGlow * 0.8})`;
        ctx.beginPath();
        ctx.arc(-s * 0.15, s * 0.45, 3, 0, Math.PI * 2);
        ctx.fill();

        // Left engine outer glow
        ctx.fillStyle = `rgba(180, 180, 180, ${engineGlow * 0.4})`;
        ctx.beginPath();
        ctx.arc(-s * 0.15, s * 0.45, 5, 0, Math.PI * 2);
        ctx.fill();

        // Right engine glow
        ctx.fillStyle = `rgba(200, 200, 200, ${engineGlow * 0.8})`;
        ctx.beginPath();
        ctx.arc(s * 0.15, s * 0.45, 3, 0, Math.PI * 2);
        ctx.fill();

        // Right engine outer glow
        ctx.fillStyle = `rgba(180, 180, 180, ${engineGlow * 0.4})`;
        ctx.beginPath();
        ctx.arc(s * 0.15, s * 0.45, 5, 0, Math.PI * 2);
        ctx.fill();

        // Wing detail lines (panel lines like B2) - lighter
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 1;

        // Left wing panel line
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, -s * 0.1);
        ctx.lineTo(-s * 1.3, s * 0.3);
        ctx.stroke();

        // Right wing panel line
        ctx.beginPath();
        ctx.moveTo(s * 0.4, -s * 0.1);
        ctx.lineTo(s * 1.3, s * 0.3);
        ctx.stroke();

        // Inner detail - lighter gray
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.5);
        ctx.lineTo(-s * 0.2, s * 0.1);
        ctx.lineTo(s * 0.2, s * 0.1);
        ctx.closePath();
        ctx.fill();

        // Add white accent on nose
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.9);
        ctx.lineTo(-s * 0.1, -s * 0.6);
        ctx.lineTo(s * 0.1, -s * 0.6);
        ctx.closePath();
        ctx.fill();
    }

    drawRangeIndicator(ctx) {
        ctx.save();

        // Draw circular range indicator
        const isDark = document.body.classList.contains('dark-mode');
        ctx.strokeStyle = isDark ? 'rgba(200, 200, 200, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line pattern

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]); // Reset dash pattern
        ctx.restore();
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }
}
