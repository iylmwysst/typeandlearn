// Word bank - will be populated from vocabulary.csv
const WORD_BANK = {
    'a': [], 'b': [], 'c': [], 'd': [], 'e': [], 'f': [], 'g': [], 'h': [], 'i': [], 'j': [],
    'k': [], 'l': [], 'm': [], 'n': [], 'o': [], 'p': [], 'q': [], 'r': [], 's': [], 't': [],
    'u': [], 'v': [], 'w': [], 'x': [], 'y': [], 'z': []
};

let allWordsCache = [];
let wordsByLength = {}; // Cache words by length for faster lookup

// Word appearance tracking for weighted selection
const wordStats = new Map(); // { word: { count: 0, lastSeen: 0 } }
let asteroidCounter = 0; // Global counter for tracking word appearance order

// Easter egg fallback words used when vocabulary fails to load (menu background, etc.)
const FALLBACK_EASTER_EGG = "if you love me won't you say something".split(' ');
let fallbackIndex = 0;

function getFallbackWord() {
    const word = FALLBACK_EASTER_EGG[fallbackIndex % FALLBACK_EASTER_EGG.length];
    fallbackIndex += 1;
    return word;
}

// Load words from vocabulary CSV
async function loadWordsFromVocabulary(vocabularyType = 'everyday') {
    try {
        const filename = vocabularyType === 'ing-verbs' ? 'assets/data/vocabulary-ing-verbs.csv' : 'assets/data/vocabulary.csv';
        console.log(`Loading words from ${filename}...`);

        // Clear existing word bank
        for (let letter in WORD_BANK) {
            WORD_BANK[letter] = [];
        }

        const response = await fetch(filename);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        console.log('CSV loaded, parsing...');

        const lines = csvText.trim().split('\n');
        console.log(`Found ${lines.length} lines in CSV`);

        // Skip header row
        let wordsLoaded = 0;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            if (parts.length >= 2) {
                const word = parts[0].trim().toLowerCase();
                if (word && word.length > 0) {
                    const firstLetter = word[0].toLowerCase();
                    if (WORD_BANK[firstLetter]) {
                        WORD_BANK[firstLetter].push(word);
                        wordsLoaded++;
                    }
                }
            }
        }

        // Build caches
        rebuildCaches();

        // Load word stats from localStorage
        loadWordStats();

        console.log(`Successfully loaded ${allWordsCache.length} words into word bank`);
        console.log('Sample words:', allWordsCache.slice(0, 10));
    } catch (error) {
        console.error('Error loading words from vocabulary:', error);
    }
}

// Load words from custom vocabulary array
async function loadWordsFromCustom(customVocabulary) {
    try {
        console.log('Loading words from custom vocabulary...');

        // Clear existing word bank
        for (let letter in WORD_BANK) {
            WORD_BANK[letter] = [];
        }

        // Populate word bank from custom vocabulary
        let wordsLoaded = 0;
        for (const entry of customVocabulary) {
            const word = entry.word.toLowerCase();
            if (word && word.length > 0) {
                const firstLetter = word[0].toLowerCase();
                if (WORD_BANK[firstLetter]) {
                    WORD_BANK[firstLetter].push(word);
                    wordsLoaded++;
                }
            }
        }

        // Build caches
        rebuildCaches();

        // Load word stats from localStorage
        loadWordStats();

        console.log(`Successfully loaded ${allWordsCache.length} custom words into word bank`);
        console.log('Sample words:', allWordsCache.slice(0, 10));
    } catch (error) {
        console.error('Error loading custom vocabulary:', error);
    }
}

function rebuildCaches() {
    // Rebuild all words cache
    allWordsCache = [];
    for (let letter in WORD_BANK) {
        allWordsCache.push(...WORD_BANK[letter]);
    }

    // Rebuild words by length cache
    wordsByLength = {};
    for (const word of allWordsCache) {
        const len = word.length;
        if (!wordsByLength[len]) {
            wordsByLength[len] = [];
        }
        wordsByLength[len].push(word);
    }
}

// Get all words as a flat array
function getAllWords() {
    return allWordsCache;
}

