/**
 * Vocabulary Manager
 * Loads and manages word translations from CSV
 */

class VocabularyManager {
    constructor() {
        this.vocabularyMap = new Map();
        this.translationListElement = null;
        this.maxDisplayItems = 50; // Limit display to prevent performance issues

        // Quick Snap system - track last 5 translations
        this.recentTranslations = [];
        this.maxRecentTranslations = 5;
    }

    /**
     * Initialize the vocabulary manager
     */
    async init(vocabularyType = 'everyday') {
        this.translationListElement = document.getElementById('translationList');
        await this.loadVocabulary(vocabularyType);
    }

    /**
     * Load vocabulary from CSV file
     */
    async loadVocabulary(vocabularyType = 'everyday') {
        try {
            const filename = vocabularyType === 'ing-verbs' ? 'assets/data/vocabulary-ing-verbs.csv' : 'assets/data/vocabulary.csv';
            console.log(`VocabularyManager: Loading ${filename}...`);

            // Clear existing vocabulary
            this.vocabularyMap.clear();

            const response = await fetch(filename);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvText = await response.text();
            console.log('VocabularyManager: CSV loaded, parsing...');

            // Parse CSV
            const lines = csvText.trim().split('\n');
            console.log(`VocabularyManager: Found ${lines.length} lines`);

            // Skip header row
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Split by comma, but handle Thai text properly
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const word = parts[0].trim().toLowerCase();
                    const thai = parts[1].trim();

                    if (word && thai) {
                        this.vocabularyMap.set(word, {
                            word: parts[0].trim(), // Keep original case for display
                            thai: thai
                        });
                    }
                }
            }

            console.log(`VocabularyManager: Loaded ${this.vocabularyMap.size} vocabulary entries`);
            console.log('VocabularyManager: Sample entries:', Array.from(this.vocabularyMap.keys()).slice(0, 5));
        } catch (error) {
            console.error('VocabularyManager: Error loading vocabulary:', error);
        }
    }

    /**
     * Initialize with custom vocabulary array
     */
    async initCustom(customVocabulary) {
        this.translationListElement = document.getElementById('translationList');
        await this.loadCustomVocabulary(customVocabulary);
    }

    /**
     * Load vocabulary from custom array
     */
    async loadCustomVocabulary(customVocabulary) {
        try {
            console.log('VocabularyManager: Loading custom vocabulary...');

            // Clear existing vocabulary
            this.vocabularyMap.clear();

            // Populate from custom array
            for (const entry of customVocabulary) {
                const word = entry.word.toLowerCase();
                const thai = entry.thai;

                if (word && thai) {
                    this.vocabularyMap.set(word, {
                        word: entry.word, // Keep original case for display
                        thai: thai
                    });
                }
            }

            console.log(`VocabularyManager: Loaded ${this.vocabularyMap.size} custom vocabulary entries`);
            console.log('VocabularyManager: Sample entries:', Array.from(this.vocabularyMap.keys()).slice(0, 5));
        } catch (error) {
            console.error('VocabularyManager: Error loading custom vocabulary:', error);
        }
    }

    /**
     * Add a word translation to the display
     * @param {string} word - The English word
     */
    addTranslation(word) {
        console.log(`Attempting to add translation for: "${word}"`);
        const wordLower = word.toLowerCase();
        const vocab = this.vocabularyMap.get(wordLower);

        if (!vocab) {
            console.warn(`No translation found for: "${word}" (lowercase: "${wordLower}")`);
            console.log(`Vocabulary map size: ${this.vocabularyMap.size}`);
            console.log(`Sample entries:`, Array.from(this.vocabularyMap.keys()).slice(0, 10));
            return;
        }

        console.log(`Found translation: ${vocab.word} -> ${vocab.thai}`);

        // Add to recent translations for Quick Snap
        this.addToRecentTranslations(vocab);

        // Remove empty state message if it exists
        const emptyState = this.translationListElement.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        // Create translation item
        const item = document.createElement('div');
        item.className = 'translation-item new';

        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        wordDiv.textContent = vocab.word;

        const thaiDiv = document.createElement('div');
        thaiDiv.className = 'thai';
        thaiDiv.textContent = vocab.thai;

        item.appendChild(wordDiv);
        item.appendChild(thaiDiv);

        // Add to top of list
        this.translationListElement.insertBefore(item, this.translationListElement.firstChild);

        // Remove 'new' class after animation
        setTimeout(() => {
            item.classList.remove('new');
        }, 300);

        // Limit the number of displayed items
        this.pruneDisplayList();

        // Auto-scroll to top
        this.translationListElement.scrollTop = 0;
    }

    /**
     * Add translation to recent translations list (for Quick Snap)
     * @param {object} vocab - The vocabulary object {word, thai}
     */
    addToRecentTranslations(vocab) {
        // Add to front of array
        this.recentTranslations.unshift({
            word: vocab.word,
            thai: vocab.thai
        });

        // Keep only the most recent N items
        if (this.recentTranslations.length > this.maxRecentTranslations) {
            this.recentTranslations = this.recentTranslations.slice(0, this.maxRecentTranslations);
        }

        // Update Quick Snap display if it's visible
        this.updateQuickSnap();
    }

    /**
     * Update Quick Snap overlay with recent translations
     */
    updateQuickSnap() {
        const quickSnapList = document.getElementById('quickSnapList');
        if (!quickSnapList) return;

        // Clear existing content
        quickSnapList.innerHTML = '';

        // Add recent translations
        this.recentTranslations.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `quick-snap-item ${index === 0 ? 'latest' : ''}`;

            const wordSpan = document.createElement('span');
            wordSpan.className = 'qs-word';
            wordSpan.textContent = item.word;

            const thaiSpan = document.createElement('span');
            thaiSpan.className = 'qs-thai';
            thaiSpan.textContent = item.thai;

            itemDiv.appendChild(wordSpan);
            itemDiv.appendChild(thaiSpan);
            quickSnapList.appendChild(itemDiv);
        });
    }

    /**
     * Get recent translations for Quick Snap
     * @returns {Array} - Array of recent translation objects
     */
    getRecentTranslations() {
        return this.recentTranslations;
    }

    /**
     * Remove excess items from display to prevent performance issues
     */
    pruneDisplayList() {
        const items = this.translationListElement.querySelectorAll('.translation-item');
        if (items.length > this.maxDisplayItems) {
            for (let i = this.maxDisplayItems; i < items.length; i++) {
                items[i].remove();
            }
        }
    }

    /**
     * Clear all translations from display
     */
    clearDisplay() {
        this.translationListElement.innerHTML = '<p class="empty-state">Complete words to see translations</p>';
        // Also clear recent translations for Quick Snap
        this.recentTranslations = [];
        this.updateQuickSnap();
    }

    /**
     * Get translation for a word (for other uses)
     * @param {string} word - The English word
     * @returns {object|null} - The vocabulary object or null
     */
    getTranslation(word) {
        return this.vocabularyMap.get(word.toLowerCase()) || null;
    }
}

// Create global vocabulary manager instance
const vocabularyManager = new VocabularyManager();
