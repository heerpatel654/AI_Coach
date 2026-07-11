// games.js — Word Search Game

// ─────────────────────────────────────────────
// WORD BANK — words are picked by difficulty
// All words here are also practised via TTS when found
// ─────────────────────────────────────────────
const GAME_WORDS = {
    easy: [
        "CAT", "DOG", "SUN", "BUS", "HAT",
        "BED", "CUP", "PIG", "FOX", "HEN",
    ],
    medium: [
        "APPLE", "HAPPY", "TIGER", "WATER", "SMILE",
        "RABBIT", "YELLOW", "MONKEY", "PENCIL", "BASKET",
    ],
    hard: [
        "ELEPHANT", "RAINBOW", "COMPUTER", "VACATION",
        "UMBRELLA", "BUTTERFLY", "CROCODILE", "PORCUPINE",
    ],
};

function initGamesMode() {
    const wordSearchGrid  = document.getElementById('word-search-grid');
    const wordsToFindList = document.getElementById('words-to-find');
    const gameDiffBtns    = document.querySelectorAll('.game-diff-btn');
    const newGameBtn      = document.getElementById('new-game-btn');

    if (!wordSearchGrid) return;

    let gameDifficulty = 'easy';
    let placedWords    = [];

    const gridSizes = { easy: 6, medium: 9, hard: 11 };

    // ── Difficulty buttons ─────────────────────────
    gameDiffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            gameDiffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameDifficulty = btn.dataset.diff;
            startWordSearch();
        });
    });

    if (newGameBtn) newGameBtn.addEventListener('click', startWordSearch);

    // ── Build grid ─────────────────────────────────
    function startWordSearch() {
        const size  = gridSizes[gameDifficulty];
        // Pick 5 random words from the bank for this difficulty
        const allWords = [...GAME_WORDS[gameDifficulty]];
        const words = shuffle(allWords).slice(0, 5);

        wordSearchGrid.style.display = 'grid';
        wordSearchGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        wordSearchGrid.innerHTML = '';
        if (wordsToFindList) wordsToFindList.innerHTML = '';
        placedWords = [];

        const grid = Array(size).fill(null).map(() => Array(size).fill(''));

        // Place each word
        words.forEach(word => {
            let placed = false, attempts = 0;
            while (!placed && attempts < 200) {
                attempts++;
                const dir = Math.random() > 0.5 ? 'H' : 'V';
                const row = Math.floor(Math.random() * (dir === 'V' ? size - word.length + 1 : size));
                const col = Math.floor(Math.random() * (dir === 'H' ? size - word.length + 1 : size));

                if (canPlace(grid, word, row, col, dir, size)) {
                    placeWord(grid, word, row, col, dir);
                    const cells = [];
                    for (let i = 0; i < word.length; i++) {
                        cells.push(dir === 'H' ? `${row}-${col + i}` : `${row + i}-${col}`);
                    }
                    placedWords.push({ word, cells, found: false });
                    placed = true;
                }
            }

            if (wordsToFindList) {
                const li = document.createElement('li');
                li.id = `find-${word}`;
                li.textContent = word;
                wordsToFindList.appendChild(li);
            }
        });

        // Fill blanks and render cells
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (!grid[i][j]) grid[i][j] = letters[Math.floor(Math.random() * letters.length)];
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.textContent = grid[i][j];
                cell.dataset.pos = `${i}-${j}`;
                cell.addEventListener('click', handleCellClick);
                wordSearchGrid.appendChild(cell);
            }
        }
    }

    function canPlace(grid, word, row, col, dir, size) {
        if (dir === 'H' && col + word.length > size) return false;
        if (dir === 'V' && row + word.length > size) return false;
        for (let i = 0; i < word.length; i++) {
            const r = dir === 'V' ? row + i : row;
            const c = dir === 'H' ? col + i : col;
            if (grid[r][c] && grid[r][c] !== word[i]) return false;
        }
        return true;
    }

    function placeWord(grid, word, row, col, dir) {
        for (let i = 0; i < word.length; i++) {
            if (dir === 'H') grid[row][col + i] = word[i];
            else grid[row + i][col] = word[i];
        }
    }

    function handleCellClick(e) {
        const cell = e.target;
        if (cell.classList.contains('found')) return;
        cell.classList.toggle('selected');
        checkFoundWords();
    }

    function checkFoundWords() {
        const selected = new Set(
            Array.from(document.querySelectorAll('.grid-cell.selected')).map(c => c.dataset.pos)
        );

        placedWords.forEach(obj => {
            if (obj.found) return;
            if (obj.cells.every(pos => selected.has(pos))) {
                obj.found = true;
                obj.cells.forEach(pos => {
                    const cell = document.querySelector(`[data-pos="${pos}"]`);
                    if (cell) { cell.classList.remove('selected'); cell.classList.add('found'); }
                });

                const wordEl = document.getElementById(`find-${obj.word}`);
                if (wordEl) { wordEl.style.textDecoration = 'line-through'; wordEl.style.color = 'var(--good)'; }

                // Pronounce the word when found — reinforces learning
                playTTS(`Great job! You found ${obj.word}!`);
                if (window.triggerConfetti) triggerConfetti();

                // Check if all words found
                if (placedWords.every(w => w.found)) {
                    setTimeout(() => playTTS("Amazing! You found all the words! Well done!"), 1500);
                }
            }
        });
    }

    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    window.startWordSearch = startWordSearch;
    startWordSearch();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGamesMode);
} else {
    initGamesMode();
}