// practice.js — Practice Mode

// ─────────────────────────────────────────────
// CONTENT LIBRARY — add more entries here freely
// Each category has sentences the user can click to load
// ─────────────────────────────────────────────
const PRACTICE_CONTENT = {
    "Everyday Phrases": [
        "Good morning, how are you today?",
        "Could you please repeat that?",
        "I would like a glass of water.",
        "What time does the store close?",
        "Nice to meet you.",
        "I am sorry, I did not understand.",
        "Can you speak more slowly please?",
        "Thank you very much for your help.",
        "Where is the nearest bus stop?",
        "Have a wonderful day!",
        "Excuse me, can I ask you something?",
        "I will be there in five minutes.",
    ],
    "Common Tongue Twisters": [
        "She sells seashells by the seashore.",
        "How much wood would a woodchuck chuck?",
        "Red lorry yellow lorry.",
        "Peter Piper picked a peck of pickled peppers.",
        "Unique New York unique New York.",
        "Six slippery snails slid slowly seaward.",
        "Betty Botter bought some butter.",
        "Fuzzy Wuzzy was a bear.",
    ],
    "TH Sounds": [
        "Think about the thing thoroughly.",
        "Three thousand three hundred and thirty three.",
        "The thirty three thieves thought they thrilled the throne.",
        "This is the theme of the thought.",
        "I think therefore I am.",
        "Those things are worth thinking through.",
        "The weather there is rather cold.",
        "Mother and father go together.",
    ],
    "R and L Sounds": [
        "Really rare roasted rabbits.",
        "Red roses grow in the royal garden.",
        "The library is full of lovely literature.",
        "Larry the lion lost his lollipop.",
        "Rolling rivers reach the rocky reef.",
        "Correct pronunciation requires real practice.",
        "Carol clearly called from the corridor.",
        "The rural lawyer rarely hurried.",
    ],
    "Vowel Sounds": [
        "The cat sat on the flat mat.",
        "I like to ride my bike at night.",
        "Go slow down the road to home.",
        "The boot is on the foot of the moon.",
        "She sees the sea from the steep street.",
        "Could you put your foot on the wood?",
        "The bird heard a word in the world.",
        "Loud clouds crowd around the town.",
    ],
    "Job Interviews": [
        "I am very excited about this opportunity.",
        "My greatest strength is my attention to detail.",
        "I work well under pressure and meet deadlines.",
        "I am a quick learner and a team player.",
        "Could you tell me more about the role?",
        "I have five years of experience in this field.",
        "I look forward to contributing to your team.",
        "When would I be expected to start?",
    ],
    "Shopping and Errands": [
        "Do you have this in a larger size?",
        "How much does this cost?",
        "I would like to return this item please.",
        "Can I pay by card?",
        "Where can I find the dairy section?",
        "Is there a discount on this product?",
        "I am looking for something in blue.",
        "Could you wrap this as a gift?",
    ],
    "Medical and Health": [
        "I have had a headache since yesterday.",
        "Can I schedule an appointment for next week?",
        "I am allergic to penicillin.",
        "The pain is on my right side.",
        "How often should I take this medication?",
        "I have been feeling very tired lately.",
        "Is this covered by my insurance?",
        "I would like a second opinion please.",
    ],
};

// ─────────────────────────────────────────────
function initPracticeMode() {
    const practiceRecordBtn = document.getElementById('record-btn');
    const practiceStatus    = document.getElementById('status');
    const customInput       = document.getElementById('custom-phrase');
    const listenBtn         = document.getElementById('listen-btn');
    const resultsArea       = document.getElementById('results-area');
    const resScore          = document.getElementById('res-score');
    const resFeedback       = document.getElementById('res-feedback');
    const diffOutput        = document.getElementById('diff-output');
    const scoreBarsEl       = document.getElementById('score-bars');
    const weakSoundsEl      = document.getElementById('weak-sounds-panel');
    const tryAgainBtn       = document.getElementById('try-again-btn');
    const sentenceLibrary   = document.getElementById('sentence-library');

    if (!practiceRecordBtn) return;

    // ── Build sentence library UI ──────────────────
    if (sentenceLibrary) {
        Object.entries(PRACTICE_CONTENT).forEach(([category, sentences]) => {
            const catDiv = document.createElement('div');
            catDiv.className = 'library-category';

            const catTitle = document.createElement('h3');
            catTitle.className = 'library-cat-title';
            catTitle.textContent = category;
            catDiv.appendChild(catTitle);

            const list = document.createElement('div');
            list.className = 'library-list';

            sentences.forEach(sentence => {
                const pill = document.createElement('button');
                pill.className = 'library-pill';
                pill.textContent = sentence;
                pill.addEventListener('click', () => {
                    customInput.value = sentence;
                    customInput.focus();
                    // Auto-play TTS so user hears it immediately
                    playTTS(sentence);
                });
                list.appendChild(pill);
            });

            catDiv.appendChild(list);
            sentenceLibrary.appendChild(catDiv);
        });
    }

    // ── Event listeners ────────────────────────────
    listenBtn.addEventListener('click', () => {
        const text = customInput.value.trim();
        if (text) playTTS(text);
    });

    practiceRecordBtn.addEventListener('click', () => {
        if (!window.appState.isRecording) {
            startRecording(practiceRecordBtn, practiceStatus);
        } else {
            stopRecording(practiceRecordBtn, practiceStatus);
        }
    });

    tryAgainBtn.addEventListener('click', () => {
        resultsArea.classList.add('hidden');
        practiceRecordBtn.closest('.controls').classList.remove('hidden');
        practiceStatus.textContent = 'Ready to record';
        // Replay so they can hear it again before trying
        const text = customInput.value.trim();
        if (text) playTTS(text);
    });

    // ── Results renderer ───────────────────────────
    window.showPracticeResults = function (data) {
        resultsArea.classList.remove('hidden');
        practiceRecordBtn.closest('.controls').classList.add('hidden');

        const score = data.score || 0;
        const ring = document.getElementById('res-score-ring');
        if (window.setScoreRing) window.setScoreRing(ring, score);

        resFeedback.textContent = data.feedback || '';

        // Sub-score bars
        if (window.renderScoreBars && scoreBarsEl) {
            window.renderScoreBars(data.scores, scoreBarsEl);
        }

        // "X of Y words correct" summary
        const summaryEl = document.getElementById('res-summary');
        if (window.renderSummary && summaryEl) {
            window.renderSummary(data.summary, summaryEl);
        }

        // Word + syllable breakdown
        if (window.renderSyllableBreakdown && diffOutput) {
            window.renderSyllableBreakdown(data.diff || [], diffOutput);
        }

        // Weak sounds panel
        if (window.renderWeakSounds && weakSoundsEl && data.top_weak_sounds) {
            window.renderWeakSounds(data.top_weak_sounds, weakSoundsEl);
        }

        resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
}

document.addEventListener('DOMContentLoaded', initPracticeMode);