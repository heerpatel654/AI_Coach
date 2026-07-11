// adults.js — Adults Mode

// ─────────────────────────────────────────────
// CONTENT LIBRARY
// Add more scenarios/categories here freely
// ─────────────────────────────────────────────
const ADULTS_CONTENT = {
    "Workplace": [
        { title: "Job Inquiry",        text: "Hi, I am calling to inquire about the job opening." },
        { title: "Meeting Question",   text: "Could you please clarify the project timeline?" },
        { title: "Introducing Yourself", text: "Hi everyone, my name is Alex and I am the new team lead." },
        { title: "Asking for Help",    text: "Excuse me, could you give me a hand with this report?" },
        { title: "Disagreeing Politely", text: "I see your point, however I think we should reconsider the approach." },
        { title: "Confirming Details", text: "Just to confirm, the meeting is at three on Thursday?" },
        { title: "Giving Feedback",    text: "I really appreciated your presentation, the data was very clear." },
        { title: "Phone Call Opener",  text: "Good afternoon, this is Sarah from the accounts department." },
    ],
    "Daily Life": [
        { title: "Ordering Coffee",    text: "I would like to order a large coffee with oat milk please." },
        { title: "At the Doctor",      text: "I have had a headache and sore throat for two days." },
        { title: "At the Bank",        text: "I would like to transfer money to another account." },
        { title: "Giving Directions",  text: "Go straight ahead then turn left at the traffic lights." },
        { title: "At a Restaurant",    text: "Could we have the bill please, and do you accept card?" },
        { title: "Making a Complaint", text: "I am afraid there is a problem with my order." },
        { title: "On the Phone",       text: "Sorry, could you repeat that? The line is not very clear." },
        { title: "Asking the Time",    text: "Excuse me, do you happen to know what time it is?" },
    ],
    "Social Situations": [
        { title: "Meeting Someone New", text: "It is so lovely to meet you, I have heard great things." },
        { title: "Accepting an Invite", text: "That sounds wonderful, I would love to come." },
        { title: "Declining Politely",  text: "Thank you so much for the invitation, unfortunately I am not able to make it." },
        { title: "Giving a Compliment", text: "You have done an absolutely brilliant job with this." },
        { title: "Apologising",         text: "I am really sorry about that, it will not happen again." },
        { title: "Small Talk",          text: "The weather has been quite unpredictable lately, has it not?" },
        { title: "Saying Goodbye",      text: "It was so nice catching up, we should do this again soon." },
        { title: "Congratulating",      text: "Congratulations on your promotion, you really deserve it." },
    ],
    "Difficult Sounds Practice": [
        { title: "TH Practice",        text: "The thirty three thieves thought they thrilled the throne." },
        { title: "R Sound",            text: "Really rare roasted rabbits ran around rural roads." },
        { title: "V vs W",             text: "We visited Venice and viewed very vivid views." },
        { title: "SH and CH",          text: "She chose to wash the dishes in the shallow dish." },
        { title: "Long Vowels",        text: "The moon shone through the blue afternoon sky." },
        { title: "Word Stress",        text: "Present your presentation on the present situation." },
        { title: "Schwa Sound",        text: "About a banana, a sofa, and a camera." },
        { title: "Minimal Pairs",      text: "Ship sheep chip cheap live leave bit beat." },
    ],
    "Travel and Airport": [
        { title: "Check In",           text: "I would like to check in for my flight to London please." },
        { title: "Customs",            text: "I am visiting for two weeks on a tourist visa." },
        { title: "Lost Luggage",       text: "My suitcase has not arrived and I need to report it." },
        { title: "Hotel Check In",     text: "I have a reservation under the name Johnson." },
        { title: "Asking for a Map",   text: "Could you point me to the nearest subway station?" },
        { title: "Emergency",          text: "I need help, I have lost my passport and wallet." },
    ],
};

// ─────────────────────────────────────────────
// Map a weak-sound label to a keyword we can search the scenario
// library for, so "Recommended exercises" points at something that
// actually targets that sound.
// ─────────────────────────────────────────────
const SOUND_KEYWORDS = {
    "TH (voiceless)": ["th", "think", "throne"],
    "TH (voiced)":    ["th", "this", "weather"],
    "R":              ["r ", "rare", "roasted", "rural"],
    "schwa":          ["schwa", "about", "banana"],
    "short U":        ["vowel", "cup"],
    "SH":             ["sh", "wash", "shallow"],
    "CH":             ["ch", "chose"],
    "long O":         ["vowel", "moon", "afternoon"],
};

function findRecommendedScenarios(weakLabels) {
    const all = Object.values(ADULTS_CONTENT).flat();
    const picked = [];
    weakLabels.forEach(label => {
        const keywords = SOUND_KEYWORDS[label] || [label.toLowerCase()];
        const match = all.find(item =>
            !picked.includes(item) &&
            keywords.some(k => item.text.toLowerCase().includes(k) || item.title.toLowerCase().includes(k))
        );
        if (match) picked.push(match);
    });
    // Always make sure there's at least something to show
    if (picked.length === 0) picked.push(ADULTS_CONTENT["Difficult Sounds Practice"][0]);
    return picked.slice(0, 3);
}

