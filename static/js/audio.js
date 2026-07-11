// audio.js — Recording, TTS, and audio processing

let currentAudioPlayer = null;

function stopCurrentTTS() {
    if (currentAudioPlayer) {
        currentAudioPlayer.pause();
        currentAudioPlayer.currentTime = 0;
        currentAudioPlayer = null;
    }
}

async function playTTS(text, slow) {
    try {
        stopCurrentTTS();
        const url = `/api/tts?text=${encodeURIComponent(text)}${slow ? '&slow=true' : ''}`;
        const audio = new Audio(url);
        currentAudioPlayer = audio;
        audio.onended = () => { if (currentAudioPlayer === audio) currentAudioPlayer = null; };
        await audio.play();
        return new Promise(resolve => { audio.onended = resolve; });
    } catch (err) {
        console.error("TTS Error", err);
    }
}

async function playKidsTTS(text) {
    return playTTS(text, true);
}

// Toggle the little bar-chart animation inside a button that contains
// a `.waveform` element — this is the app's recording indicator.
function setWaveformLive(btn, live) {
    const wf = btn.querySelector('.waveform');
    if (wf) wf.classList.toggle('live', live);
}

async function startRecording(btn, statusEl, callback) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const mimeTypes = [
            'audio/webm;codecs=opus', 'audio/webm',
            'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'
        ];
        let options = {};
        let chosenExt = 'webm';
        for (const mime of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mime)) {
                options = { mimeType: mime };
                chosenExt = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
                break;
            }
        }

        window.appState.mediaRecorder = new MediaRecorder(stream, options);
        window.appState.audioChunks = [];
        window.appState.recordExt = chosenExt;

        window.appState.mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) window.appState.audioChunks.push(e.data);
        };
        window.appState.mediaRecorder.onstop = async () => {
            const blob = new Blob(window.appState.audioChunks, {
                type: window.appState.mediaRecorder.mimeType || 'audio/webm'
            });
            await processAudio(blob, callback);
            stream.getTracks().forEach(t => t.stop());
        };

        window.appState.mediaRecorder.start();
        window.appState.isRecording = true;
        setWaveformLive(btn, true);
        const label = btn.querySelector('.waveform') ? null : btn;
        if (!btn.querySelector('.waveform')) btn.textContent = '⏹ Stop';
        btn.classList.add('recording');
        if (statusEl) statusEl.textContent = 'Recording... tap again to stop';
    } catch (err) {
        console.error(err);
        alert("Microphone access denied, or no microphone was found. Please allow microphone access in your browser's site settings and try again.");
    }
}

function stopRecording(btn, statusEl) {
    if (window.appState.mediaRecorder && window.appState.isRecording) {
        setTimeout(() => {
            if (window.appState.mediaRecorder.state !== 'inactive') {
                window.appState.mediaRecorder.stop();
            }
            window.appState.isRecording = false;
            setWaveformLive(btn, false);

            // Restore button label based on context
            if (!btn.querySelector('.waveform')) {
                if (btn.id === 'monster-record-btn') btn.textContent = '🎤 ROAR!';
                else if (btn.classList.contains('record-btn')) btn.textContent = '🎤 Say It!';
                else btn.textContent = '🎤 Record';
            }

            btn.classList.remove('recording');
            if (statusEl) statusEl.textContent = 'Processing...';
        }, 400);
    }
}

async function processAudio(blob, callback) {
    const formData = new FormData();
    const ext = window.appState.recordExt || 'webm';
    formData.append('audio', blob, `recording.${ext}`);
    formData.append('mode', window.appState.currentMode || 'practice');

    // Determine target text based on mode
    let targetText = window.appState.activeTargetText;
    if (window.appState.currentMode === 'practice') {
        const customInput = document.getElementById('custom-phrase');
        if (customInput) targetText = customInput.value.trim();
    } else if (window.appState.currentMode === 'kids' && window.appState.currentSubMode === 'monster') {
        targetText = "Roar";
    }

    if (!targetText) {
        alert("Please enter or select a phrase to practice first.");
        return;
    }
    formData.append('target_text', targetText);

    // Show loading state
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
        const res = await fetch('/api/evaluate', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        if (callback) {
            callback(data);
        } else if (window.appState.currentMode === 'practice' && window.showPracticeResults) {
            window.showPracticeResults(data);
        } else if (window.appState.currentMode === 'adults' && window.showAdultsResults) {
            window.showAdultsResults(data);
        } else if (window.appState.currentMode === 'kids' && window.showKidsResults) {
            window.showKidsResults(data);
        }
    } catch (err) {
        alert("Could not reach the server. Please check your connection and try again.");
        console.error(err);
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}