// Get random word from entire word bank
function getRandomWord() {
    if (allWordsCache.length === 0) {
        console.warn('Word bank is empty! Words may not be loaded yet.');
        return getFallbackWord();
    }
    return allWordsCache[Math.floor(Math.random() * allWordsCache.length)];
}

// Get random word starting with specific letter
function getRandomWordStartingWith(letter) {
    letter = letter.toLowerCase();
    if (WORD_BANK[letter] && WORD_BANK[letter].length > 0) {
        const words = WORD_BANK[letter];
        return words[Math.floor(Math.random() * words.length)];
    }
    return getRandomWord();
}

// Get random word by length range (with weighted selection)
function getWordByLengthRange(minLength, maxLength) {
    const validWords = allWordsCache.filter(w => w.length >= minLength && w.length <= maxLength);
    if (validWords.length === 0) return getRandomWord();

    // Use weighted selection to prioritize unseen/less frequent words
    return weightedRandomSelection(validWords);
}

// Get word by exact length (optimized with cache)
function getWordByExactLength(length) {
    if (wordsByLength[length] && wordsByLength[length].length > 0) {
        const words = wordsByLength[length];
        return words[Math.floor(Math.random() * words.length)];
    }
    return null;
}

// Get words within a length range
function getWordsByLengthRange(minLength, maxLength) {
    return allWordsCache.filter(w => w.length >= minLength && w.length <= maxLength);
}

// Get available word lengths
function getAvailableWordLengths() {
    return Object.keys(wordsByLength).map(Number).sort((a, b) => a - b);
}

// === WEIGHTED WORD SELECTION SYSTEM ===

// Initialize word stats from localStorage
function loadWordStats() {
    try {
        const saved = localStorage.getItem('wordStats');
        if (saved) {
            const data = JSON.parse(saved);
            for (const [word, stats] of Object.entries(data)) {
                wordStats.set(word, stats);
            }
            console.log(`Loaded stats for ${wordStats.size} words from localStorage`);
        }
    } catch (error) {
        console.warn('Failed to load word stats:', error);
    }
}

// Save word stats to localStorage
function saveWordStats() {
    try {
        const data = Object.fromEntries(wordStats);
        localStorage.setItem('wordStats', JSON.stringify(data));
    } catch (error) {
        console.warn('Failed to save word stats:', error);
    }
}

// Calculate weight for a word based on appearance history
function calculateWordWeight(word) {
    const stats = wordStats.get(word);

    if (!stats) {
        // Unseen word - highest priority
        return 10.0;
    }

    // Base weight based on appearance count
    let weight;
    if (stats.count === 1) {
        weight = 5.0;
    } else if (stats.count <= 3) {
        weight = 2.0;
    } else {
        weight = 1.0;
    }

    // Apply recency penalty (last 5 words get 70% reduction)
    const recencyWindow = 5;
    if (asteroidCounter - stats.lastSeen <= recencyWindow) {
        weight *= 0.3;
    }

    return weight;
}

// Weighted random selection from array
function weightedRandomSelection(words) {
    if (words.length === 0) return null;
    if (words.length === 1) return words[0];

    // Calculate weights for all words
    const weights = words.map(word => calculateWordWeight(word));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Select random point in weight distribution
    let random = Math.random() * totalWeight;

    for (let i = 0; i < words.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return words[i];
        }
    }

    return words[words.length - 1];
}

// Track word usage
function trackWordUsage(word) {
    asteroidCounter++;

    if (!wordStats.has(word)) {
        wordStats.set(word, { count: 1, lastSeen: asteroidCounter });
    } else {
        const stats = wordStats.get(word);
        stats.count++;
        stats.lastSeen = asteroidCounter;
    }

    // Save to localStorage every 10 words
    if (asteroidCounter % 10 === 0) {
        saveWordStats();
    }
}

// Get word stats for debugging
function getWordStats(word) {
    return wordStats.get(word) || { count: 0, lastSeen: 0 };
}

// Reset word stats (for testing or new learning session)
function resetWordStats() {
    wordStats.clear();
    asteroidCounter = 0;
    localStorage.removeItem('wordStats');
    console.log('Word stats reset');
}