// ─────────────────────────────────────────────
function initAdultsMode() {
    const adultsActiveArea  = document.getElementById('adults-active-area');
    const adultsTargetText  = document.getElementById('adults-target-text');
    const adultsListenBtn   = document.getElementById('adults-listen-btn');
    const adultsRecordBtn   = document.getElementById('adults-record-btn');
    const adultsBackBtn     = document.getElementById('adults-back-btn');
    const adultsFeedback    = document.getElementById('adults-feedback');
    const adultsScore       = document.getElementById('adults-score');
    const adultsMessage     = document.getElementById('adults-message');
    const adultsDiffOutput  = document.getElementById('adults-diff-output');
    const adultsScoreBars   = document.getElementById('adults-score-bars');
    const adultsWeakSounds  = document.getElementById('adults-weak-sounds');
    const scenarioContainer = document.getElementById('adults-scenario');

    if (!adultsActiveArea) return;

    // ── Build scenario cards ───────────────────────
    if (scenarioContainer) {
        // Remove any previously-built categories (keeps the intro h2/p above)
        scenarioContainer.querySelectorAll('.scenario-category, .scenario-list').forEach(el => el.remove());

        Object.entries(ADULTS_CONTENT).forEach(([category, items]) => {
            const catHeader = document.createElement('h2');
            catHeader.className = 'scenario-category';
            catHeader.textContent = category;
            scenarioContainer.appendChild(catHeader);

            const grid = document.createElement('div');
            grid.className = 'scenario-list';

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'scenario-item';
                card.dataset.text = item.text;
                card.innerHTML = `<h3>${item.title}</h3><p>"${item.text}"</p>`;
                card.addEventListener('click', () => openAdultsActive(item.text));
                grid.appendChild(card);
            });

            scenarioContainer.appendChild(grid);
        });
    }

    // ── Open practice area ─────────────────────────
    function openAdultsActive(text) {
        window.appState.activeTargetText = text;
        adultsTargetText.textContent = `"${text}"`;
        adultsActiveArea.classList.remove('hidden');
        document.querySelectorAll('#adults .sub-mode').forEach(m => m.classList.add('hidden'));
        adultsFeedback.classList.add('hidden');
        // Auto-play so they hear it immediately
        playTTS(text);
    }

    adultsBackBtn.addEventListener('click', () => {
        adultsActiveArea.classList.add('hidden');
        if (scenarioContainer) scenarioContainer.classList.remove('hidden');
    });

    adultsListenBtn.addEventListener('click', () => {
        playTTS(window.appState.activeTargetText);
    });

    adultsRecordBtn.addEventListener('click', () => {
        if (!window.appState.isRecording) {
            startRecording(adultsRecordBtn, null, window.showAdultsResults);
        } else {
            stopRecording(adultsRecordBtn, null);
        }
    });

    const adultsTryAgainBtn = document.getElementById('adults-try-again-btn');
    if (adultsTryAgainBtn) {
        adultsTryAgainBtn.addEventListener('click', () => {
            adultsFeedback.classList.add('hidden');
            playTTS(window.appState.activeTargetText);
        });
    }

    // ── Results ────────────────────────────────────
    window.showAdultsResults = function (data) {
        adultsFeedback.classList.remove('hidden');

        const score = data.score || 0;
        const ring = document.getElementById('adults-score-ring');
        if (window.setScoreRing) window.setScoreRing(ring, score);

        adultsMessage.textContent = data.feedback || '';

        // Sub-score bars
        if (window.renderScoreBars && adultsScoreBars) {
            window.renderScoreBars(data.scores, adultsScoreBars);
        }

        // "X of Y words correct" summary
        const summaryEl = document.getElementById('adults-summary');
        if (window.renderSummary && summaryEl) {
            window.renderSummary(data.summary, summaryEl);
        }

        // Syllable breakdown
        if (window.renderSyllableBreakdown && adultsDiffOutput) {
            window.renderSyllableBreakdown(data.diff || [], adultsDiffOutput);
        }

        // Weak sounds
        if (window.renderWeakSounds && adultsWeakSounds && data.top_weak_sounds) {
            window.renderWeakSounds(data.top_weak_sounds, adultsWeakSounds);
        }

        // Recommended exercises, built from the current weak-sound list
        const recommendEl = document.getElementById('adults-recommend');
        if (recommendEl) {
            const labels = (data.top_weak_sounds || []).map(([label]) => label);
            if (labels.length === 0) {
                recommendEl.innerHTML = '';
            } else {
                const picks = findRecommendedScenarios(labels);
                recommendEl.innerHTML = `
                    <div class="recommend-panel">
                        <h4>Recommended practice</h4>
                        <div class="recommend-list">
                            ${picks.map(p => `
                                <div class="recommend-item" data-text="${p.text.replace(/"/g, '&quot;')}">
                                    <span class="rec-text">${p.title}: "${p.text}"</span>
                                    <span class="rec-tag">Try it →</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                recommendEl.querySelectorAll('.recommend-item').forEach(el => {
                    el.addEventListener('click', () => openAdultsActive(el.dataset.text));
                });
            }
        }

        // Scroll feedback into view smoothly
        adultsFeedback.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
}

document.addEventListener('DOMContentLoaded', initAdultsMode);