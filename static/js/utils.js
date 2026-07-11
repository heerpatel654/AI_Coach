// utils.js — Mascot, Confetti, score rendering, word-detail modal,
// and other shared UI helpers used across Practice / Adults / Kids.

document.addEventListener('DOMContentLoaded', () => {
    const mascotBubble = document.getElementById('mascot-bubble');

    window.mascotClick = function () {
        const messages = [
            "You're doing great! 🌟",
            "Keep practicing! 🎤",
            "I love learning with you! 🦉",
            "Try a new word! 🕵️",
            "Listen carefully first, then speak! 👂",
            "Slow down and say each syllable! 🐢",
        ];
        window.showMascotMessage(messages[Math.floor(Math.random() * messages.length)]);
        playTTS("Hoot hoot!");
    };

    window.showMascotMessage = function (text) {
        if (!mascotBubble) return;
        mascotBubble.textContent = text;
        mascotBubble.classList.add('visible');
        setTimeout(() => mascotBubble.classList.remove('visible'), 3000);
    };

    window.triggerConfetti = function () {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas || typeof confetti === 'undefined') return;
        canvas.classList.add('active');
        const myConfetti = confetti.create(canvas, { resize: true, useWorker: true });
        myConfetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        setTimeout(() => canvas.classList.remove('active'), 2500);
    };

    // ─────────────────────────────────────────────
    // setScoreRing — drives the conic-gradient ring
    // ─────────────────────────────────────────────
    window.setScoreRing = function (ringEl, score) {
        if (!ringEl) return;
        const valueEl = ringEl.querySelector('.score-ring-value') || ringEl;
        const pct = Math.max(0, Math.min(100, score || 0));
        ringEl.style.setProperty('--pct', pct);
        const color = pct >= 80 ? 'var(--good)' : pct >= 55 ? 'var(--warn)' : 'var(--bad)';
        ringEl.style.setProperty('--ring-color', color);
        valueEl.textContent = `${pct}%`;
        valueEl.style.color = color;
    };

    // ─────────────────────────────────────────────
    // renderSyllableBreakdown
    // Word blocks are clickable when they are not fully correct,
    // opening the detailed word modal. Syllable chips replay audio.
    // ─────────────────────────────────────────────
    window.renderSyllableBreakdown = function (diffItems, containerEl) {
        if (!containerEl) return;
        containerEl.innerHTML = '';

        diffItems.forEach(item => {
            const wordBlock = document.createElement('div');
            wordBlock.className = 'word-block';

            const clickable = item.status !== 'correct' && item.status !== 'extra';
            if (clickable) {
                wordBlock.classList.add('clickable');
                wordBlock.addEventListener('click', (e) => {
                    // Don't open the modal if a syllable chip inside was clicked
                    if (e.target.closest('.syl-chip')) return;
                    window.openWordModal(item);
                });
            }

            // ── Word label (coloured by status) ──────────
            const wordLabel = document.createElement('div');
            wordLabel.className = 'word-label status-' + item.status;

            const statusText = { correct: 'Correct', wrong: 'Needs work', close: 'Almost', missing: 'Skipped', extra: 'Extra' };
            wordLabel.innerHTML = `<span class="status-dot"></span>${item.word}`;
            if (clickable) {
                const hint = document.createElement('span');
                hint.className = 'word-hint';
                hint.textContent = 'tap for details';
                wordLabel.appendChild(hint);
            }
            wordBlock.appendChild(wordLabel);

            // ── Syllable chips ────────────────────────────
            if (item.syllables && item.syllables.length > 0) {
                const sylRow = document.createElement('div');
                sylRow.className = 'syllable-row';

                item.syllables.forEach(syl => {
                    const chip = document.createElement('div');
                    chip.className = 'syl-chip syl-' + syl.status;
                    chip.title = 'Play this syllable';

                    const sylText = document.createElement('span');
                    sylText.className = 'syl-text';
                    sylText.textContent = syl.syllable;

                    const sylPct = document.createElement('span');
                    sylPct.className = 'syl-pct';
                    sylPct.textContent = syl.accuracy + '%';

                    chip.appendChild(sylText);
                    chip.appendChild(sylPct);
                    chip.addEventListener('click', (e) => {
                        e.stopPropagation();
                        playTTS(syl.syllable, true);
                    });
                    sylRow.appendChild(chip);
                });

                wordBlock.appendChild(sylRow);
            }

            // ── Plain-English feedback lines ──────────────
            if (item.tip && item.status !== 'correct' && item.status !== 'extra') {
                const tipBox = document.createElement('div');
                tipBox.className = 'word-tip-box';

                const lines = item.tip.split('\n').map(l => l.trim()).filter(Boolean);
                lines.slice(0, 2).forEach((line, i) => {
                    const p = document.createElement('p');
                    p.className = i === 0 ? 'tip-line tip-main' : 'tip-line';
                    p.textContent = line.replace(/\u2014/g, ',').replace(/ — /g, ', ');
                    tipBox.appendChild(p);
                });

                wordBlock.appendChild(tipBox);
            }

            containerEl.appendChild(wordBlock);
        });
    };

    // ─────────────────────────────────────────────
    // renderScoreBars — Words / Sounds / Syllables sub-scores
    // ─────────────────────────────────────────────
    window.renderScoreBars = function (scores, containerEl) {
        if (!containerEl || !scores) return;

        const barColor = pct => pct >= 80 ? 'var(--good)' : pct >= 55 ? 'var(--warn)' : 'var(--bad)';
        const row = (label, pct) => `
            <div class="score-bar-row">
                <span class="score-bar-label">${label}</span>
                <div class="score-bar-track">
                    <div class="score-bar-fill" style="width:${pct}%;background:${barColor(pct)}"></div>
                </div>
                <span class="score-bar-value">${pct}%</span>
            </div>`;

        containerEl.innerHTML = `
            <div class="score-bars">
                ${row('Words', scores.word_score)}
                ${row('Sounds', scores.ipa_score)}
                ${row('Syllables', scores.syllable_score)}
            </div>
        `;
    };

    // ─────────────────────────────────────────────
    // renderSummary — "You pronounced 7 of 9 words correctly"
    // ─────────────────────────────────────────────
    window.renderSummary = function (summary, containerEl) {
        if (!containerEl || !summary) { if (containerEl) containerEl.innerHTML = ''; return; }

        const problems = (summary.main_problems || []).join(', ');
        const confidenceTag = summary.confidence != null
            ? `<span class="summary-stat-value">${summary.confidence}%</span>`
            : `<span class="summary-stat-value empty">n/a</span>`;

        containerEl.innerHTML = `
            <div class="summary-card">
                <div class="summary-headline">
                    You pronounced <span class="accent">${summary.correct_count} of ${summary.total_count}</span> words correctly.
                </div>
                <div class="summary-grid">
                    <div class="summary-stat">
                        <div class="summary-stat-label">Main problems</div>
                        <div class="summary-stat-value ${problems ? '' : 'empty'}">${problems || 'None found'}</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-label">Hardest word</div>
                        <div class="summary-stat-value ${summary.most_difficult_word ? '' : 'empty'}">${summary.most_difficult_word || 'None'}</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-label">Weakest sound</div>
                        <div class="summary-stat-value ${summary.weakest_phoneme ? '' : 'empty'}">${summary.weakest_phoneme || 'None'}</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-label">Confidence</div>
                        ${confidenceTag}
                    </div>
                </div>
            </div>
        `;
    };

    // ─────────────────────────────────────────────
    // renderWeakSounds — sounds the user keeps getting wrong
    // ─────────────────────────────────────────────
    window.renderWeakSounds = function (topWeak, containerEl) {
        if (!containerEl || !topWeak || topWeak.length === 0) {
            if (containerEl) containerEl.innerHTML = '';
            return;
        }
        const items = topWeak.map(([label, count]) =>
            `<li>
                <span class="weak-label">${label}</span>
                <span class="weak-count">missed ${count} time${count !== 1 ? 's' : ''}</span>
            </li>`
        ).join('');
        containerEl.innerHTML = `
            <div class="weak-sounds-inner">
                <h4>Sounds to focus on</h4>
                <ul class="weak-list">${items}</ul>
            </div>
        `;
    };

    // ─────────────────────────────────────────────
    // WORD DETAIL MODAL
    // Built from a single `diff` item returned by /api/evaluate.
    // ─────────────────────────────────────────────
    const modalRoot = document.getElementById('word-modal-root');

    function closeWordModal() {
        if (modalRoot) modalRoot.innerHTML = '';
        document.removeEventListener('keydown', onModalKeydown);
    }

    function onModalKeydown(e) {
        if (e.key === 'Escape') closeWordModal();
    }

    window.closeWordModal = closeWordModal;

    window.openWordModal = function (item) {
        if (!modalRoot) return;

        const simPct = item.similarity != null ? Math.round(item.similarity * 100)
            : (item.status === 'missing' ? 0 : null);
        const accClass = simPct == null ? '' : simPct >= 80 ? 'acc-good' : simPct >= 55 ? 'acc-warn' : 'acc-bad';

        const primaryIssue = (item.phoneme_issues && item.phoneme_issues[0]) || null;
        const problemText = primaryIssue
            ? `${primaryIssue.label}: heard "${primaryIssue.heard}" instead of "${primaryIssue.target}"`
            : (item.status === 'missing' ? 'This word was not said at all.' : 'Overall pronunciation needs adjustment.');

        // Build "how to pronounce" bullets from every phoneme issue's tip,
        // falling back to the syllable-level tips if there are no
        // word-level phoneme issues.
        let howToSource = (item.phoneme_issues || []).map(p => p.tip);
        if (howToSource.length === 0 && item.syllables) {
            item.syllables.forEach(s => (s.issues || []).forEach(i => howToSource.push(i.tip)));
        }
        // De-duplicate and cap at 3 bullets so the card stays scannable.
        howToSource = [...new Set(howToSource)].slice(0, 3);

        const howToHtml = howToSource.length
            ? howToSource.map(t => `<div class="word-modal-howto-item"><span class="dot">&bull;</span><span>${t}</span></div>`).join('')
            : `<div class="word-modal-howto-item"><span class="dot">&bull;</span><span>Listen to the correct version and repeat it slowly, syllable by syllable.</span></div>`;

        modalRoot.innerHTML = `
            <div class="modal-backdrop" id="word-modal-backdrop">
                <div class="word-modal" role="dialog" aria-modal="true" aria-label="Pronunciation detail for ${item.word}">
                    <div class="word-modal-header">
                        <div>
                            <div class="word-modal-title">${item.word}</div>
                        </div>
                        <button class="word-modal-close" id="word-modal-close-btn" aria-label="Close">✕</button>
                    </div>

                    ${simPct != null ? `<div class="word-modal-accuracy ${accClass}">Accuracy: ${simPct}%</div>` : ''}

                    <div class="word-modal-row">
                        <div class="word-modal-field">
                            <div class="word-modal-field-label">You said</div>
                            <div class="word-modal-field-value">${item.recognized || '(nothing heard)'}</div>
                        </div>
                        <div class="word-modal-field">
                            <div class="word-modal-field-label">Target</div>
                            <div class="word-modal-field-value">${item.word}</div>
                        </div>
                        <div class="word-modal-field">
                            <div class="word-modal-field-label">Correct IPA</div>
                            <div class="word-modal-field-value ipa-target">/${item.word_ipa || '?'}/</div>
                        </div>
                        <div class="word-modal-field">
                            <div class="word-modal-field-label">Your IPA</div>
                            <div class="word-modal-field-value ipa-heard">/${item.recognized_ipa || '?'}/</div>
                        </div>
                    </div>

                    <div class="word-modal-section">
                        <div class="word-modal-section-label">Problem</div>
                        <div class="word-modal-problem">${problemText}</div>
                    </div>

                    <div class="word-modal-section">
                        <div class="word-modal-section-label">How to pronounce it</div>
                        <div class="word-modal-howto">${howToHtml}</div>
                    </div>

                    <div class="word-modal-actions">
                        <button class="primary" id="word-modal-play-btn">🔊 Play correct pronunciation</button>
                        <button id="word-modal-slow-btn">🐢 Play slowly</button>
                        <button id="word-modal-again-btn">🔄 Practice again</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('word-modal-close-btn').addEventListener('click', closeWordModal);
        document.getElementById('word-modal-backdrop').addEventListener('click', (e) => {
            if (e.target.id === 'word-modal-backdrop') closeWordModal();
        });
        document.getElementById('word-modal-play-btn').addEventListener('click', () => playTTS(item.word));
        document.getElementById('word-modal-slow-btn').addEventListener('click', () => playTTS(item.word, true));
        document.getElementById('word-modal-again-btn').addEventListener('click', () => {
            closeWordModal();
            playTTS(item.word, true);
        });
        document.addEventListener('keydown', onModalKeydown);
    };
});
