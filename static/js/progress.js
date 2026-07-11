// progress.js — Progress tab: history list, aggregate stats, trend chart

function initProgressTab() {
    const statsGrid   = document.getElementById('progress-stats-grid');
    const chartEl      = document.getElementById('progress-chart');
    const historyList  = document.getElementById('progress-history-list');
    const filterBtns    = document.querySelectorAll('#progress-mode-filter .mode-btn');
    const resetBtn       = document.getElementById('progress-reset-btn');

    if (!statsGrid) return;

    let currentFilter = '';

    function statCard(label, value, sub, cls) {
        return `
            <div class="progress-stat-card">
                <div class="progress-stat-label">${label}</div>
                <div class="progress-stat-value ${cls || ''}">${value}</div>
                ${sub ? `<div class="progress-stat-sub">${sub}</div>` : ''}
            </div>
        `;
    }

    function renderStats(stats) {
        if (!stats || stats.sessions === 0) {
            statsGrid.innerHTML = statCard('Sessions', '0', 'Practice a phrase to get started');
            return;
        }
        const improvementCls = stats.improvement > 0 ? 'pos' : stats.improvement < 0 ? 'neg' : '';
        const improvementText = stats.improvement > 0 ? `+${stats.improvement}` : `${stats.improvement}`;

        statsGrid.innerHTML = [
            statCard('Sessions', stats.sessions),
            statCard('Average score', `${stats.average_score}%`),
            statCard('Best score', `${stats.best_score}%`),
            statCard('Improvement', `${improvementText}pt`, 'recent vs earlier sessions', improvementCls),
            statCard('Most improved', stats.most_improved_sound || '—'),
            statCard('Weakest sound', stats.weakest_sound || '—'),
            statCard('Current streak', stats.current_streak, 'sessions scoring 70%+'),
        ].join('');
    }

    function renderChart(sessions) {
        if (!sessions || sessions.length === 0) {
            chartEl.innerHTML = '<div class="progress-chart-empty">Practice a few times to see your trend here.</div>';
            return;
        }
        const chrono = [...sessions].reverse(); // oldest -> newest
        const scores = chrono.map(s => s.score);
        const w = 640, h = 160, pad = 14;
        const stepX = scores.length > 1 ? (w - pad * 2) / (scores.length - 1) : 0;

        const xy = (s, i) => {
            const x = pad + i * stepX;
            const y = h - pad - (s / 100) * (h - pad * 2);
            return [x, y];
        };

        const points = scores.map((s, i) => xy(s, i).join(',')).join(' ');
        const dots = scores.map((s, i) => {
            const [x, y] = xy(s, i);
            const color = s >= 80 ? 'var(--good)' : s >= 55 ? 'var(--warn)' : 'var(--bad)';
            return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="var(--panel)" stroke-width="1.5" />`;
        }).join('');

        chartEl.innerHTML = `
            <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:160px;display:block;">
                <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="var(--panel-line)" stroke-width="1" />
                <polyline points="${points}" fill="none" stroke="var(--brass)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.9" />
                ${dots}
            </svg>
        `;
    }

    function renderHistoryList(sessions) {
        if (!sessions || sessions.length === 0) {
            historyList.innerHTML = '';
            return;
        }
        historyList.innerHTML = sessions.slice(0, 20).map(s => {
            const color = s.score >= 80 ? 'var(--good)' : s.score >= 55 ? 'var(--warn)' : 'var(--bad)';
            const bg    = s.score >= 80 ? 'var(--good-soft)' : s.score >= 55 ? 'var(--warn-soft)' : 'var(--bad-soft)';
            const date = new Date(s.timestamp);
            const dateStr = isNaN(date) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
                ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="progress-history-item">
                    <div class="progress-history-score" style="background:${bg};color:${color}">${s.score}</div>
                    <div class="progress-history-text">${s.target_text}</div>
                    <div class="progress-history-meta">${s.mode} &middot; ${dateStr}</div>
                </div>
            `;
        }).join('');
    }

    async function loadAndRender() {
        statsGrid.innerHTML = statCard('Sessions', '…');
        chartEl.innerHTML = '';
        historyList.innerHTML = '';
        try {
            const url = '/api/history' + (currentFilter ? `?mode=${encodeURIComponent(currentFilter)}` : '');
            const res = await fetch(url);
            const data = await res.json();
            renderStats(data.stats);
            renderChart(data.sessions);
            renderHistoryList(data.sessions);
        } catch (err) {
            console.error('Failed to load history', err);
            statsGrid.innerHTML = statCard('Sessions', '—', 'Could not load history');
        }
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.mode || '';
            loadAndRender();
        });
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (!confirm('Clear your entire practice history? This cannot be undone.')) return;
            await fetch('/api/history/reset', { method: 'POST' });
            loadAndRender();
        });
    }

    window.refreshProgressTab = loadAndRender;
    loadAndRender();
}

document.addEventListener('DOMContentLoaded', initProgressTab);
