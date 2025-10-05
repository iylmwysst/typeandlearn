// Sound Manager for game audio
class SoundManager {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
        this.sfxVolume = 0.3; // Sound effects at 30% volume (reduced by 40%)
        this.soundPools = {};

        // Load all sounds
        this.loadSounds();
    }

    loadSounds() {
        // Sound effects (not looping)
        this.sounds.buttonSound = new Audio('sound/buttonsound.mp3');
        this.sounds.buttonSound.preload = 'auto';
        this.sounds.buttonSound.volume = this.sfxVolume;

        this.sounds.gaugeFull = new Audio('sound/guagefull.mp3');
        this.sounds.gaugeFull.preload = 'auto';
        this.sounds.gaugeFull.volume = this.sfxVolume * 0.8; // Slightly quieter

        this.sounds.score1 = new Audio('sound/score1.mp3');
        this.sounds.score1.preload = 'auto';
        this.sounds.score1.volume = this.sfxVolume * 0.9;

        this.sounds.score2 = new Audio('sound/score2.mp3');
        this.sounds.score2.preload = 'auto';
        this.sounds.score2.volume = this.sfxVolume * 0.9;

        this.sounds.score3 = new Audio('sound/score3.mp3');
        this.sounds.score3.preload = 'auto';
        this.sounds.score3.volume = this.sfxVolume * 0.9;

        this.sounds.bulletFire = new Audio('sound/bullet.mp3');
        this.sounds.bulletFire.preload = 'auto';
        this.sounds.bulletFire.volume = this.sfxVolume * 0.8;

        this.sounds.levelUp = new Audio('sound/levelup.mp3');
        this.sounds.levelUp.preload = 'auto';
        this.sounds.levelUp.volume = this.sfxVolume * 0.85;

        // Build small audio pools for rapid-fire sounds
        this.createSoundPool('bulletFire', 8);
        this.createSoundPool('score1', 2);
        this.createSoundPool('score2', 2);
        this.createSoundPool('score3', 2);
    }

    createSoundPool(soundName, size = 4) {
        const base = this.sounds[soundName];
        if (!base) return;
        const pool = [];
        for (let i = 0; i < size; i++) {
            const clone = base.cloneNode(true);
            clone.volume = base.volume;
            clone.preload = 'auto';
            pool.push(clone);
        }
        this.soundPools[soundName] = {
            pool,
            index: 0,
            base
        };
    }

    playButtonSound() {
        if (this.isMuted) return;
        this.playSound('buttonSound');
    }

    playGaugeFull() {
        if (this.isMuted) return;
        this.playSound('gaugeFull');
    }

    playScoreChime() {
        if (this.isMuted) return;
        const clipIndex = Math.floor(Math.random() * 3) + 1; // 1-3
        const soundName = `score${clipIndex}`;
        this.playSound(soundName);
    }

    playBulletFire() {
        if (this.isMuted) return;
        this.playSound('bulletFire');
    }

    playLevelUp() {
        if (this.isMuted) return;
        this.playSound('levelUp');
    }

    playSound(soundName) {
        if (this.isMuted) return;

        const poolEntry = this.soundPools[soundName];
        if (poolEntry) {
            let audio = poolEntry.pool[poolEntry.index];
            let attempts = 0;
            while (audio && !audio.paused && !audio.ended && attempts < poolEntry.pool.length) {
                poolEntry.index = (poolEntry.index + 1) % poolEntry.pool.length;
                audio = poolEntry.pool[poolEntry.index];
                attempts++;
            }

            if (!audio || (!audio.paused && !audio.ended)) {
                audio = poolEntry.base.cloneNode(true);
                audio.volume = poolEntry.base.volume;
                audio.preload = 'auto';
                poolEntry.pool.push(audio);
                poolEntry.index = poolEntry.pool.length - 1;
            }

            poolEntry.index = (poolEntry.index + 1) % poolEntry.pool.length;

            try {
                audio.currentTime = 0;
                const playPromise = audio.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(err => console.log(`Sound ${soundName} play failed:`, err));
                }
            } catch (err) {
                console.log(`Sound ${soundName} play failed:`, err);
            }
            return;
        }

        const sound = this.sounds[soundName];
        if (!sound) return;

        try {
            sound.currentTime = 0;
            const playPromise = sound.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(err => console.log(`Sound ${soundName} play failed:`, err));
            }
        } catch (err) {
            console.log(`Sound ${soundName} play failed:`, err);
        }
    }

    setMute(muted) {
        this.isMuted = muted;
    }

    toggleMute() {
        this.setMute(!this.isMuted);
        return this.isMuted;
    }
}
