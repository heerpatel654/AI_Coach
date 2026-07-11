// kids.js — Kids Mode

// ─────────────────────────────────────────────
// WORD LIBRARY — add more words here freely
// Format: { word, emoji, phonetic (how it sounds), syllables (for coaching) }
// ─────────────────────────────────────────────
const KIDS_WORDS = {
    easy: [
        { word: "Cat",    emoji: "🐱", syllables: ["cat"],          phonetic: "Kuh - Aah - Tuh" },
        { word: "Dog",    emoji: "🐶", syllables: ["dog"],          phonetic: "Duh - Oh - Guh" },
        { word: "Sun",    emoji: "☀️", syllables: ["sun"],          phonetic: "Sss - Uh - Nnn" },
        { word: "Bus",    emoji: "🚌", syllables: ["bus"],          phonetic: "Buh - Uh - Sss" },
        { word: "Hat",    emoji: "🎩", syllables: ["hat"],          phonetic: "Huh - Aah - Tuh" },
        { word: "Bed",    emoji: "🛏️", syllables: ["bed"],          phonetic: "Buh - Eh - Duh" },
        { word: "Cup",    emoji: "☕", syllables: ["cup"],          phonetic: "Kuh - Uh - Puh" },
        { word: "Pig",    emoji: "🐷", syllables: ["pig"],          phonetic: "Puh - Ih - Guh" },
        { word: "Fox",    emoji: "🦊", syllables: ["fox"],          phonetic: "Fuh - Oh - Ks" },
        { word: "Hen",    emoji: "🐔", syllables: ["hen"],          phonetic: "Huh - Eh - Nnn" },
        { word: "Frog",   emoji: "🐸", syllables: ["frog"],         phonetic: "Fuh - Rrr - Oh - Guh" },
        { word: "Star",   emoji: "⭐", syllables: ["star"],         phonetic: "Sss - Tuh - Ahr" },
    ],
    medium: [
        { word: "Apple",    emoji: "🍎", syllables: ["ap","ple"],       phonetic: "Aaa - Pull" },
        { word: "Happy",    emoji: "😊", syllables: ["hap","py"],       phonetic: "Haa - Pee" },
        { word: "Tiger",    emoji: "🐯", syllables: ["ti","ger"],       phonetic: "Tie - Gur" },
        { word: "Flower",   emoji: "🌸", syllables: ["flow","er"],      phonetic: "Flow - Er" },
        { word: "Rabbit",   emoji: "🐰", syllables: ["rab","bit"],      phonetic: "Ra - Bit" },
        { word: "Yellow",   emoji: "💛", syllables: ["yel","low"],      phonetic: "Yeh - Low" },
        { word: "Monkey",   emoji: "🐒", syllables: ["mon","key"],      phonetic: "Mon - Kee" },
        { word: "Pencil",   emoji: "✏️", syllables: ["pen","cil"],      phonetic: "Pen - Sul" },
        { word: "Basket",   emoji: "🧺", syllables: ["bas","ket"],      phonetic: "Baa - Skit" },
        { word: "Garden",   emoji: "🌻", syllables: ["gar","den"],      phonetic: "Gar - Den" },
        { word: "Finger",   emoji: "👆", syllables: ["fin","ger"],      phonetic: "Fin - Ger" },
        { word: "Winter",   emoji: "❄️", syllables: ["win","ter"],      phonetic: "Win - Ter" },
    ],
    hard: [
        { word: "Elephant",   emoji: "🐘", syllables: ["el","e","phant"],      phonetic: "El - Eh - Fant" },
        { word: "Butterfly",  emoji: "🦋", syllables: ["but","ter","fly"],     phonetic: "But - Ter - Fly" },
        { word: "Rainbow",    emoji: "🌈", syllables: ["rain","bow"],          phonetic: "Rain - Bow" },
        { word: "Dinosaur",   emoji: "🦖", syllables: ["di","no","saur"],      phonetic: "Die - No - Sore" },
        { word: "Umbrella",   emoji: "☂️", syllables: ["um","brel","la"],      phonetic: "Um - Brel - Ah" },
        { word: "Crocodile",  emoji: "🐊", syllables: ["croc","o","dile"],     phonetic: "Krok - Oh - Dile" },
        { word: "Porcupine",  emoji: "🦔", syllables: ["por","cu","pine"],     phonetic: "Por - Kyu - Pine" },
        { word: "Strawberry", emoji: "🍓", syllables: ["straw","ber","ry"],    phonetic: "Straw - Ber - Ree" },
        { word: "Caterpillar",emoji: "🐛", syllables: ["cat","er","pil","lar"],phonetic: "Kat - Er - Pil - Lar" },
        { word: "Watermelon", emoji: "🍉", syllables: ["wa","ter","mel","on"], phonetic: "Waw - Ter - Mel - On" },
        { word: "Helicopter", emoji: "🚁", syllables: ["hel","i","cop","ter"], phonetic: "Hel - Ih - Kop - Ter" },
        { word: "Hippopotamus",emoji:"🦛", syllables: ["hip","po","pot","a","mus"], phonetic: "Hip - Oh - Pot - Ah - Mus" },
    ],
};

