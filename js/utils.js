// Vector and math utility functions

// Calculate distance between two points
function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Normalize a vector (make it unit length)
function normalize(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return {
        x: x / length,
        y: y / length
    };
}

// Scale a vector by a scalar
function scale(vector, scalar) {
    return {
        x: vector.x * scalar,
        y: vector.y * scalar
    };
}

// Circle-circle collision detection
function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dist = distance(x1, y1, x2, y2);
    return dist < (r1 + r2);
}

// Random number between min and max (inclusive)
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Random integer between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get random element from array
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Get random spawn position on canvas edge
function getRandomEdgePosition(canvasWidth, canvasHeight) {
    const edge = randomInt(0, 3); // 0=top, 1=right, 2=bottom, 3=left

    switch(edge) {
        case 0: // Top
            return { x: random(0, canvasWidth), y: -20 };
        case 1: // Right
            return { x: canvasWidth + 20, y: random(0, canvasHeight) };
        case 2: // Bottom
            return { x: random(0, canvasWidth), y: canvasHeight + 20 };
        case 3: // Left
            return { x: -20, y: random(0, canvasHeight) };
    }
}

// Calculate direction vector from point A to point B
function getDirectionVector(x1, y1, x2, y2) {
    return normalize(x2 - x1, y2 - y1);
}

// Linear interpolation
function lerp(start, end, t) {
    return start + (end - start) * t;
}
