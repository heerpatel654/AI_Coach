// main.js — App state and tab switching

function initMainApp() {
    // Global state — all other modules read/write this
    window.appState = {
        mediaRecorder:   null,
        audioChunks:     [],
        isRecording:     false,
        currentMode:     'practice',
        currentSubMode:  '',
        activeTargetText: ''
    };

    const tabs        = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            document.getElementById(targetId).classList.add('active');
            window.appState.currentMode = targetId;

            // Mascot only makes sense in Kids mode
            const mascot = document.getElementById('mascot-container');
            if (mascot) mascot.classList.toggle('visible', targetId === 'kids');

            // When switching TO kids, reset to easy grid
            if (targetId === 'kids') {
                document.getElementById('kids-active-area').classList.add('hidden');
                document.querySelectorAll('#kids .sub-mode').forEach(sub => {
                    const isEasy = sub.id === 'kids-easy';
                    sub.classList.toggle('active', isEasy);
                    sub.classList.toggle('hidden', !isEasy);
                });
                document.querySelectorAll('#kids .mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === 'easy');
                });
                window.appState.currentSubMode = 'easy';
            }

            // Restart word search when switching to games
            if (targetId === 'games' && window.startWordSearch) {
                window.startWordSearch();
            }

            // Refresh history/stats whenever the Progress tab is opened
            if (targetId === 'progress' && window.refreshProgressTab) {
                window.refreshProgressTab();
            }
        });
    });

    checkUserRole();

    function checkUserRole() {
        const role = localStorage.getItem('userRole');
        const name = localStorage.getItem('userName');

        const welcomeMsg = document.getElementById('welcome-msg');
        if (welcomeMsg && name) {
            welcomeMsg.textContent = `Welcome, ${name}!`;
        }

        if (role === 'kid') {
            const adultsTab = document.querySelector('[data-tab="adults"]');
            if (adultsTab) adultsTab.style.display = 'none';
            switchTab('kids');
        } else {
            switchTab('practice');
        }
    }

    function switchTab(tabName) {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        if (tab) tab.click();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMainApp);
} else {
    initMainApp();
}