// ─────────────────────────────────────────────
function initKidsMode() {
    const kidsModeBtns  = document.querySelectorAll('#kids .mode-btn');
    const kidsSubModes  = document.querySelectorAll('#kids .sub-mode');
    const kidsActiveArea = document.getElementById('kids-active-area');
    const kidsTargetWord = document.getElementById('kids-target-word');
    const kidsActiveEmoji = document.getElementById('kids-active-emoji');
    const kidsListenBtn  = document.getElementById('kids-listen-btn');
    const kidsRecordBtn  = document.getElementById('kids-record-btn');
    const kidsBackBtn    = document.getElementById('kids-back-btn');
    const kidsFeedback   = document.getElementById('kids-feedback');
    const kidsStars      = document.getElementById('kids-stars');
    const kidsMessage    = document.getElementById('kids-message');
    const kidsTryAgainBtn = document.getElementById('kids-try-again-btn');
    const kidsSyllableRow = document.getElementById('kids-syllable-row');

    if (!kidsActiveArea) return;

    // ── Build word grids from KIDS_WORDS ──────────
    ['easy', 'medium', 'hard'].forEach(level => {
        const gridEl = document.getElementById(`kids-${level}`);
        if (!gridEl) return;

        const existingGrid = gridEl.querySelector('.kids-grid');
        if (existingGrid) existingGrid.remove();

        const grid = document.createElement('div');
        grid.className = 'kids-grid';

        KIDS_WORDS[level].forEach(item => {
            const card = document.createElement('div');
            card.className = 'kid-card';
            card.dataset.word = item.word;
            card.innerHTML = `<div class="emoji">${item.emoji}</div><div class="word">${item.word}</div>`;
            card.addEventListener('click', () => activateKidWord(item));
            grid.appendChild(card);
        });

        gridEl.appendChild(grid);
    });

    // ── Sub-mode switching ─────────────────────────
    kidsModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            kidsModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const modeId = 'kids-' + btn.dataset.mode;
            kidsSubModes.forEach(m => {
                m.classList.toggle('hidden', m.id !== modeId);
                m.classList.toggle('active', m.id === modeId);
            });
            kidsActiveArea.classList.add('hidden');
            if (window.appState) window.appState.currentSubMode = btn.dataset.mode;
        });
    });

    // ── Activate a word ───────────────────────────
    function activateKidWord(item) {
        window.appState.activeTargetText = item.word;

        kidsTargetWord.textContent = item.word;
        kidsActiveEmoji.textContent = item.emoji;

        // Show syllable chips above the word
        if (kidsSyllableRow) {
            kidsSyllableRow.innerHTML = item.syllables.map(s =>
                `<span class="kids-syl-chip">${s}</span>`
            ).join('<span class="kids-syl-dot">·</span>');
        }

        kidsSubModes.forEach(m => m.classList.add('hidden'));
        kidsActiveArea.classList.remove('hidden');
        kidsFeedback.classList.add('hidden');

        // Play the word slowly so they hear it clearly
        playKidsTTS(item.word);
    }

    // Global hook for legacy onclick="playKidWord('Cat')" in HTML
    window.playKidWord = function (word) {
        const allWords = [...KIDS_WORDS.easy, ...KIDS_WORDS.medium, ...KIDS_WORDS.hard];
        const item = allWords.find(w => w.word.toLowerCase() === word.toLowerCase());
        if (item) activateKidWord(item);
    };

    // ── Back button ───────────────────────────────
    kidsBackBtn.addEventListener('click', () => {
        kidsActiveArea.classList.add('hidden');
        const activeBtn = document.querySelector('#kids .mode-btn.active');
        if (activeBtn) {
            const modeId = 'kids-' + activeBtn.dataset.mode;
            const modeEl = document.getElementById(modeId);
            if (modeEl) {
                modeEl.classList.remove('hidden');
                modeEl.classList.add('active');
            }
        }
    });

    // ── Listen button ─────────────────────────────
    kidsListenBtn.addEventListener('click', () => {
        const target = window.appState.activeTargetText;
        if (target) playKidsTTS(target);
    });

    // ── Record button ─────────────────────────────
    kidsRecordBtn.addEventListener('click', () => {
        if (!window.appState.isRecording) {
            startRecording(kidsRecordBtn, null, window.showKidsResults);
        } else {
            stopRecording(kidsRecordBtn, null);
        }
    });

    // ── Try Again button ──────────────────────────
    if (kidsTryAgainBtn) {
        kidsTryAgainBtn.addEventListener('click', () => {
            kidsFeedback.classList.add('hidden');
            const practiceBox = document.getElementById('kids-practice-together');
            if (practiceBox) practiceBox.innerHTML = '';
            const target = window.appState.activeTargetText;
            if (target) playKidsTTS(`Listen carefully. ${target}.`);
        });
    }

    // ── Sequential "let's practice together" coaching ─────
    // Plays each phonetic chunk one at a time (highlighting it),
    // then the syllables, then the whole word — like a teacher
    // sounding a word out with a child.
    async function playPracticeTogether(wordData) {
        const box = document.getElementById('kids-practice-together');
        if (!box || !wordData) return;

        const chunks = wordData.phonetic.split(' - ').map(s => s.trim()).filter(Boolean);
        box.innerHTML = `
            <div class="kids-practice-together">
                <h4>Let's practice together</h4>
                <div class="kids-step-row" id="kids-step-row"></div>
                <button class="secondary-btn" id="kids-replay-together-btn" style="margin-top:14px;">🔁 Replay</button>
            </div>
        `;
        const row = document.getElementById('kids-step-row');
        chunks.forEach((chunk, i) => {
            const step = document.createElement('span');
            step.className = 'kids-step';
            step.id = `kids-step-${i}`;
            step.textContent = chunk;
            row.appendChild(step);
        });
        const finalStep = document.createElement('span');
        finalStep.className = 'kids-step';
        finalStep.id = 'kids-step-final';
        finalStep.textContent = wordData.word;
        row.appendChild(finalStep);

        async function runSequence() {
            for (let i = 0; i < chunks.length; i++) {
                document.querySelectorAll('.kids-step').forEach(s => s.classList.remove('active'));
                const step = document.getElementById(`kids-step-${i}`);
                if (step) step.classList.add('active');
                await playKidsTTS(chunks[i]);
                if (step) { step.classList.remove('active'); step.classList.add('done'); }
                await new Promise(r => setTimeout(r, 150));
            }
            document.querySelectorAll('.kids-step').forEach(s => s.classList.remove('active'));
            const final = document.getElementById('kids-step-final');
            if (final) final.classList.add('active');
            await playKidsTTS(wordData.word);
            if (final) { final.classList.remove('active'); final.classList.add('done'); }
        }

        const replayBtn = document.getElementById('kids-replay-together-btn');
        if (replayBtn) replayBtn.addEventListener('click', runSequence);

        runSequence();
    }

    // ── Results ────────────────────────────────────
    window.showKidsResults = function (data) {
        kidsFeedback.classList.remove('hidden');

        const recognized = (data.recognized_text || "").trim();
        const target     = window.appState.activeTargetText || "";
        const score      = data.score || 0;

        // Find word data for coaching
        const allWords = [...KIDS_WORDS.easy, ...KIDS_WORDS.medium, ...KIDS_WORDS.hard];
        const wordData = allWords.find(w => w.word.toLowerCase() === target.toLowerCase());

        // Stricter threshold for short words, lenient for longer
        let isCorrect = false;
        if (target.length <= 3) {
            isCorrect = recognized.toLowerCase() === target.toLowerCase();
        } else if (target.length <= 6) {
            isCorrect = score >= 78 || recognized.toLowerCase() === target.toLowerCase();
        } else {
            isCorrect = score >= 65;
        }

        const practiceBox = document.getElementById('kids-practice-together');
        if (practiceBox) practiceBox.innerHTML = '';

        if (isCorrect) {
            kidsStars.textContent   = '⭐⭐⭐';
            kidsMessage.textContent = `Amazing! You said "${target}" perfectly! 🎉`;
            if (window.triggerConfetti) triggerConfetti();
            if (window.showMascotMessage) showMascotMessage("Wow! You're a star! 🌟");
            setTimeout(() => playKidsTTS(`Yay! You said ${target} perfectly!`), 500);
        } else {
            kidsStars.textContent = '⭐';

            if (!recognized || recognized === "(No speech detected)") {
                kidsMessage.textContent = `I could not hear you. Try saying "${target}" again! 🎤`;
                setTimeout(() => playKidsTTS(`I could not hear you. Let us try together.`), 400);
            } else {
                kidsMessage.textContent = `You said "${recognized}". The word is "${target}". Let's practice together! 👂`;
                setTimeout(() => playKidsTTS(`You said ${recognized}. The word is ${target}. Let us practice together.`), 400);
            }

            if (window.showMascotMessage) showMascotMessage("You can do it! Let's practice together.");

            // Sound the word out step by step, like a teacher would
            if (wordData) {
                setTimeout(() => playPracticeTogether(wordData), 2600);
            }
        }
    };
}

document.addEventListener('DOMContentLoaded', initKidsMode);