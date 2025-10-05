const MENU_EASTER_EGG_WORDS = "if you love me won't you say something".split(' ');

// Main game logic and loop
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Sound Manager
        this.soundManager = new SoundManager();

        // Game state
        this.state = 'menu'; // menu, vocabularySelection, vocabularyManagement, waiting, playing, paused, gameOver
        this.score = 0;
        this.started = false;

        // Level transition system
        this.showLevelMessage = false;
        this.levelMessageStartTime = 0;
        this.levelMessageDuration = 3000; // 3 seconds for gradual fade
        this.waitingForExplosions = false; // Wait for last enemy explosion to finish
        this.waitingForBossMinions = false; // Wait for boss-summoned minions to be cleared

        // Time-based level duration
        this.levelStartTime = 0;
        this.levelDuration = 30000; // 30 seconds per level
        this.levelTimeExpired = false;
        this.waitingForClear = false; // True when time expired, waiting for enemies to clear

        // Game entities
        this.ship = new Ship(this.width / 2, this.height - 50); // Bottom center position
        this.asteroids = [];
        this.bullets = [];
        this.explosions = [];
        this.effects = []; // For special power activation effects
        this.particles = []; // For impact particles

        // Background asteroids for menu
        this.backgroundAsteroids = [];
        this.menuWordIndex = 0;
        this.initializeBackgroundAsteroids();

        // Power Stack System
        this.powerStacks = 3;
        this.maxPowerStacks = 3;

        // Gauge System
        this.gauge = 0; // Current gauge value
        this.maxGauge = 50; // Number of words needed to fill gauge
        this.gaugeAnimations = []; // Array of gauge change animations

        // Shield system
        this.hasShield = false;
        this.shieldActivatedAt = 0;

        // Active word tracking
        this.activeAsteroid = null;
        this.targetLockFadeIn = null; // Stores fade-in animation state
        this.targetLockFadeOut = null; // Stores fade-out animation state

        // Spawning
        this.spawnTimer = 0;
        this.spawnInterval = 135; // Placeholder, recalculated per level pacing
        this.maxAsteroids = 8;
        this.nextSpawnAllowedTime = 0; // Timestamp gate for delayed spawns

        // Difficulty
        this.level = 1;
        this.asteroidsDestroyed = 0;

        // Progressive difficulty - word length tracking
        this.wordsCompleted = 0;
        this.currentMinWordLength = 3;
        this.currentMaxWordLength = 4; // Start very easy with 3-4 letter words
        this.wordsPerMinuteTarget = 12;
        this.bossActive = false;
        this.bossData = null;
        this.pendingBossSpawn = false;

        // Pause button (top left)
        this.pauseButton = {
            x: 30,
            y: 30,
            radius: 18
        };

        // Resume button (shown when paused)
        this.resumeButton = {
            x: this.width / 2 - 100,
            y: this.height / 2 + 100,
            width: 140,
            height: 45
        };

        // Return to menu button (shown when paused)
        this.returnToMenuButton = {
            x: this.width / 2 + 100,
            y: this.height / 2 + 100,
            width: 180,
            height: 45
        };

        // Mute button (top right)
        this.muteButton = {
            x: this.width - 30,
            y: 30,
            radius: 18
        };
        this.isMuted = false;

        // Quick Snap overlay
        this.quickSnapVisible = false;

        // Play button (center of screen, for menu)
        this.playButton = {
            x: this.width / 2,
            y: this.height / 2 + 80,
            width: 200,
            height: 60
        };

        // Manage vocabulary button
        this.manageVocabButton = {
            x: this.width / 2,
            y: this.height / 2 + 160,
            width: 200,
            height: 50
        };

        // Vocabulary selection
        this.selectedVocabulary = 'everyday'; // 'everyday', 'ing-verbs', or 'custom'
        this.vocabularyButtons = {
            everyday: {
                x: this.width / 2 - 110,
                y: this.height / 2 + 20,
                width: 200,
                height: 40
            },
            ingVerbs: {
                x: this.width / 2 + 110,
                y: this.height / 2 + 20,
                width: 200,
                height: 40
            },
            custom: {
                x: this.width / 2,
                y: this.height / 2 + 75,
                width: 200,
                height: 40
            }
        };

        // Confirm vocabulary button
        this.confirmButton = {
            x: this.width / 2,
            y: this.height / 2 + 140,
            width: 200,
            height: 50
        };

        // Back button for vocabulary selection (shares pause button position)
        this.vocabularyBackButton = {
            x: this.pauseButton.x,
            y: this.pauseButton.y,
            radius: this.pauseButton.radius
        };

        // Custom vocabulary management
        this.customVocabulary = this.loadCustomVocabulary();
        this.vocabManagementScroll = 0; // Scroll position for vocabulary list
        this.vocabInputWord = ''; // Current word input
        this.vocabInputThai = ''; // Current Thai translation input
        this.vocabEditingIndex = -1; // Index of word being edited (-1 = none)
        this.vocabHoveredRow = -1; // Index of row being hovered (-1 = none)

        // Pause countdown
        this.pauseStartTime = 0;
        this.pauseCountdownDuration = 3000; // 3 seconds
        this.showPauseCountdown = false; // True when countdown is active

        // Pause time tracking for level timer
        this.totalPausedTime = 0; // Accumulated time spent paused
        this.currentPauseStartTime = 0; // When current pause began

        // Recalculate difficulty metrics for initial level
        this.updateLevelDifficultyMetrics();

        // Bind keyboard and mouse events
        this.setupEventListeners();

        // Start game loop
        this.lastTime = 0;
        this.gameLoop();
    }

    isDarkMode() {
        return document.body.classList.contains('dark-mode');
    }

    // Custom vocabulary localStorage methods
    loadCustomVocabulary() {
        try {
            const saved = localStorage.getItem('customVocabulary');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading custom vocabulary:', error);
            return [];
        }
    }

    saveCustomVocabulary() {
        try {
            localStorage.setItem('customVocabulary', JSON.stringify(this.customVocabulary));
            console.log(`Saved ${this.customVocabulary.length} custom vocabulary entries`);
        } catch (error) {
            console.error('Error saving custom vocabulary:', error);
        }
    }

    addCustomVocabEntry(word, thai) {
        if (!word || !thai) return false;

        // Check for duplicates
        const wordLower = word.toLowerCase();
        const exists = this.customVocabulary.some(entry => entry.word.toLowerCase() === wordLower);
        if (exists) return false;

        this.customVocabulary.push({ word: word.trim(), thai: thai.trim() });
        this.saveCustomVocabulary();
        return true;
    }

    deleteCustomVocabEntry(index) {
        if (index >= 0 && index < this.customVocabulary.length) {
            this.customVocabulary.splice(index, 1);
            this.saveCustomVocabulary();
        }
    }

    updateCustomVocabEntry(index, word, thai) {
        if (index >= 0 && index < this.customVocabulary.length && word && thai) {
            this.customVocabulary[index] = { word: word.trim(), thai: thai.trim() };
            this.saveCustomVocabulary();
        }
    }

    exportCustomVocabulary() {
        if (this.customVocabulary.length === 0) {
            alert('No custom vocabulary to export!');
            return;
        }

        // Create CSV content
        let csvContent = 'word,thai\n';
        this.customVocabulary.forEach(entry => {
            csvContent += `${entry.word},${entry.thai}\n`;
        });

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `custom-vocabulary-${date}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    importCustomVocabulary(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const lines = csvText.trim().split('\n');

                // Validate header
                if (lines.length < 2) {
                    alert('CSV file is empty or invalid!');
                    return;
                }

                const header = lines[0].toLowerCase().trim();
                if (!header.includes('word') || !header.includes('thai')) {
                    alert('Invalid CSV format! Header must be "word,thai"');
                    return;
                }

                // Parse entries
                const newEntries = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const word = parts[0].trim();
                        const thai = parts[1].trim();
                        if (word && thai) {
                            newEntries.push({ word, thai });
                        }
                    }
                }

                if (newEntries.length === 0) {
                    alert('No valid entries found in CSV!');
                    return;
                }

                // Ask user: replace or merge
                const replace = confirm(`Import ${newEntries.length} entries.\n\nOK = Replace existing vocabulary\nCancel = Merge with existing`);

                if (replace) {
                    this.customVocabulary = newEntries;
                } else {
                    // Merge, avoiding duplicates
                    const existingWords = new Set(this.customVocabulary.map(e => e.word.toLowerCase()));
                    newEntries.forEach(entry => {
                        if (!existingWords.has(entry.word.toLowerCase())) {
                            this.customVocabulary.push(entry);
                        }
                    });
                }

                this.saveCustomVocabulary();
                alert(`Successfully imported ${newEntries.length} entries!`);
            } catch (error) {
                console.error('Error importing vocabulary:', error);
                alert('Error importing CSV file!');
            }
        };

        reader.readAsText(file);
    }

    initializeBackgroundAsteroids() {
        // Create 3-5 decorative asteroids for the menu background
        const count = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < count; i++) {
            const word = this.getMenuWord();

            // Random tier for visual variety (70% normal, 25% rare, 5% elite)
            const roll = Math.random();
            let tier = 'NORMAL';
            if (roll > 0.95) tier = 'ELITE';
            else if (roll > 0.70) tier = 'RARE';

            // Spawn off-screen and move along periphery to adjacent edge
            // Pick a random edge and move to an adjacent edge (not opposite)
            const edge = Math.floor(Math.random() * 4);
            let x, y, targetX, targetY;

            // Random progress along the path (0 to 0.5) so some start closer to visible area
            const progressRatio = Math.random() * 0.5;

            switch(edge) {
                case 0: // Top edge -> move to left or right edge
                    const startX0 = Math.random() * this.width;
                    const startY0 = -100;
                    if (Math.random() < 0.5) {
                        // Move to left edge
                        targetX = -100;
                        targetY = Math.random() * this.height * 0.6;
                        x = startX0 + (targetX - startX0) * progressRatio;
                        y = startY0 + (targetY - startY0) * progressRatio;
                    } else {
                        // Move to right edge
                        targetX = this.width + 100;
                        targetY = Math.random() * this.height * 0.6;
                        x = startX0 + (targetX - startX0) * progressRatio;
                        y = startY0 + (targetY - startY0) * progressRatio;
                    }
                    break;
                case 1: // Bottom edge -> move to left or right edge
                    const startX1 = Math.random() * this.width;
                    const startY1 = this.height + 100;
                    if (Math.random() < 0.5) {
                        // Move to left edge
                        targetX = -100;
                        targetY = this.height * 0.4 + Math.random() * this.height * 0.6;
                        x = startX1 + (targetX - startX1) * progressRatio;
                        y = startY1 + (targetY - startY1) * progressRatio;
                    } else {
                        // Move to right edge
                        targetX = this.width + 100;
                        targetY = this.height * 0.4 + Math.random() * this.height * 0.6;
                        x = startX1 + (targetX - startX1) * progressRatio;
                        y = startY1 + (targetY - startY1) * progressRatio;
                    }
                    break;
                case 2: // Left edge -> move to top or bottom edge
                    const startX2 = -100;
                    const startY2 = Math.random() * this.height;
                    if (Math.random() < 0.5) {
                        // Move to top edge
                        targetX = Math.random() * this.width * 0.6;
                        targetY = -100;
                        x = startX2 + (targetX - startX2) * progressRatio;
                        y = startY2 + (targetY - startY2) * progressRatio;
                    } else {
                        // Move to bottom edge
                        targetX = Math.random() * this.width * 0.6;
                        targetY = this.height + 100;
                        x = startX2 + (targetX - startX2) * progressRatio;
                        y = startY2 + (targetY - startY2) * progressRatio;
                    }
                    break;
                case 3: // Right edge -> move to top or bottom edge
                    const startX3 = this.width + 100;
                    const startY3 = Math.random() * this.height;
                    if (Math.random() < 0.5) {
                        // Move to top edge
                        targetX = this.width * 0.4 + Math.random() * this.width * 0.6;
                        targetY = -100;
                        x = startX3 + (targetX - startX3) * progressRatio;
                        y = startY3 + (targetY - startY3) * progressRatio;
                    } else {
                        // Move to bottom edge
                        targetX = this.width * 0.4 + Math.random() * this.width * 0.6;
                        targetY = this.height + 100;
                        x = startX3 + (targetX - startX3) * progressRatio;
                        y = startY3 + (targetY - startY3) * progressRatio;
                    }
                    break;
            }

            // Use straight movement pattern only
            const asteroid = new Asteroid(x, y, targetX, targetY, word, tier, MOVEMENT_PATTERNS.STRAIGHT);

            // Slow down for background effect
            asteroid.speed *= 0.3; // Much slower movement
            asteroid.vx *= 0.3;
            asteroid.vy *= 0.3;
            asteroid.backgroundAsteroid = true; // Mark as decorative
            asteroid.backgroundTarget = { x: targetX, y: targetY }; // Store target for respawning

            this.backgroundAsteroids.push(asteroid);
        }
    }

    getMenuWord() {
        const word = MENU_EASTER_EGG_WORDS[this.menuWordIndex % MENU_EASTER_EGG_WORDS.length];
        this.menuWordIndex += 1;
        return word;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
            // Show Quick Snap on spacebar hold
            if (e.code === 'Space' && this.state === 'playing') {
                this.showQuickSnap();
            }
        });

        document.addEventListener('keyup', (e) => {
            // Hide Quick Snap on spacebar release
            if (e.code === 'Space' && this.state === 'playing') {
                this.hideQuickSnap();
            }
        });

        // Mouse click for pause button
        this.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });
    }

    handleKeyPress(e) {
        const key = e.key.toLowerCase();

        // Ignore key presses on menu screen and vocabulary selection (must click buttons)
        if (this.state === 'menu' || this.state === 'vocabularySelection') {
            return;
        }

        // Start game on any key press when waiting
        if (this.state === 'waiting') {
            e.preventDefault();
            this.startGame();
            return;
        }

        // Restart game on 'R' when game over
        if (this.state === 'gameOver' && key === 'r') {
            e.preventDefault();
            this.resetGame();
            this.startGame();
            return;
        }

        // Return to menu on Escape when game over
        if (this.state === 'gameOver' && key === 'escape') {
            e.preventDefault();
            this.resetGame();
            this.state = 'menu';
            return;
        }

        // Pause/unpause on Escape
        if (key === 'escape') {
            e.preventDefault();
            if (this.state === 'playing') {
                this.pauseGame();
            } else if (this.state === 'paused') {
                this.unpauseGame();
            }
            return;
        }

        // Ignore if not playing
        if (this.state !== 'playing') return;

        // Special power activation with ENTER
        if (key === 'enter') {
            e.preventDefault();
            this.activateSpecialPower();
            return;
        }

        // Only process letter keys
        if (key.length !== 1 || !key.match(/[a-z]/)) return;

        // Prevent default for letter keys during gameplay
        e.preventDefault();

        // If no active asteroid, try to activate one starting with this letter
        if (!this.activeAsteroid) {
            this.activateAsteroidWithLetter(key);
        } else {
            // Check if key matches next letter of active asteroid
            const nextLetter = this.activeAsteroid.getNextLetter();
            if (nextLetter === key) {
                const isComplete = this.activeAsteroid.typeCorrectLetter();

                // FIRE BULLET ON EACH LETTER (not just completion)
                this.fireBulletAtAsteroid(this.activeAsteroid);
                this.activeAsteroid.addIncomingBullet();

                if (isComplete) {
                    // Word complete - mark asteroid for destruction
                    // Bullet will apply knockback, but we only destroy when ALL bullets hit
                    this.activeAsteroid.setActive(false);
                    this.activeAsteroid.markedForDestruction = true;
                    this.triggerTargetLockFadeOut();
                    this.activeAsteroid = null;
                }
            }
            // Wrong letter - could add penalty here
        }
    }

    activateAsteroidWithLetter(letter) {
        // Find asteroids that start with this letter
        const matchingAsteroids = this.asteroids.filter(
            asteroid => asteroid.word[0] === letter && asteroid.typedLetters === 0
        );

        if (matchingAsteroids.length > 0) {
            // Choose closest one to ship
            let closest = matchingAsteroids[0];
            let minDist = closest.getDistanceToPoint(this.ship.x, this.ship.y);

            for (let asteroid of matchingAsteroids) {
                const dist = asteroid.getDistanceToPoint(this.ship.x, this.ship.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = asteroid;
                }
            }

            this.activeAsteroid = closest;
            this.activeAsteroid.setActive(true);
            this.triggerTargetLockFadeIn();
            const isComplete = this.activeAsteroid.typeCorrectLetter(); // Type the first letter

            // FIRE BULLET ON FIRST LETTER
            this.fireBulletAtAsteroid(this.activeAsteroid);
            this.activeAsteroid.addIncomingBullet();

            // Check if one-letter word
            if (isComplete) {
                this.activeAsteroid.setActive(false);
                this.activeAsteroid.markedForDestruction = true;
                this.triggerTargetLockFadeOut();
                this.activeAsteroid = null;
            }
        }
    }

    fireBulletAtAsteroid(asteroid) {
        // Calculate distance from ship to target asteroid
        const dist = distance(this.ship.x, this.ship.y, asteroid.x, asteroid.y);
        const inRange = dist <= this.ship.attackRange;

        // Determine which side to fire from
        let side = 'center';
        if (inRange) {
            side = 'center';
        } else {
            side = Math.random() < 0.5 ? 'left' : 'right';
        }

        // Trigger ship firing animation and effects
        this.ship.fireBullet(side);
        if (typeof this.soundManager.playBulletFire === 'function') {
            this.soundManager.playBulletFire();
        }

        // Create bullet with range-based behavior (not a special bullet)
        const bullet = new Bullet(this.ship.x, this.ship.y, asteroid, inRange, false);
        this.bullets.push(bullet);
    }

    triggerTargetLockFadeIn() {
        // Start fade-in animation
        this.targetLockFadeIn = {
            startTime: Date.now(),
            duration: 300 // 300ms fade-in (faster than fade-out)
        };
    }

    triggerTargetLockFadeOut() {
        if (!this.activeAsteroid) return;

        // Cancel any ongoing fade-in
        this.targetLockFadeIn = null;

        // Store position and radius for fade-out animation
        this.targetLockFadeOut = {
            x: this.activeAsteroid.x,
            y: this.activeAsteroid.y,
            radius: this.activeAsteroid.radius,
            startTime: Date.now(),
            duration: 500 // 500ms fade-out
        };
    }

    handleClick(e) {
        // Get click position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check if click is on vocabulary selection buttons (vocabularySelection state only)
        if (this.state === 'vocabularySelection') {
            const backBtn = this.vocabularyBackButton;
            const backDist = Math.sqrt(
                Math.pow(clickX - backBtn.x, 2) +
                Math.pow(clickY - backBtn.y, 2)
            );
            if (backDist <= backBtn.radius) {
                this.soundManager.playButtonSound();
                this.state = 'menu';
                return;
            }

            const everydayBtn = this.vocabularyButtons.everyday;
            if (clickX >= everydayBtn.x - everydayBtn.width / 2 &&
                clickX <= everydayBtn.x + everydayBtn.width / 2 &&
                clickY >= everydayBtn.y - everydayBtn.height / 2 &&
                clickY <= everydayBtn.y + everydayBtn.height / 2) {
                this.soundManager.playButtonSound();
                this.selectedVocabulary = 'everyday';
                return;
            }

            const ingBtn = this.vocabularyButtons.ingVerbs;
            if (clickX >= ingBtn.x - ingBtn.width / 2 &&
                clickX <= ingBtn.x + ingBtn.width / 2 &&
                clickY >= ingBtn.y - ingBtn.height / 2 &&
                clickY <= ingBtn.y + ingBtn.height / 2) {
                this.soundManager.playButtonSound();
                this.selectedVocabulary = 'ing-verbs';
                return;
            }

            const customBtn = this.vocabularyButtons.custom;
            if (clickX >= customBtn.x - customBtn.width / 2 &&
                clickX <= customBtn.x + customBtn.width / 2 &&
                clickY >= customBtn.y - customBtn.height / 2 &&
                clickY <= customBtn.y + customBtn.height / 2) {
                if (this.customVocabulary.length > 0) {
                    this.soundManager.playButtonSound();
                    this.selectedVocabulary = 'custom';
                }
                return;
            }

            // Check if click is on confirm button
            const confirmBtn = this.confirmButton;
            if (clickX >= confirmBtn.x - confirmBtn.width / 2 &&
                clickX <= confirmBtn.x + confirmBtn.width / 2 &&
                clickY >= confirmBtn.y - confirmBtn.height / 2 &&
                clickY <= confirmBtn.y + confirmBtn.height / 2) {
                this.soundManager.playButtonSound();
                this.loadAndStartGame();
                return;
            }
        }

        // Check if click is on play button (menu state only)
        if (this.state === 'menu') {
            const playBtn = this.playButton;
            if (clickX >= playBtn.x - playBtn.width / 2 &&
                clickX <= playBtn.x + playBtn.width / 2 &&
                clickY >= playBtn.y - playBtn.height / 2 &&
                clickY <= playBtn.y + playBtn.height / 2) {
                this.soundManager.playButtonSound();
                this.state = 'vocabularySelection';
                return;
            }

            const manageBtn = this.manageVocabButton;
            if (clickX >= manageBtn.x - manageBtn.width / 2 &&
                clickX <= manageBtn.x + manageBtn.width / 2 &&
                clickY >= manageBtn.y - manageBtn.height / 2 &&
                clickY <= manageBtn.y + manageBtn.height / 2) {
                this.soundManager.playButtonSound();
                this.state = 'vocabularyManagement';
                this.vocabInputWord = '';
                this.vocabInputThai = '';
                this.vocabEditingIndex = -1;
                return;
            }
        }

        // Check if click is on mute button
        const muteDist = Math.sqrt(
            Math.pow(clickX - this.muteButton.x, 2) +
            Math.pow(clickY - this.muteButton.y, 2)
        );

        if (muteDist <= this.muteButton.radius) {
            this.toggleMute();
            return;
        }

        // Check if click is on pause button
        const pauseDist = Math.sqrt(
            Math.pow(clickX - this.pauseButton.x, 2) +
            Math.pow(clickY - this.pauseButton.y, 2)
        );

        if (pauseDist <= this.pauseButton.radius) {
            // Toggle pause
            if (this.state === 'playing') {
                this.pauseGame();
            } else if (this.state === 'paused') {
                this.unpauseGame();
            }
        }

        // Check if click is on resume button (when paused)
        if (this.state === 'paused' && !this.showPauseCountdown) {
            const resumeBtnX = this.resumeButton.x;
            const resumeBtnY = this.resumeButton.y;
            const resumeBtnW = this.resumeButton.width;
            const resumeBtnH = this.resumeButton.height;

            if (clickX >= resumeBtnX - resumeBtnW/2 && clickX <= resumeBtnX + resumeBtnW/2 &&
                clickY >= resumeBtnY - resumeBtnH/2 && clickY <= resumeBtnY + resumeBtnH/2) {
                this.unpauseGame();
                return;
            }
        }

        // Check if click is on return to menu button (when paused)
        if (this.state === 'paused' && !this.showPauseCountdown) {
            const btnX = this.returnToMenuButton.x;
            const btnY = this.returnToMenuButton.y;
            const btnW = this.returnToMenuButton.width;
            const btnH = this.returnToMenuButton.height;

            if (clickX >= btnX - btnW/2 && clickX <= btnX + btnW/2 &&
                clickY >= btnY - btnH/2 && clickY <= btnY + btnH/2) {
                this.soundManager.playButtonSound();
                this.resetGame();
                this.state = 'menu';
                return;
            }
        }

        // Vocabulary management screen clicks
        if (this.state === 'vocabularyManagement') {
            const btnY = 500;
            const btnWidth = 150;
            const btnHeight = 40;
            const btnSpacing = 20;

            // Add Word button
            const addBtnX = 100;
            if (clickX >= addBtnX && clickX <= addBtnX + btnWidth &&
                clickY >= btnY && clickY <= btnY + btnHeight) {
                this.soundManager.playButtonSound();
                const word = prompt('Enter English word:');
                if (word && word.trim()) {
                    const thai = prompt('Enter Thai translation:');
                    if (thai && thai.trim()) {
                        const success = this.addCustomVocabEntry(word, thai);
                        if (!success) {
                            alert('Word already exists!');
                        }
                    }
                }
                return;
            }

            // Import CSV button
            const importBtnX = 100 + btnWidth + btnSpacing;
            if (clickX >= importBtnX && clickX <= importBtnX + btnWidth &&
                clickY >= btnY && clickY <= btnY + btnHeight) {
                this.soundManager.playButtonSound();
                // Trigger file input
                const fileInput = document.getElementById('csvImportInput');
                if (fileInput) {
                    fileInput.click();
                }
                return;
            }

            // Export CSV button
            const exportBtnX = 100 + (btnWidth + btnSpacing) * 2;
            if (clickX >= exportBtnX && clickX <= exportBtnX + btnWidth &&
                clickY >= btnY && clickY <= btnY + btnHeight) {
                this.soundManager.playButtonSound();
                this.exportCustomVocabulary();
                return;
            }

            // Back to Menu button
            const backBtnX = 100 + (btnWidth + btnSpacing) * 3;
            if (clickX >= backBtnX && clickX <= backBtnX + btnWidth &&
                clickY >= btnY && clickY <= btnY + btnHeight) {
                this.soundManager.playButtonSound();
                this.state = 'menu';
                return;
            }

            // Check for delete button clicks on rows
            const tableX = 100;
            const tableY = 110;
            const rowHeight = 30;
            const maxVisibleRows = 10;
            const startIndex = Math.floor(this.vocabManagementScroll);
            const endIndex = Math.min(startIndex + maxVisibleRows, this.customVocabulary.length);

            for (let i = startIndex; i < endIndex; i++) {
                const y = tableY + rowHeight + (i - startIndex) * rowHeight;
                const deleteX = tableX + 600 - 25;
                const deleteY = y + rowHeight / 2;
                const deleteRadius = 10;

                const dist = Math.sqrt(
                    Math.pow(clickX - deleteX, 2) +
                    Math.pow(clickY - deleteY, 2)
                );

                if (dist <= deleteRadius) {
                    this.soundManager.playButtonSound();
                    if (confirm(`Delete "${this.customVocabulary[i].word}"?`)) {
                        this.deleteCustomVocabEntry(i);
                    }
                    return;
                }
            }
        }
    }

    pauseGame() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        this.showPauseCountdown = false; // Just pause, no countdown yet
        this.currentPauseStartTime = Date.now(); // Track when pause began
        this.soundManager.playButtonSound();
    }

    unpauseGame() {
        if (this.state !== 'paused') return;
        // Start countdown before resuming
        this.showPauseCountdown = true;
        this.pauseStartTime = Date.now();
        this.soundManager.playButtonSound();
    }

    showQuickSnap() {
        if (this.quickSnapVisible) return;
        this.quickSnapVisible = true;
        const quickSnapOverlay = document.getElementById('quickSnapOverlay');
        if (quickSnapOverlay) {
            quickSnapOverlay.classList.add('visible');
            // Update content when showing
            vocabularyManager.updateQuickSnap();
        }
    }

    hideQuickSnap() {
        if (!this.quickSnapVisible) return;
        this.quickSnapVisible = false;
        const quickSnapOverlay = document.getElementById('quickSnapOverlay');
        if (quickSnapOverlay) {
            quickSnapOverlay.classList.remove('visible');
        }
    }

    toggleMute() {
        this.isMuted = this.soundManager.toggleMute();
        // Play button sound (only if unmuting, otherwise it won't be heard)
        if (!this.isMuted) {
            this.soundManager.playButtonSound();
        }
        this.updateUI();
    }

    activateSpecialPower() {
        // Check if we have power stacks available
        if (this.powerStacks <= 0) return;

        // Find all enemies within attack radius
        const enemiesInRange = [];
        for (let asteroid of [...this.asteroids]) {
            const dist = distance(this.ship.x, this.ship.y, asteroid.x, asteroid.y);
            if (dist <= this.ship.attackRange) {
                enemiesInRange.push(asteroid);
            }
        }

        if (enemiesInRange.length === 0) {
            return;
        }

        // Consume 1 power stack up-front
        this.powerStacks--;

        // Visual/audio feedback
        this.createPowerActivationEffect();
        this.soundManager.playButtonSound();
        if (typeof this.soundManager.playBulletFire === 'function') {
            this.soundManager.playBulletFire();
        }

        // Trigger ship firing effects for power attack
        for (let i = 0; i < Math.min(5, enemiesInRange.length); i++) {
            this.ship.fireBullet('center');
        }

        // Instantly destroy all affected enemies (wave obliteration)
        for (let enemy of enemiesInRange) {
            if (this.asteroids.includes(enemy)) {
                this.damageAsteroid(enemy, true); // true = from power attack (shows translation, no gauge gain)
            }
        }

        // Update UI
        this.updateUI();
    }

    createPowerActivationEffect() {
        // Create expanding ring effect
        const effect = {
            x: this.ship.x,
            y: this.ship.y,
            radius: 0,
            maxRadius: this.ship.attackRange,
            alpha: 1,
            lifetime: 30, // frames
            age: 0,
            lineWidth: 3
        };

        this.effects.push(effect);
    }

    createShieldActivateEffect() {
        const effect = {
            x: this.ship.x,
            y: this.ship.y,
            radius: 0,
            maxRadius: 80,
            alpha: 1,
            lifetime: 35,
            age: 0,
            lineWidth: 2
        };

        this.effects.push(effect);
    }

    createShieldBreakEffect() {
        const effect = {
            x: this.ship.x,
            y: this.ship.y,
            radius: 0,
            maxRadius: 120,
            alpha: 1,
            lifetime: 25,
            age: 0,
            lineWidth: 4
        };

        this.effects.push(effect);
    }

    consumeShield(asteroid) {
        if (!this.hasShield) return;

        this.hasShield = false;
        this.shieldActivatedAt = 0;
        this.gauge = 0;

        this.createShieldBreakEffect();

        if (asteroid && this.asteroids.includes(asteroid)) {
            this.explosions.push(new Explosion(asteroid.x, asteroid.y));

            const index = this.asteroids.indexOf(asteroid);
            if (index > -1) {
                this.asteroids.splice(index, 1);
            }

            if (this.activeAsteroid === asteroid) {
                this.activeAsteroid = null;
            }

            // Mark asteroid as neutralized so any stray bullets drop harmlessly
            asteroid.currentHealth = 0;
            asteroid.markedForDestruction = true;
            asteroid.incomingBullets = 0;
            asteroid.bulletsHit = 0;
        }

        this.updateUI();
    }

    createImpactEffect(x, y) {
        // Create small particle burst
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i;
            const speed = 2 + Math.random() * 2;
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20,
                maxLife: 20,
                color: '#000000',
                size: 2
            };

            this.particles.push(particle);
        }
    }

    updateParticles() {
        if (!this.particles) return;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    destroyAsteroid(asteroid, fromPowerAttack = false) {
        // Create explosion effect
        this.explosions.push(new Explosion(asteroid.x, asteroid.y));

        // Remove asteroid
        const index = this.asteroids.indexOf(asteroid);
        if (index > -1) {
            this.asteroids.splice(index, 1);
        }

        // Clear active asteroid if it was this one
        if (this.activeAsteroid === asteroid) {
            this.activeAsteroid = null;
        }

        // Update score based on tier
        const scoreValue = asteroid.word.length * asteroid.tierConfig.scoreMultiplier;
        this.score += scoreValue;
        this.asteroidsDestroyed++;

        // Update progressive difficulty based on words completed
        this.wordsCompleted++;

        // Increment gauge only if NOT from power attack
        if (!fromPowerAttack) {
            this.incrementGauge(1);
        }

        if (asteroid.isBossSegment) {
            this.handleBossSegmentDestroyed();
        } else if (asteroid.isBossCore) {
            this.handleBossCoreDestroyed();
            return;
        }

        // Play random score chime (guard for older sound managers)
        if (typeof this.soundManager.playScoreChime === 'function') {
            this.soundManager.playScoreChime();
        }

        this.updateUI();
    }

    startLevelTransition() {
        // Wait for explosions to finish before showing message
        this.waitingForExplosions = true;
        this.pendingBossSpawn = false;
        this.bossActive = false;
        this.bossData = null;
        this.level += 1;
        this.updateLevelDifficultyMetrics();

        // Reset level timer
        this.levelStartTime = Date.now();
        this.levelTimeExpired = false;
        this.waitingForClear = false;
        this.totalPausedTime = 0; // Reset pause tracking for new level
        this.scheduleSpawnDelay(1500); // Delay first spawn at new difficulty by 1.5s

        if (typeof this.soundManager.playLevelUp === 'function') {
            this.soundManager.playLevelUp();
        }

        this.updateUI();
    }

    damageAsteroid(asteroid, fromPowerAttack = false) {
        // Show translation for the word that was just completed
        // (Do this BEFORE changing the word for multi-health enemies)
        if (vocabularyManager && asteroid.word) {
            vocabularyManager.addTranslation(asteroid.word);
        }

        // Deal damage to asteroid
        const destroyed = asteroid.takeDamage(1);

        // Boss damage flash effect
        if (asteroid.isBossCore && !destroyed) {
            this.createBossDamageEffect();
        }

        if (destroyed) {
            this.destroyAsteroid(asteroid, fromPowerAttack);
        } else {
            // Not destroyed yet, allow targeting again for multi-hit enemies
            // For ELITE enemies, change the word
            if (asteroid.tier === 'ELITE') {
                const newWord = this.generateWordForTier('ELITE');
                trackWordUsage(newWord); // Track word for weighted selection
                asteroid.changeWord(newWord);
            }

            // The player will need to type the word again
            asteroid.resetTyping();
            asteroid.incomingBullets = 0;
            asteroid.bulletsHit = 0;
            asteroid.markedForDestruction = false;

            // Clear active asteroid if this was it
            if (this.activeAsteroid === asteroid) {
                this.activeAsteroid = null;
            }
        }
    }

    createBossDamageEffect() {
        if (!this.bossData) return;

        // Create expanding ring effect at boss center
        const effect = {
            x: this.bossData.center.x,
            y: this.bossData.center.y,
            radius: this.bossData.bodyRadius * 0.5,
            maxRadius: this.bossData.bodyRadius * 1.5,
            alpha: 1,
            lifetime: 20, // frames
            age: 0,
            lineWidth: 4,
            isBossDamage: true
        };

        this.effects.push(effect);
    }

    incrementGauge(amount) {
        if (this.hasShield || amount <= 0) {
            return; // Gauge locked while shield is active
        }

        const previousGauge = this.gauge;
        const newGaugeTotal = this.gauge + amount;
        this.gauge = Math.min(this.maxGauge, newGaugeTotal);

        if (this.gauge > previousGauge) {
            this.gaugeAnimations.push({
                type: 'increase',
                amount: amount,
                startTime: Date.now(),
                duration: 400 // 400ms animation
            });
        }

        if (this.gauge >= this.maxGauge) {
            if (this.powerStacks < this.maxPowerStacks) {
                const overflow = Math.max(0, newGaugeTotal - this.maxGauge);
                this.gauge = Math.min(this.maxGauge, overflow);
                this.powerStacks++;

                // Play gauge full sound when converting to power stack
                this.soundManager.playGaugeFull();

                this.gaugeAnimations.push({
                    type: 'convert',
                    startTime: Date.now(),
                    duration: 600 // 600ms animation
                });
            } else {
                // Transform gauge into shield charge
                this.gauge = 0;
                this.hasShield = true;
                this.shieldActivatedAt = Date.now();
                this.createShieldActivateEffect();

                // Play gauge full sound when activating shield
                this.soundManager.playGaugeFull();

                this.gaugeAnimations.push({
                    type: 'shield',
                    startTime: Date.now(),
                    duration: 800 // Highlight shield activation
                });
            }
        }

        this.updateUI();
    }

    scheduleSpawnDelay(delayMs) {
        // Pause asteroid spawns for the requested duration
        this.nextSpawnAllowedTime = Date.now() + delayMs;
        this.spawnTimer = 0;
    }

    computeWordsPerMinuteForLevel() {
        const baseWpm = 22;
        const linearGrowth = 2.5 * (this.level - 1);
        const plateauBoost = Math.max(0, this.level - 5) * 1.2;
        return Math.min(55, Math.round(baseWpm + linearGrowth + plateauBoost));
    }

    updateLevelDifficultyMetrics() {
        const levelIndex = Math.max(0, this.level - 1);

        const maxIncrease = Math.floor(levelIndex / 2);
        const longWordBonus = Math.floor(levelIndex / 3);
        const computedMax = 4 + maxIncrease + longWordBonus;
        const computedMin = 3 + Math.floor(levelIndex / 4);

        this.currentMaxWordLength = Math.min(15, Math.max(4, computedMax));
        this.currentMinWordLength = Math.min(
            Math.max(3, computedMin),
            Math.max(3, this.currentMaxWordLength - 1)
        );

        this.wordsPerMinuteTarget = this.computeWordsPerMinuteForLevel();
        const framesPerWord = (60 / this.wordsPerMinuteTarget) * 60; // Convert WPM to frames
        this.spawnInterval = Math.max(30, Math.round(framesPerWord));
    }

    weightedRandomLength(options) {
        const totalWeight = options.reduce((sum, option) => sum + Math.max(option.weight, 0), 0);
        if (totalWeight <= 0) {
            return options[options.length - 1].length;
        }

        let roll = Math.random() * totalWeight;
        for (const option of options) {
            const weight = Math.max(option.weight, 0);
            if ((roll -= weight) <= 0) {
                return option.length;
            }
        }

        return options[options.length - 1].length;
    }

    selectWordLengthForTier(tier) {
        const baseMin = this.currentMinWordLength;
        const baseMax = this.currentMaxWordLength;
        const levelFactor = Math.min(1, (this.level - 1) / 10);
        const extendedMax = Math.min(15, baseMax + 2 + Math.floor(this.level / 3));

        const options = [];
        for (let length = baseMin; length <= extendedMax; length++) {
            const offset = length - baseMin;
            let weight;

            if (tier === 'NORMAL') {
                weight = Math.max(0.2, 1.0 - offset * 0.25);
            } else if (tier === 'RARE') {
                weight = 0.6 + offset * 0.25;
            } else {
                // ELITE or others
                weight = 0.75 + offset * 0.4;
            }

            // Bias longer words as levels progress
            const levelBias = 1 + offset * (0.25 + levelFactor * (tier === 'ELITE' ? 0.5 : 0.3));
            weight *= levelBias;

            if (length > baseMax) {
                const overshoot = length - baseMax;
                const dampener = Math.max(0.08, 0.45 - overshoot * 0.1);
                weight *= dampener;

                if (this.level === 1) {
                    weight *= 0.35; // Keep early longer words rare but possible
                }
            }

            options.push({ length, weight: Math.max(weight, 0.05) });
        }

        return this.weightedRandomLength(options);
    }

    generateWordForTier(tier) {
        const targetLength = this.selectWordLengthForTier(tier);
        const word = getWordByExactLength(targetLength);
        return word || getWordByLengthRange(Math.max(3, targetLength - 1), Math.min(15, targetLength + 1));
    }

    async loadAndStartGame() {
        this.state = 'waiting';

        console.log(`Loading vocabulary: ${this.selectedVocabulary}`);

        // Load words into word bank
        if (this.selectedVocabulary === 'custom') {
            if (this.customVocabulary.length === 0) {
                alert('No custom vocabulary! Please add words first.');
                this.state = 'vocabularySelection';
                return;
            }

            // Use external function if available, otherwise use inline implementation
            if (typeof loadWordsFromCustom === 'function') {
                await loadWordsFromCustom(this.customVocabulary);
            } else {
                // Inline implementation (fallback for cache issues)
                console.log('Using inline custom vocabulary loader...');

                // Clear existing word bank
                for (let letter in WORD_BANK) {
                    WORD_BANK[letter] = [];
                }

                // Populate word bank from custom vocabulary
                for (const entry of this.customVocabulary) {
                    const word = entry.word.toLowerCase();
                    if (word && word.length > 0) {
                        const firstLetter = word[0].toLowerCase();
                        if (WORD_BANK[firstLetter]) {
                            WORD_BANK[firstLetter].push(word);
                        }
                    }
                }

                // Rebuild caches (inline)
                if (typeof allWordsCache !== 'undefined') {
                    allWordsCache.length = 0;
                    for (let letter in WORD_BANK) {
                        allWordsCache.push(...WORD_BANK[letter]);
                    }

                    if (typeof wordsByLength !== 'undefined') {
                        wordsByLength = {};
                        for (const word of allWordsCache) {
                            const len = word.length;
                            if (!wordsByLength[len]) {
                                wordsByLength[len] = [];
                            }
                            wordsByLength[len].push(word);
                        }
                    }
                }

                console.log(`Loaded ${this.customVocabulary.length} custom words into word bank`);
            }
        } else {
            await loadWordsFromVocabulary(this.selectedVocabulary);
        }
        console.log('Word bank loaded');

        // Load vocabulary manager
        if (this.selectedVocabulary === 'custom') {
            // Use external function if available, otherwise use inline implementation
            if (typeof vocabularyManager.initCustom === 'function') {
                await vocabularyManager.initCustom(this.customVocabulary);
            } else {
                // Inline implementation (fallback for cache issues)
                console.log('Using inline vocabulary manager initialization...');

                vocabularyManager.translationListElement = document.getElementById('translationList');

                // Clear existing vocabulary
                vocabularyManager.vocabularyMap.clear();

                // Populate from custom array
                for (const entry of this.customVocabulary) {
                    const word = entry.word.toLowerCase();
                    const thai = entry.thai;

                    if (word && thai) {
                        vocabularyManager.vocabularyMap.set(word, {
                            word: entry.word,
                            thai: thai
                        });
                    }
                }

                console.log(`VocabularyManager: Loaded ${vocabularyManager.vocabularyMap.size} custom entries`);
            }
        } else {
            await vocabularyManager.init(this.selectedVocabulary);
        }
        console.log('Vocabulary manager initialized');

        // Start the game
        this.startGame();
    }

    startGame() {
        this.state = 'playing';
        this.started = true;
        this.levelStartTime = Date.now(); // Start level timer
        this.levelTimeExpired = false;
        this.waitingForClear = false;
        this.totalPausedTime = 0; // Reset pause tracking at game start
        this.showLevelMessage = false;
        this.waitingForExplosions = false;
        this.bossActive = false;
        this.bossData = null;
        this.pendingBossSpawn = false;

        // Auto-expand translation panel when game starts
        const translationPanel = document.getElementById('translationPanel');
        if (translationPanel && translationPanel.classList.contains('collapsed')) {
            translationPanel.classList.remove('collapsed');
        }

        this.updateLevelDifficultyMetrics();
        this.scheduleSpawnDelay(1500); // Give player a breather before first spawn
        this.updateUI();
    }

    resetGame() {
        this.score = 0;
        this.level = 1;
        this.asteroidsDestroyed = 0;
        this.wordsCompleted = 0;
        this.currentMinWordLength = 3;
        this.currentMaxWordLength = 4; // Reset to easy difficulty
        this.asteroids = [];
        this.bullets = [];
        this.explosions = [];
        this.effects = [];
        this.particles = [];
        this.activeAsteroid = null;
        this.spawnTimer = 0;
        this.spawnInterval = 135; // Reset to slower spawn rate
        this.powerStacks = 3; // Reset power stacks on new game
        this.gauge = 0; // Reset gauge
        this.gaugeAnimations = []; // Clear gauge animations
        this.isInTransition = false; // Reset transition state
        this.nextSpawnAllowedTime = 0;
        this.hasShield = false;
        this.shieldActivatedAt = 0;
        this.bossActive = false;
        this.bossData = null;
        this.pendingBossSpawn = false;
        this.state = 'waiting';
        this.started = false;

        // Clear vocabulary display
        if (vocabularyManager) {
            vocabularyManager.clearDisplay();
        }

        this.updateLevelDifficultyMetrics();
        this.updateUI();
    }

    determineTier() {
        // Future: Boss tier will be added here
        // - Spawn rate: 2% or every 25-30 kills
        // - Health: 3+, Size: 50+, unique mechanics

        // Random tier based on spawn rates
        const roll = Math.random();
        if (roll < 0.70) return 'NORMAL';
        if (roll < 0.95) return 'RARE';
        return 'ELITE';
    }

    determineMovementPattern(tier) {
        const levelFactor = Math.min(1, (this.level - 1) / 12);
        const roll = Math.random();

        if (tier === 'NORMAL') {
            const diagonalChance = 0.1 + levelFactor * 0.2;
            return roll < diagonalChance ? MOVEMENT_PATTERNS.DIAGONAL : MOVEMENT_PATTERNS.STRAIGHT;
        }

        if (tier === 'RARE') {
            const diagonalChance = 0.25 + levelFactor * 0.35;

            if (roll < diagonalChance) return MOVEMENT_PATTERNS.DIAGONAL;
            return MOVEMENT_PATTERNS.STRAIGHT;
        }

        if (tier === 'ELITE') {
            const diagonalChance = 0.45 + levelFactor * 0.25;
            const zigzagChance = 0.25 + levelFactor * 0.15;
            const spiralChance = 0.12 + levelFactor * 0.1;

            if (roll < diagonalChance) return MOVEMENT_PATTERNS.DIAGONAL;
            if (roll < diagonalChance + zigzagChance) return MOVEMENT_PATTERNS.ZIGZAG;
            if (roll < diagonalChance + zigzagChance + spiralChance) return MOVEMENT_PATTERNS.SPIRAL;
            return MOVEMENT_PATTERNS.STRAIGHT;
        }

        return MOVEMENT_PATTERNS.STRAIGHT;
    }

    spawnAsteroid() {
        if (this.asteroids.length >= this.maxAsteroids) return;

        // Determine tier
        const tier = this.determineTier();

        // Get word based on current difficulty profile and tier
        const word = this.generateWordForTier(tier);
        trackWordUsage(word); // Track word for weighted selection

        // Determine movement pattern
        const movementPattern = this.determineMovementPattern(tier);

        // Spawn from top edge
        const x = random(50, this.width - 50);
        const y = -50;

        const asteroid = new Asteroid(
            x,
            y,
            this.ship.x,
            this.ship.y,
            word,
            tier,
            movementPattern
        );

        this.asteroids.push(asteroid);
    }

    spawnSummonedEnemy(position) {
        // Elite enemies summon Normal enemies
        const word = this.generateWordForTier('NORMAL');
        trackWordUsage(word); // Track word for weighted selection

        // Spawn near Elite's position (within 50-100px radius)
        const angle = Math.random() * Math.PI * 2;
        const distance = random(50, 100);
        const x = position.x + Math.cos(angle) * distance;
        const y = position.y + Math.sin(angle) * distance;

        // Keep within screen bounds
        const clampedX = Math.max(50, Math.min(this.width - 50, x));
        const clampedY = Math.max(-50, Math.min(this.height / 2, y));

        const summonedEnemy = new Asteroid(
            clampedX,
            clampedY,
            this.ship.x,
            this.ship.y,
            word,
            'NORMAL',
            MOVEMENT_PATTERNS.STRAIGHT
        );

        // Add spawn animation (scale up effect)
        summonedEnemy.isSpawning = true;
        summonedEnemy.spawnStartTime = Date.now();
        summonedEnemy.spawnDuration = 600; // 600ms spawn animation
        summonedEnemy.spawnScale = 0; // Start invisible

        this.asteroids.push(summonedEnemy);

        // Visual effect: Create small explosion/spawn effect at summon location
        this.explosions.push(new Explosion(position.x, position.y));
    }

    shouldSpawnBossThisLevel() {
        return this.level > 0 && this.level % 3 === 0;
    }

    spawnBoss() {
        const segmentCount = 4; // Fixed 4 arms/tentacles
        const bossId = `boss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const center = { x: this.width / 2, y: -180 };
        const targetY = this.height * 0.25;

        const bossData = {
            id: bossId,
            center,
            baseX: this.width / 2,
            targetY,
            speed: 0.8,
            spawnTime: Date.now(),
            swayAmplitude: 30,
            swaySpeed: 0.0012,
            floatAmplitude: 6,
            floatSpeed: 0.002,
            segments: [],
            totalSegments: segmentCount,
            segmentsDestroyed: 0,
            core: null,
            defeated: false,
            // Boss body visual properties
            bodyRadius: 65,
            pulsePhase: 0,
            armLength: 90,
            armWavePhase: 0,
            // Boss summoning mechanic
            summonTimer: 0,
            summonInterval: 240, // 4 seconds at 60fps (faster than before)
            maxConcurrentSummons: 5, // Increased from 3 to 5
            currentSummons: 0,
            summonEnabled: false // Enable after boss reaches target position
        };

        // Create 4 arms arranged in cardinal directions
        const armAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5]; // Right, Down, Left, Up

        for (let i = 0; i < segmentCount; i++) {
            const angle = armAngles[i];
            const armDistance = bossData.armLength;
            const segmentWord = this.generateWordForTier('ELITE');
            trackWordUsage(segmentWord); // Track word for weighted selection

            const segment = new Asteroid(
                center.x + Math.cos(angle) * armDistance,
                center.y + Math.sin(angle) * armDistance,
                this.ship.x,
                this.ship.y,
                segmentWord,
                'ELITE',
                MOVEMENT_PATTERNS.STRAIGHT
            );

            segment.manualMovement = true;
            segment.immuneToKnockback = true;
            segment.isBossSegment = true;
            segment.bossId = bossId;
            segment.armAngle = angle; // Fixed angle for this arm
            segment.armIndex = i;
            segment.radius = 32;
            segment.speed = 0;
            segment.vx = 0;
            segment.vy = 0;
            segment.maxHealth = 1;
            segment.currentHealth = 1;

            this.asteroids.push(segment);
            bossData.segments.push(segment);
        }

        this.bossActive = true;
        this.pendingBossSpawn = false;
        this.bossData = bossData;
        this.waitingForClear = false;
        this.updateBoss();
    }

    spawnBossCore() {
        if (!this.bossData || this.bossData.core) return;

        const coreWord = this.generateWordForTier('ELITE');
        trackWordUsage(coreWord); // Track word for weighted selection
        const center = this.bossData.center;
        const core = new Asteroid(
            center.x,
            center.y,
            this.ship.x,
            this.ship.y,
            coreWord,
            'ELITE',
            MOVEMENT_PATTERNS.STRAIGHT
        );

        core.manualMovement = true;
        core.immuneToKnockback = true;
        core.isBossCore = true;
        core.bossId = this.bossData.id;
        core.radius = this.bossData.bodyRadius; // Use body radius
        core.speed = 0;
        core.vx = 0;
        core.vy = 0;
        core.maxHealth = 4;
        core.currentHealth = 4;

        this.asteroids.push(core);
        this.bossData.core = core;
    }

    updateBoss() {
        if (!this.bossActive || !this.bossData) return;

        const boss = this.bossData;
        const elapsed = Date.now() - boss.spawnTime;

        // Update visual effects
        boss.pulsePhase += 0.03;
        boss.armWavePhase += 0.02;

        // Move boss downward until reaching target position
        if (boss.center.y < boss.targetY) {
            boss.center.y = Math.min(boss.targetY, boss.center.y + boss.speed);
        } else {
            // Gentle floating motion
            boss.center.y = boss.targetY + Math.sin(elapsed * boss.floatSpeed) * boss.floatAmplitude;

            // Enable summoning once boss reaches target position
            if (!boss.summonEnabled) {
                boss.summonEnabled = true;
            }
        }

        // Horizontal sway motion
        const sway = Math.sin(elapsed * boss.swaySpeed) * boss.swayAmplitude;
        boss.center.x = boss.baseX + sway;
        boss.center.x = Math.max(120, Math.min(this.width - 120, boss.center.x));

        // Boss summoning mechanic (starts from phase 1, continues through phase 2)
        if (boss.summonEnabled) {
            boss.summonTimer++;

            // Count current summons (check if they're still alive)
            boss.currentSummons = this.asteroids.filter(a => a.summonedByBoss).length;

            // Summon new enemies if timer expired and under limit
            if (boss.summonTimer >= boss.summonInterval && boss.currentSummons < boss.maxConcurrentSummons) {
                this.bossSummonEnemy();
                boss.summonTimer = 0;
            }
        }

        // Update arm positions with wave animation
        for (const segment of boss.segments) {
            if (!this.asteroids.includes(segment)) continue;

            // Create wave-like arm movement
            const waveOffset = Math.sin(boss.armWavePhase + segment.armIndex * (Math.PI / 2)) * 15;
            const armDistance = boss.armLength + waveOffset;

            segment.x = boss.center.x + Math.cos(segment.armAngle) * armDistance;
            segment.y = boss.center.y + Math.sin(segment.armAngle) * armDistance;
            segment.shipX = this.ship.x;
            segment.shipY = this.ship.y;
        }

        // Update core position
        if (boss.core && this.asteroids.includes(boss.core)) {
            boss.core.x = boss.center.x;
            boss.core.y = boss.center.y;
            boss.core.shipX = this.ship.x;
            boss.core.shipY = this.ship.y;
        }
    }

    bossSummonEnemy() {
        if (!this.bossData) return;

        const boss = this.bossData;

        // Spawn position: random position around the boss
        const angle = Math.random() * Math.PI * 2;
        const distance = boss.bodyRadius + 40;
        const spawnX = boss.center.x + Math.cos(angle) * distance;
        const spawnY = boss.center.y + Math.sin(angle) * distance;

        // Random tier: 70% NORMAL, 30% RARE
        const tier = Math.random() < 0.7 ? 'NORMAL' : 'RARE';
        const word = this.generateWordForTier(tier);
        trackWordUsage(word); // Track word for weighted selection

        // Create summoned enemy with spawn animation
        const summon = new Asteroid(
            spawnX,
            spawnY,
            this.ship.x,
            this.ship.y,
            word,
            tier,
            MOVEMENT_PATTERNS.STRAIGHT
        );

        summon.summonedByBoss = true; // Mark as boss summon

        // Add spawn animation properties
        summon.isSpawning = true;
        summon.spawnStartTime = Date.now();
        summon.spawnDuration = 600; // 600ms spawn animation
        summon.spawnScale = 0; // Start invisible

        this.asteroids.push(summon);

        // Create summon visual effect
        this.createBossSummonEffect(spawnX, spawnY);
    }

    createBossSummonEffect(x, y) {
        // Create expanding ring effect at summon position
        const effect = {
            x: x,
            y: y,
            radius: 5,
            maxRadius: 40,
            alpha: 1,
            lifetime: 25,
            age: 0,
            lineWidth: 3,
            isBossSummon: true
        };

        this.effects.push(effect);
    }

    handleBossSegmentDestroyed() {
        if (!this.bossData) return;
        this.bossData.segmentsDestroyed++;
        if (this.bossData.segmentsDestroyed >= this.bossData.totalSegments) {
            this.spawnBossCore();
        }
    }

    handleBossCoreDestroyed() {
        this.bossActive = false;
        this.pendingBossSpawn = false;
        this.bossData = null;
        this.waitingForClear = false;

        // Check if there are any boss-summoned minions still alive
        const remainingMinions = this.asteroids.filter(a => a.summonedByBoss).length;
        if (remainingMinions > 0) {
            this.waitingForBossMinions = true;
        } else {
            this.startLevelTransition();
        }
    }

    checkCollisions() {
        // Check if any asteroid collides with the ship
        const shipRadius = 20; // Ship collision radius
        for (let asteroid of this.asteroids) {
            // Circle-circle collision detection
            const dist = distance(this.ship.x, this.ship.y, asteroid.x, asteroid.y);
            const collisionDist = shipRadius + asteroid.radius;

            if (dist < collisionDist) {
                if (this.hasShield) {
                    this.consumeShield(asteroid);
                } else {
                    this.gameOver();
                }
                return;
            }
        }
    }

    gameOver() {
        this.state = 'gameOver';
        this.hasShield = false;
        this.bossActive = false;
        this.pendingBossSpawn = false;
        this.bossData = null;
        this.updateUI();
    }

    updateBackgroundAsteroids() {
        // Update background asteroids for menu
        for (let asteroid of this.backgroundAsteroids) {
            // Update with their stored target
            if (asteroid.backgroundTarget) {
                asteroid.update(asteroid.backgroundTarget.x, asteroid.backgroundTarget.y);
            }

            // Check if off-screen, respawn from opposite edge
            const margin = 150;
            let needsRespawn = false;

            if (asteroid.x < -margin || asteroid.x > this.width + margin ||
                asteroid.y < -margin || asteroid.y > this.height + margin) {
                needsRespawn = true;
            }

            if (needsRespawn) {
                // Respawn from a random edge moving along periphery to adjacent edge
                const edge = Math.floor(Math.random() * 4);
                let x, y, targetX, targetY;

                switch(edge) {
                    case 0: // Top edge -> move to left or right edge
                        x = Math.random() * this.width;
                        y = -100;
                        if (Math.random() < 0.5) {
                            targetX = -100;
                            targetY = Math.random() * this.height * 0.6;
                        } else {
                            targetX = this.width + 100;
                            targetY = Math.random() * this.height * 0.6;
                        }
                        break;
                    case 1: // Bottom edge -> move to left or right edge
                        x = Math.random() * this.width;
                        y = this.height + 100;
                        if (Math.random() < 0.5) {
                            targetX = -100;
                            targetY = this.height * 0.4 + Math.random() * this.height * 0.6;
                        } else {
                            targetX = this.width + 100;
                            targetY = this.height * 0.4 + Math.random() * this.height * 0.6;
                        }
                        break;
                    case 2: // Left edge -> move to top or bottom edge
                        x = -100;
                        y = Math.random() * this.height;
                        if (Math.random() < 0.5) {
                            targetX = Math.random() * this.width * 0.6;
                            targetY = -100;
                        } else {
                            targetX = Math.random() * this.width * 0.6;
                            targetY = this.height + 100;
                        }
                        break;
                    case 3: // Right edge -> move to top or bottom edge
                        x = this.width + 100;
                        y = Math.random() * this.height;
                        if (Math.random() < 0.5) {
                            targetX = this.width * 0.4 + Math.random() * this.width * 0.6;
                            targetY = -100;
                        } else {
                            targetX = this.width * 0.4 + Math.random() * this.width * 0.6;
                            targetY = this.height + 100;
                        }
                        break;
                }

                asteroid.x = x;
                asteroid.y = y;
                asteroid.shipX = targetX;
                asteroid.shipY = targetY;
                asteroid.backgroundTarget = { x: targetX, y: targetY };
                asteroid.changeWord(this.getMenuWord());

                // Reinitialize movement toward new target
                const dir = getDirectionVector(x, y, targetX, targetY);
                asteroid.vx = dir.x * asteroid.speed;
                asteroid.vy = dir.y * asteroid.speed;
            }
        }
    }

    update() {
        // Update ship animations
        this.ship.update();

        // Update background asteroids if on menu or vocabulary selection
        if (this.state === 'menu' || this.state === 'vocabularySelection') {
            this.updateBackgroundAsteroids();
            return;
        }

        // Handle pause countdown
        if (this.state === 'paused') {
            // Only check countdown if it's active
            if (this.showPauseCountdown) {
                const elapsed = Date.now() - this.pauseStartTime;
                if (elapsed >= this.pauseCountdownDuration) {
                    // Countdown finished, resume game
                    // Add the pause duration to total paused time
                    this.totalPausedTime += Date.now() - this.currentPauseStartTime;
                    this.state = 'playing';
                    this.showPauseCountdown = false;
                }
            }
            return; // Don't update game while paused
        }

        if (this.state !== 'playing') return;

        if (this.bossActive) {
            this.updateBoss();
        }

        // Check if waiting for boss minions to be cleared
        if (this.waitingForBossMinions) {
            const remainingMinions = this.asteroids.filter(a => a.summonedByBoss).length;
            if (remainingMinions === 0) {
                this.waitingForBossMinions = false;
                this.startLevelTransition();
            }
        }

        // Check if waiting for explosions to finish before showing level message
        if (this.waitingForExplosions) {
            // Check if all explosions are done
            if (this.explosions.length === 0) {
                // Explosions finished, show level message
                this.showLevelMessage = true;
                this.levelMessageStartTime = Date.now();
                this.waitingForExplosions = false;
            }
        }

        // Check if level message should be hidden
        if (this.showLevelMessage) {
            const elapsed = Date.now() - this.levelMessageStartTime;
            if (elapsed >= this.levelMessageDuration) {
                this.showLevelMessage = false;
            }
        }

        // Check level timer (subtract paused time)
        const levelElapsed = Date.now() - this.levelStartTime - this.totalPausedTime;
        if (!this.levelTimeExpired && levelElapsed >= this.levelDuration) {
            // Time expired, stop spawning and wait for clear
            this.levelTimeExpired = true;
            this.waitingForClear = true;
            this.pendingBossSpawn = this.shouldSpawnBossThisLevel();
        }

        // Check if waiting for clear and all enemies are gone
        if (this.waitingForClear && this.asteroids.length === 0) {
            if (this.pendingBossSpawn) {
                this.spawnBoss();
            } else {
                this.startLevelTransition();
                this.waitingForClear = false;
            }
        }

        // Spawn asteroids only if time hasn't expired and no boss is active
        if (!this.levelTimeExpired && !this.bossActive) {
            const now = Date.now();
            if (now < this.nextSpawnAllowedTime) {
                // Hold spawns during the grace period
                this.spawnTimer = 0;
            } else {
                this.spawnTimer++;
                if (this.spawnTimer >= this.spawnInterval) {
                    if (this.asteroids.length < this.maxAsteroids) {
                        this.spawnAsteroid();
                    }
                    this.spawnTimer = 0;
                }
            }
        }

        // Update asteroids and handle Elite summoning
        for (let asteroid of this.asteroids) {
            const updateResult = asteroid.update(this.ship.x, this.ship.y);

            // Check if Elite summoned a minion
            if (updateResult && updateResult.summon) {
                this.spawnSummonedEnemy(updateResult.position);
            }
        }

        // Update bullets and check for collisions
        const bulletsToRemove = [];
        for (let i = 0; i < this.bullets.length; i++) {
            const bullet = this.bullets[i];
            const hitResult = bullet.update();

            if (hitResult.hit && bullet.target) {
                // Apply knockback to asteroid
                bullet.target.applyKnockback(
                    hitResult.bulletVx,
                    hitResult.bulletVy,
                    hitResult.knockbackStrength
                );

                // Track bullet hit
                bullet.target.bulletHit();

                // Create impact effect
                this.createImpactEffect(bullet.x, bullet.y);

                // Special power bullets destroy immediately
                if (bullet.isSpecialPower) {
                    this.damageAsteroid(bullet.target, true); // true = from power attack
                }
                // Normal bullets: only destroy when word complete AND all bullets have hit
                else if (bullet.target.shouldDestroy()) {
                    this.damageAsteroid(bullet.target, false); // false = from normal typing
                }

                bulletsToRemove.push(i);
            } else if (!bullet.isAlive()) {
                bulletsToRemove.push(i);
            }
        }

        // Remove dead bullets (reverse order to maintain indices)
        for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
            this.bullets.splice(bulletsToRemove[i], 1);
        }

        // Update particles
        this.updateParticles();

        // Update explosions
        this.explosions = this.explosions.filter(explosion => explosion.isAlive());
        for (let explosion of this.explosions) {
            explosion.update();
        }

        // Update special power effects
        this.updateEffects();

        // Update gauge animations
        this.updateGaugeAnimations();

        // Check if active asteroid was destroyed
        if (this.activeAsteroid && !this.asteroids.includes(this.activeAsteroid)) {
            this.activeAsteroid = null;
        }

        // Check collisions
        this.checkCollisions();
    }

    updateGaugeAnimations() {
        // Remove expired animations
        for (let i = this.gaugeAnimations.length - 1; i >= 0; i--) {
            const anim = this.gaugeAnimations[i];
            const elapsed = Date.now() - anim.startTime;

            if (elapsed >= anim.duration) {
                this.gaugeAnimations.splice(i, 1);
            }
        }
    }

    updateEffects() {
        if (!this.effects) return;

        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.age++;
            effect.radius += effect.maxRadius / effect.lifetime;
            if (effect.radius > effect.maxRadius) {
                effect.radius = effect.maxRadius;
            }
            effect.alpha = Math.max(0, 1 - (effect.age / effect.lifetime));

            if (effect.age >= effect.lifetime) {
                this.effects.splice(i, 1);
            }
        }
    }

    drawBossBody() {
        if (!this.bossActive || !this.bossData) return;

        const boss = this.bossData;
        const ctx = this.ctx;

        ctx.save();

        // Calculate health-based shrinking for core phase
        let healthScale = 1.0;
        if (boss.core && this.asteroids.includes(boss.core)) {
            // Core is active - shrink based on remaining health
            const healthPercent = boss.core.currentHealth / boss.core.maxHealth;
            // Scale from 1.0 (full health) to 0.4 (near death)
            healthScale = 0.4 + (healthPercent * 0.6);
        }

        // Calculate pulse effect
        const pulseScale = 1 + Math.sin(boss.pulsePhase) * 0.08;
        const bodyRadius = boss.bodyRadius * pulseScale * healthScale;

        // Draw connecting arms from center to segments (scale arm thickness with health)
        const armThickness = 22 * healthScale;
        const armHighlightThickness = 10 * healthScale;
        const jointRadius = 8 * healthScale;

        for (let segment of boss.segments) {
            if (!this.asteroids.includes(segment)) continue;

            // Draw arm connection with gradient (dark red outer, lighter inner)
            const gradient = ctx.createLinearGradient(
                boss.center.x, boss.center.y,
                segment.x, segment.y
            );
            gradient.addColorStop(0, 'rgba(80, 20, 20, 0.9)');   // Dark red at center
            gradient.addColorStop(0.5, 'rgba(100, 30, 30, 0.8)'); // Medium red
            gradient.addColorStop(1, 'rgba(70, 15, 15, 0.7)');    // Dark red at ends

            // Main arm connection
            ctx.strokeStyle = gradient;
            ctx.lineWidth = armThickness;
            ctx.lineCap = 'round';
            ctx.shadowColor = 'rgba(40, 10, 10, 0.5)';
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.moveTo(boss.center.x, boss.center.y);
            ctx.lineTo(segment.x, segment.y);
            ctx.stroke();

            // Inner arm highlight (crimson/blood color)
            ctx.strokeStyle = 'rgba(180, 40, 40, 0.6)';
            ctx.lineWidth = armHighlightThickness;
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.moveTo(boss.center.x, boss.center.y);
            ctx.lineTo(segment.x, segment.y);
            ctx.stroke();

            // Arm joints (dark red/crimson)
            const jointCount = 2;
            for (let j = 1; j <= jointCount; j++) {
                const t = j / (jointCount + 1);
                const jointX = boss.center.x + (segment.x - boss.center.x) * t;
                const jointY = boss.center.y + (segment.y - boss.center.y) * t;

                ctx.fillStyle = 'rgba(90, 25, 25, 0.9)';
                ctx.shadowColor = 'rgba(60, 15, 15, 0.6)';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(jointX, jointY, jointRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw central boss body (only if core hasn't spawned yet)
        if (!boss.core) {
            // Outer glow (dark red)
            ctx.shadowColor = 'rgba(60, 15, 15, 0.6)';
            ctx.shadowBlur = 25;
            ctx.fillStyle = 'rgba(50, 15, 15, 0.5)';
            ctx.beginPath();
            ctx.arc(boss.center.x, boss.center.y, bodyRadius + 10, 0, Math.PI * 2);
            ctx.fill();

            // Main body (dark red to black gradient)
            const bodyGradient = ctx.createRadialGradient(
                boss.center.x, boss.center.y, 0,
                boss.center.x, boss.center.y, bodyRadius
            );
            bodyGradient.addColorStop(0, 'rgba(120, 30, 30, 1)');    // Dark red center
            bodyGradient.addColorStop(0.6, 'rgba(70, 20, 20, 1)');   // Darker red
            bodyGradient.addColorStop(1, 'rgba(40, 10, 10, 0.95)');  // Very dark red/black

            ctx.fillStyle = bodyGradient;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(50, 15, 15, 0.8)';
            ctx.beginPath();
            ctx.arc(boss.center.x, boss.center.y, bodyRadius, 0, Math.PI * 2);
            ctx.fill();

            // Body details - concentric rings (dark crimson)
            ctx.strokeStyle = 'rgba(60, 15, 15, 0.5)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 0;
            for (let i = 1; i <= 3; i++) {
                const ringRadius = bodyRadius * (i / 4);
                ctx.beginPath();
                ctx.arc(boss.center.x, boss.center.y, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Pulsing core (bright crimson/red)
            const coreRadius = 12 + Math.sin(boss.pulsePhase * 2) * 3;
            const coreGradient = ctx.createRadialGradient(
                boss.center.x, boss.center.y, 0,
                boss.center.x, boss.center.y, coreRadius
            );
            coreGradient.addColorStop(0, 'rgba(220, 60, 60, 0.95)');   // Bright red center
            coreGradient.addColorStop(0.7, 'rgba(160, 40, 40, 0.85)'); // Medium red
            coreGradient.addColorStop(1, 'rgba(100, 25, 25, 0.7)');    // Dark red edge

            ctx.fillStyle = coreGradient;
            ctx.shadowColor = 'rgba(180, 50, 50, 0.7)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(boss.center.x, boss.center.y, coreRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    draw() {
        // Draw menu screen
        if (this.state === 'menu') {
            this.drawMenu();
            // Draw mute button on menu too
            this.drawMuteButton();
            return;
        }

        // Draw vocabulary selection screen
        if (this.state === 'vocabularySelection') {
            this.drawVocabularySelection();
            this.drawMuteButton();
            return;
        }

        // Draw vocabulary management screen
        if (this.state === 'vocabularyManagement') {
            this.drawVocabularyManagement();
            this.drawMuteButton();
            return;
        }

        // Clear canvas with theme-aware background
        this.ctx.fillStyle = this.isDarkMode() ? '#2a2a2a' : '#fff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw grid background
        this.drawGrid();

        // Draw ship
        this.ship.draw(this.ctx);

        // Draw active shield aura if available
        this.drawShieldAura();

        // Draw target lock indicator (active or fading out)
        if (this.activeAsteroid || this.targetLockFadeOut) {
            this.drawTargetLockWave();
        }

        // Draw boss body BEFORE asteroids if boss is active
        if (this.bossActive && this.bossData) {
            this.drawBossBody();
        }

        // Draw asteroids - draw non-active ones first, then active one on top
        for (let asteroid of this.asteroids) {
            if (asteroid !== this.activeAsteroid && !asteroid.isBossSegment && !asteroid.isBossCore) {
                asteroid.draw(this.ctx);
            }
        }

        // Draw boss segments and core (they're drawn over the body)
        if (this.bossActive && this.bossData) {
            for (let segment of this.bossData.segments) {
                if (this.asteroids.includes(segment) && segment !== this.activeAsteroid) {
                    segment.draw(this.ctx);
                }
            }
            if (this.bossData.core && this.asteroids.includes(this.bossData.core) && this.bossData.core !== this.activeAsteroid) {
                this.bossData.core.draw(this.ctx);
            }
        }

        // Draw active asteroid last so it appears on top
        if (this.activeAsteroid) {
            this.activeAsteroid.draw(this.ctx);
        }

        // Draw bullets
        for (let bullet of this.bullets) {
            bullet.draw(this.ctx);
        }

        // Draw explosions
        for (let explosion of this.explosions) {
            explosion.draw(this.ctx);
        }

        // Draw special power effects
        this.renderEffects();

        // Draw impact particles
        this.renderParticles();

        // Draw gauge (bottom left)
        this.drawGauge();

        // Draw power stacks (bottom right)
        this.drawPowerStacks();

        // Draw level message (if showing)
        this.drawLevelMessage();

        // Draw pause button (always visible when playing or paused)
        if (this.state === 'playing' || this.state === 'paused') {
            this.drawPauseButton();
        }

        // Draw mute button opposite pause button
        this.drawMuteButton();

        // Draw pause screen with countdown
        if (this.state === 'paused') {
            this.drawPauseScreen();
        }

        // Draw game over message
        if (this.state === 'gameOver') {
            this.drawGameOver();
        }
    }

    renderEffects() {
        if (!this.effects) return;

        for (let effect of this.effects) {
            this.ctx.save();

            if (effect.isBossDamage) {
                // Boss damage effect - red flash
                this.ctx.strokeStyle = `rgba(200, 0, 0, ${effect.alpha * 0.8})`;
                this.ctx.lineWidth = effect.lineWidth || 4;
                this.ctx.shadowColor = 'rgba(200, 0, 0, 0.6)';
                this.ctx.shadowBlur = 15;
            } else if (effect.isBossSummon) {
                // Boss summon effect - dark red pulse
                this.ctx.strokeStyle = `rgba(120, 30, 30, ${effect.alpha * 0.9})`;
                this.ctx.lineWidth = effect.lineWidth || 3;
                this.ctx.shadowColor = 'rgba(120, 30, 30, 0.8)';
                this.ctx.shadowBlur = 12;
            } else {
                // Normal effects
                this.ctx.strokeStyle = `rgba(0, 0, 0, ${effect.alpha})`;
                this.ctx.lineWidth = effect.lineWidth || 3;
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                this.ctx.shadowBlur = 8;
            }

            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawShieldAura() {
        if (!this.hasShield) return;

        const ctx = this.ctx;
        const elapsed = Date.now() - this.shieldActivatedAt;
        const pulse = (Math.sin(elapsed / 200) + 1) / 2;
        const radius = 36 + pulse * 6;

        ctx.save();
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.25 + pulse * 0.35})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(this.ship.x, this.ship.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    renderParticles() {
        if (!this.particles) return;

        for (let p of this.particles) {
            const alpha = p.life / p.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 5;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    drawGauge() {
        const ctx = this.ctx;
        ctx.save();

        // Position at bottom left
        const x = 20;
        const y = this.height - 60;
        const width = 150;
        const height = 20;

        const isDark = this.isDarkMode();
        const isShielded = this.hasShield;
        const fillPercent = isShielded ? 1 : this.gauge / this.maxGauge;

        const backgroundColor = isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        const borderColor = isDark ? '#fff' : '#000';
        const fillColor = isShielded
            ? (isDark ? '#fff' : '#111')
            : (isDark ? 'rgba(255, 255, 255, 0.85)' : '#333');
        const labelColor = isDark ? '#fff' : '#000';
        const activeLabelColor = isDark ? '#000' : '#fff';
        const increaseFlashColor = isDark ? 'rgba(255, 255, 255, 0.6)' : '#000';
        const convertStrokeColor = isDark ? '#fff' : '#000';
        const shieldStrokeColor = isDark ? '#fff' : '#000';

        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(x, y, width, height);

        // Draw border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw filled portion
        ctx.fillStyle = fillColor;
        ctx.fillRect(x + 2, y + 2, (width - 4) * fillPercent, height - 4);

        // Draw gauge text label
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(isShielded ? 'SHIELD' : 'GAUGE', x, y - 5);

        if (isShielded) {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = activeLabelColor;
            ctx.font = 'bold 10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('ACTIVE', x + width / 2, y + height - 6);
            ctx.restore();
        }

        // Draw animations
        for (let anim of this.gaugeAnimations) {
            const elapsed = Date.now() - anim.startTime;
            const progress = Math.min(elapsed / anim.duration, 1);

            if (anim.type === 'increase') {
                // Flash effect on increase
                const alpha = (1 - progress) * 0.5;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = increaseFlashColor;
                ctx.fillRect(x, y, width, height);
            } else if (anim.type === 'convert') {
                // Sparkle effect on conversion
                const alpha = Math.sin(progress * Math.PI) * 0.8;
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = convertStrokeColor;
                ctx.lineWidth = 3;
                ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
            } else if (anim.type === 'shield') {
                const alpha = Math.sin(progress * Math.PI) * 0.9;
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = shieldStrokeColor;
                ctx.lineWidth = 4;
                ctx.strokeRect(x - 9, y - 9, width + 18, height + 18);
            }
        }

        ctx.restore();
    }

    drawPowerStacks() {
        const ctx = this.ctx;
        ctx.save();

        // Position at bottom right
        const x = this.width - 120;
        const y = this.height - 60;

        const isDark = this.isDarkMode();
        const labelColor = isDark ? '#fff' : '#000';
        const slotBackground = isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        const slotBorder = isDark ? '#fff' : '#000';
        const filledColor = isDark ? '#fff' : '#000';
        const starColor = isDark ? '#000' : '#fff';

        // Draw label
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('POWER', x, y - 5);

        // Draw power stacks
        const stackSize = 25;
        const stackGap = 5;

        for (let i = 0; i < this.maxPowerStacks; i++) {
            const stackX = x + i * (stackSize + stackGap);
            const stackY = y;

            // Draw background
            ctx.fillStyle = slotBackground;
            ctx.fillRect(stackX, stackY, stackSize, stackSize);

            // Draw border
            ctx.strokeStyle = slotBorder;
            ctx.lineWidth = 2;
            ctx.strokeRect(stackX, stackY, stackSize, stackSize);

            // Draw filled if we have this stack
            if (i < this.powerStacks) {
                ctx.fillStyle = filledColor;
                ctx.fillRect(stackX + 3, stackY + 3, stackSize - 6, stackSize - 6);

                // Draw star/power symbol (simple geometric shape)
                ctx.fillStyle = starColor;
                const centerX = stackX + stackSize / 2;
                const centerY = stackY + stackSize / 2;
                const radius = 8;

                // Draw a 5-pointed star
                ctx.beginPath();
                for (let j = 0; j < 5; j++) {
                    const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    if (j === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();
    }

    drawTargetLockWave() {
        const ctx = this.ctx;
        const isDark = this.isDarkMode();
        const waveColor = (alpha) => isDark
            ? `rgba(255, 255, 255, ${Math.min(0.9, alpha + 0.35)})`
            : `rgba(0, 0, 0, ${alpha})`;
        const waveShadowColor = isDark ? 'rgba(180, 220, 255, 0.55)' : 'rgba(0, 0, 0, 0.3)';
        const waveLineWidth = isDark ? 3 : 2;

        // Draw active target lock
        if (this.activeAsteroid) {
            ctx.save();

            // Center waves on the target asteroid
            const targetX = this.activeAsteroid.x;
            const targetY = this.activeAsteroid.y;

            // Gentle pulse animation
            const time = Date.now() * 0.002;
            const pulse = Math.sin(time) * 0.15 + 1; // Oscillates between 0.85 and 1.15

            // Draw 3 concentric rings around the target
            const waveCount = 3;
            const baseRadius = this.activeAsteroid.radius + 15; // Start just outside asteroid

            // Check if we're in fade-in animation
            let fadeInProgress = 1; // Default to fully visible
            let fadeInAlphaMultiplier = 1;
            let fadeInRadiusMultiplier = 1;

            if (this.targetLockFadeIn) {
                const elapsed = Date.now() - this.targetLockFadeIn.startTime;
                fadeInProgress = Math.min(elapsed / this.targetLockFadeIn.duration, 1);

                // Remove fade-in state when complete
                if (fadeInProgress >= 1) {
                    this.targetLockFadeIn = null;
                }

                // Ease-out curve for smooth animation
                fadeInProgress = 1 - Math.pow(1 - fadeInProgress, 3);
                fadeInAlphaMultiplier = fadeInProgress;
                // Rings start contracted (60% size) and expand to full size
                fadeInRadiusMultiplier = 0.6 + (fadeInProgress * 0.4);
            }

            for (let i = 0; i < waveCount; i++) {
                // Each ring is progressively larger
                const radiusOffset = i * 15; // 15px spacing between rings
                const radius = (baseRadius + radiusOffset) * pulse * fadeInRadiusMultiplier;

                // Alpha decreases for outer rings
                const baseAlpha = 0.5 - (i * 0.12);
                const alpha = baseAlpha * fadeInAlphaMultiplier;

                // Draw the wave ring
                ctx.strokeStyle = waveColor(alpha);
                ctx.lineWidth = waveLineWidth;
                ctx.shadowColor = waveShadowColor;
                ctx.shadowBlur = 4;

                ctx.beginPath();
                ctx.arc(targetX, targetY, radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Draw fade-out animation
        if (this.targetLockFadeOut) {
            const fadeOut = this.targetLockFadeOut;
            const elapsed = Date.now() - fadeOut.startTime;
            const progress = elapsed / fadeOut.duration; // 0 to 1

            // Remove fade-out when complete
            if (progress >= 1) {
                this.targetLockFadeOut = null;
                return;
            }

            ctx.save();

            // Fade-out effect: rings expand outward and fade
            const waveCount = 3;
            const baseRadius = fadeOut.radius + 15;

            for (let i = 0; i < waveCount; i++) {
                const radiusOffset = i * 15;
                // Expand rings outward during fade
                const expandAmount = progress * 30; // Expand by 30px
                const radius = baseRadius + radiusOffset + expandAmount;

                // Fade alpha from normal to 0
                const baseAlpha = 0.5 - (i * 0.12);
                const alpha = baseAlpha * (1 - progress);

                // Draw the fading wave ring
                ctx.strokeStyle = waveColor(alpha);
                ctx.lineWidth = waveLineWidth;
                ctx.shadowColor = waveShadowColor;
                ctx.shadowBlur = 4;

                ctx.beginPath();
                ctx.arc(fadeOut.x, fadeOut.y, radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    drawGrid() {
        // Faint grid to look like graph paper
        this.ctx.save();
        this.ctx.strokeStyle = this.isDarkMode() ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
        this.ctx.lineWidth = 0.5;

        const gridSize = 20;

        // Draw vertical lines
        for (let x = 0; x <= this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawLevelMessage() {
        if (!this.showLevelMessage) return;

        this.ctx.save();

        const elapsed = Date.now() - this.levelMessageStartTime;
        const progress = Math.min(1, elapsed / this.levelMessageDuration); // 0 to 1 over 3 seconds

        // Smooth easing functions
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const easeInCubic = (t) => t * t * t;

        // Gradual slide up and fade animation
        let yOffset = 0;
        let alpha = 1;
        let shadeProgress = 1;

        if (progress < 0.4) {
            // Gradual fade in and slide up (0 to 0.4) - 1.2 seconds
            const t = progress / 0.4;
            const eased = easeOutCubic(t);
            yOffset = (1 - eased) * 80; // Start 80px below, slide to 0
            alpha = eased; // Gradual fade in
            shadeProgress = eased; // Darken text as it fades in
        } else if (progress < 0.7) {
            // Hold (0.4 to 0.7) - 0.9 seconds
            yOffset = 0;
            alpha = 1.0;
            shadeProgress = 1.0;
        } else {
            // Gradual fade out and slide up (0.7 to 1.0) - 0.9 seconds
            const t = Math.min(1, (progress - 0.7) / 0.3);
            const eased = easeInCubic(t);
            yOffset = -eased * 20; // Slide up slightly
            alpha = 1.0 - eased; // Gradual fade out
            shadeProgress = alpha; // Lighten text as it fades out
        }

        alpha = Math.max(0, Math.min(1, alpha));
        shadeProgress = Math.max(0, Math.min(1, shadeProgress));
        this.ctx.globalAlpha = alpha;

        // Calculate position (center of screen, slightly above middle)
        const baseY = this.height * 0.45 + yOffset;

        const shadeColor = (darkTarget) => {
            const start = 220; // Light grey starting value
            const channel = Math.round(start + (darkTarget - start) * shadeProgress);
            return `rgb(${channel}, ${channel}, ${channel})`;
        };

        // Draw "LEVEL UP" text
        this.ctx.fillStyle = shadeColor(40);
        this.ctx.font = 'bold 40px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = `rgba(0, 0, 0, ${0.3 * shadeProgress})`;
        this.ctx.shadowBlur = 6 * shadeProgress;
        this.ctx.fillText('LEVEL UP', this.width / 2, baseY - 40);

        // Draw level number
        this.ctx.fillStyle = shadeColor(70);
        this.ctx.font = 'bold 26px Courier New';
        this.ctx.shadowBlur = 3 * shadeProgress;
        this.ctx.fillText(
            `Level ${this.level}`,
            this.width / 2,
            baseY + 5
        );

        this.ctx.fillStyle = shadeColor(120);
        this.ctx.font = '18px Courier New';
        this.ctx.fillText(
            `Words/Min Target: ${this.wordsPerMinuteTarget}`,
            this.width / 2,
            baseY + 40
        );

        this.ctx.restore();
    }

    drawPauseButton() {
        this.ctx.save();

        const isDark = this.isDarkMode();
        const borderColor = isDark ? '#fff' : '#000';
        const backgroundColor = isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        const iconColor = isDark ? '#fff' : '#000';

        // Draw circle with theme-aware border
        this.ctx.strokeStyle = borderColor;
        this.ctx.fillStyle = backgroundColor;
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(this.pauseButton.x, this.pauseButton.y, this.pauseButton.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw pause symbol (two vertical bars)
        this.ctx.fillStyle = iconColor;
        const barWidth = 4;
        const barHeight = 12;
        const barGap = 4;

        // Left bar
        this.ctx.fillRect(
            this.pauseButton.x - barGap / 2 - barWidth,
            this.pauseButton.y - barHeight / 2,
            barWidth,
            barHeight
        );

        // Right bar
        this.ctx.fillRect(
            this.pauseButton.x + barGap / 2,
            this.pauseButton.y - barHeight / 2,
            barWidth,
            barHeight
        );

        this.ctx.restore();
    }

    drawMuteButton() {
        this.ctx.save();

        const btn = this.muteButton;
        const offsetX = -2; // Shift icon to the left within circle
        const isDark = this.isDarkMode();
        const borderColor = isDark ? '#fff' : '#000';
        const backgroundColor = isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        const iconColor = isDark ? '#fff' : '#000';
        const strikeColor = isDark ? '#fff' : '#000';

        // Button circle background
        this.ctx.strokeStyle = borderColor;
        this.ctx.fillStyle = backgroundColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = iconColor;
        this.ctx.strokeStyle = iconColor;
        this.ctx.shadowBlur = 0;

        if (this.isMuted) {
            // MUTED STATE - Simple speaker with X

            // Speaker body (simplified)
            this.ctx.fillRect(btn.x - 8 + offsetX, btn.y - 4, 5, 8);

            // Speaker cone (triangle)
            this.ctx.beginPath();
            this.ctx.moveTo(btn.x - 3 + offsetX, btn.y - 5);
            this.ctx.lineTo(btn.x + 2 + offsetX, btn.y - 8);
            this.ctx.lineTo(btn.x + 2 + offsetX, btn.y + 8);
            this.ctx.lineTo(btn.x - 3 + offsetX, btn.y + 5);
            this.ctx.closePath();
            this.ctx.fill();

            // Draw X over speaker (themed accent)
            this.ctx.lineWidth = 2.5;
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = strikeColor;
            if (isDark) {
                this.ctx.shadowColor = '#000';
                this.ctx.shadowBlur = 4;
            }

            // X marks (diagonal lines)
            this.ctx.beginPath();
            this.ctx.moveTo(btn.x + 4 + offsetX, btn.y - 8);
            this.ctx.lineTo(btn.x + 11 + offsetX, btn.y - 1);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(btn.x + 11 + offsetX, btn.y - 8);
            this.ctx.lineTo(btn.x + 4 + offsetX, btn.y - 1);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(btn.x + 4 + offsetX, btn.y + 1);
            this.ctx.lineTo(btn.x + 11 + offsetX, btn.y + 8);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(btn.x + 11 + offsetX, btn.y + 1);
            this.ctx.lineTo(btn.x + 4 + offsetX, btn.y + 8);
            this.ctx.stroke();

            // Restore icon color for potential future drawing steps
            this.ctx.strokeStyle = iconColor;
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 0;

        } else {
            // UNMUTED STATE - Speaker with sound waves as single unit

            // Speaker body
            this.ctx.fillRect(btn.x - 9 + offsetX, btn.y - 4, 5, 8);

            // Speaker cone (triangle)
            this.ctx.beginPath();
            this.ctx.moveTo(btn.x - 4 + offsetX, btn.y - 5);
            this.ctx.lineTo(btn.x + 1 + offsetX, btn.y - 7);
            this.ctx.lineTo(btn.x + 1 + offsetX, btn.y + 7);
            this.ctx.lineTo(btn.x - 4 + offsetX, btn.y + 5);
            this.ctx.closePath();
            this.ctx.fill();

            // Sound waves - integrated with speaker
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';

            // Wave 1 (small arc)
            this.ctx.beginPath();
            this.ctx.arc(btn.x + 1 + offsetX, btn.y, 5, -Math.PI / 2.5, Math.PI / 2.5);
            this.ctx.stroke();

            // Wave 2 (medium arc)
            this.ctx.beginPath();
            this.ctx.arc(btn.x + 1 + offsetX, btn.y, 8, -Math.PI / 3, Math.PI / 3);
            this.ctx.stroke();

            // Wave 3 (large arc)
            this.ctx.beginPath();
            this.ctx.arc(btn.x + 1 + offsetX, btn.y, 11, -Math.PI / 3.5, Math.PI / 3.5);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawPauseScreen() {
        this.ctx.save();

        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.showPauseCountdown) {
            // COUNTDOWN MODE
            const elapsed = Date.now() - this.pauseStartTime;

            // Smooth easing
            const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            // Calculate which countdown number (3, 2, 1, GO!)
            const totalSteps = 3;
            const stepDuration = this.pauseCountdownDuration / totalSteps; // 1000ms per step
            const currentStep = Math.floor(elapsed / stepDuration);
            const stepProgress = (elapsed % stepDuration) / stepDuration; // 0 to 1 within step

            // Countdown: 3 -> 2 -> 1
            const countdown = totalSteps - currentStep;
            let displayText = countdown > 0 ? countdown.toString() : 'GO!';

            // Gentle scale animation
            let scale;
            if (stepProgress < 0.3) {
                const t = easeInOut(stepProgress / 0.3);
                scale = 0.9 + t * 0.15; // 0.9 to 1.05
            } else if (stepProgress < 0.8) {
                scale = 1.0;
            } else {
                const t = easeInOut((stepProgress - 0.8) / 0.2);
                scale = 1.0 - t * 0.05; // 1.0 to 0.95
            }

            // Smooth alpha fade
            let textAlpha;
            if (stepProgress < 0.15) {
                textAlpha = easeInOut(stepProgress / 0.15);
            } else if (stepProgress < 0.85) {
                textAlpha = 1.0;
            } else {
                textAlpha = 1.0 - easeInOut((stepProgress - 0.85) / 0.15);
            }

            // Draw countdown number
            this.ctx.save();
            this.ctx.translate(this.width / 2, this.height / 2);
            this.ctx.scale(scale, scale);

            this.ctx.globalAlpha = textAlpha;
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 70px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 8;
            this.ctx.fillText(displayText, 0, 0);

            this.ctx.restore();
        } else {
            // PAUSED MODE (no countdown)
            this.ctx.globalAlpha = 1.0;
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 50px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 6;
            this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);

            // Draw instructions
            this.ctx.fillStyle = '#666';
            this.ctx.font = '18px Courier New';
            this.ctx.shadowBlur = 0;
            this.ctx.fillText(
                'Press ESC or click pause button to resume',
                this.width / 2,
                this.height / 2 + 60
            );

            // Draw Resume button
            const resumeBtnX = this.resumeButton.x;
            const resumeBtnY = this.resumeButton.y;
            const resumeBtnW = this.resumeButton.width;
            const resumeBtnH = this.resumeButton.height;

            // Button background
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(resumeBtnX - resumeBtnW/2, resumeBtnY - resumeBtnH/2, resumeBtnW, resumeBtnH);

            // Button border
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(resumeBtnX - resumeBtnW/2, resumeBtnY - resumeBtnH/2, resumeBtnW, resumeBtnH);

            // Button text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Resume', resumeBtnX, resumeBtnY);

            // Draw Return to Menu button
            const btnX = this.returnToMenuButton.x;
            const btnY = this.returnToMenuButton.y;
            const btnW = this.returnToMenuButton.width;
            const btnH = this.returnToMenuButton.height;

            // Button background
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(btnX - btnW/2, btnY - btnH/2, btnW, btnH);

            // Button border
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btnX - btnW/2, btnY - btnH/2, btnW, btnH);

            // Button text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Return to Menu', btnX, btnY);
        }

        this.ctx.restore();
    }

    drawMenu() {
        this.ctx.save();

        const isDark = this.isDarkMode();

        // Background
        this.ctx.fillStyle = isDark ? '#2a2a2a' : '#fff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw subtle grid background
        this.drawGrid();

        // Draw background asteroids with transparency
        this.ctx.save();
        this.ctx.globalAlpha = 0.25; // Make them semi-transparent
        for (let asteroid of this.backgroundAsteroids) {
            asteroid.draw(this.ctx);
        }
        this.ctx.restore();

        // Title text
        this.ctx.fillStyle = isDark ? '#e0e0e0' : '#000';
        this.ctx.font = 'bold 66px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)';
        this.ctx.shadowBlur = 8;
        this.ctx.fillText('TYPE & LEARN', this.width / 2, this.height / 2 - 90);

        // Subtitle tagline
        this.ctx.font = 'bold 22px Courier New';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText('WORD SPRINT TYPING GAME', this.width / 2, this.height / 2 - 50);

        // Subtitle
        this.ctx.fillStyle = isDark ? '#aaa' : '#666';
        this.ctx.font = '18px Courier New';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText('Type to Destroy', this.width / 2, this.height / 2 - 10);

        // Play button
        const btn = this.playButton;

        // Button shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 4;

        // Button background
        this.ctx.fillStyle = isDark ? '#444' : '#000';
        this.ctx.fillRect(
            btn.x - btn.width / 2,
            btn.y - btn.height / 2,
            btn.width,
            btn.height
        );

        // Button border (lighter for depth)
        this.ctx.strokeStyle = isDark ? '#666' : '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            btn.x - btn.width / 2,
            btn.y - btn.height / 2,
            btn.width,
            btn.height
        );

        // Button text
        this.ctx.fillStyle = isDark ? '#e0e0e0' : '#fff';
        this.ctx.font = 'bold 28px Courier New';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillText('PLAY', btn.x, btn.y);

        // Manage Vocabulary button
        const manageBtn = this.manageVocabButton;

        // Button shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetY = 3;

        // Button background
        this.ctx.fillStyle = isDark ? '#3a3a3a' : '#333';
        this.ctx.fillRect(
            manageBtn.x - manageBtn.width / 2,
            manageBtn.y - manageBtn.height / 2,
            manageBtn.width,
            manageBtn.height
        );

        // Button border
        this.ctx.strokeStyle = isDark ? '#555' : '#666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            manageBtn.x - manageBtn.width / 2,
            manageBtn.y - manageBtn.height / 2,
            manageBtn.width,
            manageBtn.height
        );

        // Button text
        this.ctx.fillStyle = isDark ? '#ccc' : '#eee';
        this.ctx.font = 'bold 18px Courier New';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillText('Manage Vocabulary', manageBtn.x, manageBtn.y);

        // Instructions
        this.ctx.fillStyle = isDark ? '#888' : '#999';
        this.ctx.font = '16px Courier New';
        this.ctx.fillText('Type words to destroy asteroids and improve your English skills.', this.width / 2, this.height - 45);

        this.ctx.restore();
    }

    drawVocabularySelection() {
        this.ctx.save();

        const isDark = this.isDarkMode();

        // Background
        this.ctx.fillStyle = isDark ? '#2a2a2a' : '#fff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw subtle grid background
        this.drawGrid();

        // Draw background asteroids with transparency
        this.ctx.save();
        this.ctx.globalAlpha = 0.25; // Make them semi-transparent
        for (let asteroid of this.backgroundAsteroids) {
            asteroid.draw(this.ctx);
        }
        this.ctx.restore();

        // Title text
        this.ctx.fillStyle = isDark ? '#e0e0e0' : '#000';
        this.ctx.font = 'bold 48px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)';
        this.ctx.shadowBlur = 8;
        this.ctx.fillText('Choose Vocabulary', this.width / 2, this.height / 2 - 100);

        // Subtitle
        this.ctx.fillStyle = isDark ? '#aaa' : '#666';
        this.ctx.font = '18px Courier New';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText('Select a vocabulary set to begin', this.width / 2, this.height / 2 - 50);

        // Vocabulary buttons
        const everydayBtn = this.vocabularyButtons.everyday;
        const ingBtn = this.vocabularyButtons.ingVerbs;

        // Everyday words button
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetY = 2;

        const everydaySelected = this.selectedVocabulary === 'everyday';
        this.ctx.fillStyle = everydaySelected ? (isDark ? '#555' : '#000') : (isDark ? '#333' : '#fff');
        this.ctx.fillRect(
            everydayBtn.x - everydayBtn.width / 2,
            everydayBtn.y - everydayBtn.height / 2,
            everydayBtn.width,
            everydayBtn.height
        );

        this.ctx.strokeStyle = everydaySelected ? (isDark ? '#888' : '#333') : (isDark ? '#555' : '#ccc');
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            everydayBtn.x - everydayBtn.width / 2,
            everydayBtn.y - everydayBtn.height / 2,
            everydayBtn.width,
            everydayBtn.height
        );

        this.ctx.fillStyle = everydaySelected ? (isDark ? '#e0e0e0' : '#fff') : (isDark ? '#aaa' : '#333');
        this.ctx.font = 'bold 16px Courier New';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillText('Everyday Words', everydayBtn.x, everydayBtn.y);

        // Verbs button
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetY = 2;

        const ingSelected = this.selectedVocabulary === 'ing-verbs';
        this.ctx.fillStyle = ingSelected ? (isDark ? '#555' : '#000') : (isDark ? '#333' : '#fff');
        this.ctx.fillRect(
            ingBtn.x - ingBtn.width / 2,
            ingBtn.y - ingBtn.height / 2,
            ingBtn.width,
            ingBtn.height
        );

        this.ctx.strokeStyle = ingSelected ? (isDark ? '#888' : '#333') : (isDark ? '#555' : '#ccc');
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            ingBtn.x - ingBtn.width / 2,
            ingBtn.y - ingBtn.height / 2,
            ingBtn.width,
            ingBtn.height
        );

        this.ctx.fillStyle = ingSelected ? (isDark ? '#e0e0e0' : '#fff') : (isDark ? '#aaa' : '#333');
        this.ctx.font = 'bold 16px Courier New';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillText('Verbs', ingBtn.x, ingBtn.y);

        // Custom vocabulary button
        const customBtn = this.vocabularyButtons.custom;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetY = 2;

        const customSelected = this.selectedVocabulary === 'custom';
        const hasCustomWords = this.customVocabulary.length > 0;

        // Disable if no custom words
        this.ctx.fillStyle = !hasCustomWords ? (isDark ? '#222' : '#ddd') :
                             customSelected ? (isDark ? '#555' : '#000') : (isDark ? '#333' : '#fff');
        this.ctx.fillRect(
            customBtn.x - customBtn.width / 2,
            customBtn.y - customBtn.height / 2,
            customBtn.width,
            customBtn.height
        );

        this.ctx.strokeStyle = !hasCustomWords ? (isDark ? '#333' : '#bbb') :
                               customSelected ? (isDark ? '#888' : '#333') : (isDark ? '#555' : '#ccc');
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            customBtn.x - customBtn.width / 2,
            customBtn.y - customBtn.height / 2,
            customBtn.width,
            customBtn.height
        );

        this.ctx.fillStyle = !hasCustomWords ? (isDark ? '#555' : '#999') :
                             customSelected ? (isDark ? '#e0e0e0' : '#fff') : (isDark ? '#aaa' : '#333');
        this.ctx.font = 'bold 16px Courier New';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        const customText = hasCustomWords ? `Custom (${this.customVocabulary.length} words)` : 'Custom (empty)';
        this.ctx.fillText(customText, customBtn.x, customBtn.y);

        // Confirm button
        const confirmBtn = this.confirmButton;

        // Button shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 4;

        // Button background
        this.ctx.fillStyle = isDark ? '#444' : '#000';
        this.ctx.fillRect(
            confirmBtn.x - confirmBtn.width / 2,
            confirmBtn.y - confirmBtn.height / 2,
            confirmBtn.width,
            confirmBtn.height
        );

        // Button border
        this.ctx.strokeStyle = isDark ? '#666' : '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            confirmBtn.x - confirmBtn.width / 2,
            confirmBtn.y - confirmBtn.height / 2,
            confirmBtn.width,
            confirmBtn.height
        );

        // Button text
        this.ctx.fillStyle = isDark ? '#e0e0e0' : '#fff';
        this.ctx.font = 'bold 24px Courier New';
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillText('START GAME', confirmBtn.x, confirmBtn.y);

        // Instructions
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Courier New';
        this.ctx.fillText('Select vocabulary and click START GAME', this.width / 2, this.height - 60);

        // Draw back button last so it's visible on top
        const backBtn = this.vocabularyBackButton;
        this.ctx.save();
        this.ctx.strokeStyle = isDark ? '#fff' : '#000';
        this.ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.92)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(backBtn.x, backBtn.y, backBtn.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = isDark ? '#fff' : '#000';
        this.ctx.font = 'bold 11px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('BACK', backBtn.x, backBtn.y + 1);
        this.ctx.restore();

        this.ctx.restore();
    }

    drawVocabularyManagement() {
        this.ctx.save();

        const isDark = this.isDarkMode();

        // Background
        this.ctx.fillStyle = isDark ? '#2a2a2a' : '#fff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw subtle grid background
        this.drawGrid();

        // Title
        this.ctx.fillStyle = isDark ? '#e0e0e0' : '#000';
        this.ctx.font = 'bold 36px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)';
        this.ctx.shadowBlur = 6;
        this.ctx.fillText('Manage Custom Vocabulary', this.width / 2, 40);

        // Subtitle
        this.ctx.fillStyle = isDark ? '#aaa' : '#666';
        this.ctx.font = '14px Courier New';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(`${this.customVocabulary.length} words`, this.width / 2, 70);

        // Table header
        const tableX = 100;
        const tableY = 110;
        const colWidth = 300;
        const rowHeight = 30;

        this.ctx.fillStyle = isDark ? '#444' : '#eee';
        this.ctx.fillRect(tableX, tableY, colWidth, rowHeight);
        this.ctx.fillRect(tableX + colWidth, tableY, colWidth, rowHeight);

        this.ctx.strokeStyle = isDark ? '#666' : '#ccc';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(tableX, tableY, colWidth, rowHeight);
        this.ctx.strokeRect(tableX + colWidth, tableY, colWidth, rowHeight);

        this.ctx.fillStyle = isDark ? '#e0e0e0' : '#000';
        this.ctx.font = 'bold 14px Courier New';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('English Word', tableX + 10, tableY + rowHeight / 2 + 5);
        this.ctx.fillText('Thai Translation', tableX + colWidth + 10, tableY + rowHeight / 2 + 5);

        // Display vocabulary (scrollable)
        const maxVisibleRows = 10;
        const startIndex = Math.floor(this.vocabManagementScroll);
        const endIndex = Math.min(startIndex + maxVisibleRows, this.customVocabulary.length);

        for (let i = startIndex; i < endIndex; i++) {
            const entry = this.customVocabulary[i];
            const y = tableY + rowHeight + (i - startIndex) * rowHeight;

            // Row background
            const isHovered = i === this.vocabHoveredRow;
            this.ctx.fillStyle = isHovered ? (isDark ? '#333' : '#f5f5f5') : (isDark ? '#2a2a2a' : '#fff');
            this.ctx.fillRect(tableX, y, colWidth * 2, rowHeight);

            // Borders
            this.ctx.strokeStyle = isDark ? '#555' : '#ddd';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(tableX, y, colWidth, rowHeight);
            this.ctx.strokeRect(tableX + colWidth, y, colWidth, rowHeight);

            // Text
            this.ctx.fillStyle = isDark ? '#ddd' : '#333';
            this.ctx.font = '13px Courier New';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(entry.word, tableX + 10, y + rowHeight / 2 + 5);
            this.ctx.fillText(entry.thai, tableX + colWidth + 10, y + rowHeight / 2 + 5);

            // Delete button (X)
            const deleteX = tableX + colWidth * 2 - 25;
            const deleteY = y + rowHeight / 2;
            const deleteRadius = 10;

            this.ctx.beginPath();
            this.ctx.arc(deleteX, deleteY, deleteRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = isHovered ? (isDark ? '#600' : '#fcc') : (isDark ? '#444' : '#eee');
            this.ctx.fill();
            this.ctx.strokeStyle = isDark ? '#800' : '#c66';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            this.ctx.strokeStyle = isDark ? '#f88' : '#800';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(deleteX - 4, deleteY - 4);
            this.ctx.lineTo(deleteX + 4, deleteY + 4);
            this.ctx.moveTo(deleteX + 4, deleteY - 4);
            this.ctx.lineTo(deleteX - 4, deleteY + 4);
            this.ctx.stroke();
        }

        // Action buttons at bottom
        const btnY = 500;
        const btnWidth = 150;
        const btnHeight = 40;
        const btnSpacing = 20;

        const buttons = [
            { label: 'Add Word', x: 100 },
            { label: 'Import CSV', x: 100 + btnWidth + btnSpacing },
            { label: 'Export CSV', x: 100 + (btnWidth + btnSpacing) * 2 },
            { label: 'Back to Menu', x: 100 + (btnWidth + btnSpacing) * 3 }
        ];

        buttons.forEach(btn => {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = 6;
            this.ctx.shadowOffsetY = 2;

            this.ctx.fillStyle = isDark ? '#444' : '#000';
            this.ctx.fillRect(btn.x, btnY, btnWidth, btnHeight);

            this.ctx.strokeStyle = isDark ? '#666' : '#333';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btn.x, btnY, btnWidth, btnHeight);

            this.ctx.shadowColor = 'transparent';
            this.ctx.fillStyle = isDark ? '#e0e0e0' : '#fff';
            this.ctx.font = 'bold 14px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(btn.label, btn.x + btnWidth / 2, btnY + btnHeight / 2 + 5);
        });

        // Instructions
        this.ctx.fillStyle = isDark ? '#888' : '#999';
        this.ctx.font = '12px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Click "Add Word" to add entries, or import from CSV', this.width / 2, 560);

        this.ctx.restore();
    }

    drawGameOver() {
        this.ctx.save();

        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Game Over text
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 60px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 6;
        this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 40);

        // Final score
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 30px Courier New';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(
            `Final Score: ${this.score}`,
            this.width / 2,
            this.height / 2 + 20
        );

        // Restart instruction
        this.ctx.fillStyle = '#666';
        this.ctx.font = '20px Courier New';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(
            'Press R to Restart',
            this.width / 2,
            this.height / 2 + 70
        );

        // Menu instruction
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Courier New';
        this.ctx.fillText(
            'Press ESC for Menu',
            this.width / 2,
            this.height / 2 + 105
        );

        this.ctx.restore();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;

        // Update level display (formerly difficulty)
        const difficultyEl = document.getElementById('difficulty');
        if (difficultyEl) {
            const targetValue = `${this.level}`;
            const queuedValue = difficultyEl.dataset.nextValue || difficultyEl.textContent;

            if (targetValue !== queuedValue) {
                difficultyEl.dataset.nextValue = targetValue;
            }

            if (difficultyEl.dataset.animating !== 'true') {
                const nextValue = difficultyEl.dataset.nextValue || targetValue;

                if (difficultyEl.textContent !== nextValue) {
                    difficultyEl.dataset.animating = 'true';

                    const handlePopEnd = (event) => {
                        if (event.animationName !== 'difficultyPopIn') return;
                        difficultyEl.removeEventListener('animationend', handlePopEnd);
                        difficultyEl.classList.remove('difficulty-pop-in');
                        difficultyEl.dataset.animating = 'false';
                        delete difficultyEl.dataset.nextValue;
                    };

                    const handleFadeEnd = (event) => {
                        if (event.animationName !== 'difficultyFadeOut') return;
                        difficultyEl.removeEventListener('animationend', handleFadeEnd);
                        difficultyEl.classList.remove('difficulty-fade-out');
                        difficultyEl.textContent = difficultyEl.dataset.nextValue || nextValue;
                        // Force reflow so the pop animation restarts reliably
                        void difficultyEl.offsetWidth;
                        difficultyEl.addEventListener('animationend', handlePopEnd);
                        difficultyEl.classList.add('difficulty-pop-in');
                    };

                    difficultyEl.addEventListener('animationend', handleFadeEnd);
                    difficultyEl.classList.remove('difficulty-fade-out');
                    // Trigger reflow before adding the fade class again
                    void difficultyEl.offsetWidth;
                    difficultyEl.classList.add('difficulty-fade-out');
                } else {
                    difficultyEl.textContent = nextValue;
                    delete difficultyEl.dataset.nextValue;
                }
            }
        }

        // Update WPM display (formerly status)
        // Shows the game's current word spawning rate (words per minute)
        const statusEl = document.getElementById('status');
        if (this.state === 'playing') {
            statusEl.textContent = this.wordsPerMinuteTarget;
        } else {
            statusEl.textContent = '0';
        }
    }

    gameLoop(currentTime = 0) {
        // Calculate delta time (not used but available for frame-rate independence)
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update and draw
        this.update();
        this.draw();

        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Start the game when page loads
window.addEventListener('load', async () => {
    console.log('=== Game Initialization Starting ===');
    console.log('Vocabulary will be loaded on demand when user clicks PLAY');

    // Create the game instance (vocabulary loads on play button click)
    window.game = new Game();
    console.log('=== Game Menu Ready ===');
});
