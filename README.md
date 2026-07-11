# AI Pronunciation Coach

A Flask app that listens to spoken English, compares it against a target
phrase phoneme-by-phoneme, and gives word-level, syllable-level, and
sound-level pronunciation feedback — with separate Practice, Adults, and
Kids experiences, a word-search game, and a Progress dashboard.

## What's inside

- **Speech recognition pipeline**: browser `MediaRecorder` (WebM/Opus) →
  ffmpeg/pydub preprocessing (mono, 16kHz, high-pass filter, volume
  normalization) → Google Speech Recognition.
- **Word-level diff**: every word in the target phrase is marked correct,
  wrong, close, or missing, with a clickable detail card (target vs. heard
  IPA, accuracy %, the specific problem, and how to fix it).
- **Syllable breakdown**: each word is split into syllables with their own
  accuracy score and audio playback.
- **Phoneme comparison**: missing / extra / substituted sounds are detected
  and explained in plain English (e.g. "you said /t/ instead of /θ/ — put
  your tongue between your teeth").
- **Session summary**: "You pronounced 7 of 9 words correctly," main
  problem sounds, hardest word, weakest phoneme, and a confidence score —
  instead of just a number.
- **Kids Mode**: emoji word cards, star ratings, confetti, a mascot, and a
  "let's practice together" mode that sounds a missed word out step by
  step (B... BUH... BUS...).
- **Adults Mode**: real-life scenario scripts (workplace, travel, medical,
  etc.), scientific-but-simple explanations of each sound, and recommended
  follow-up exercises generated from your weakest sounds.
- **Progress tab**: session history, average score, improvement trend,
  most-improved sound, weakest sound, and a score-over-time chart —
  filterable by mode.
- **Word Search game**: a lightweight vocabulary game that speaks each word
  aloud when found.

## Setup Instructions

### 1. Install ffmpeg (required)

The browser records audio as WebM/Opus. `pydub` needs **ffmpeg** on your
system PATH to convert that into the WAV format the speech recognizer
needs. Without it, every recording will fail with a decode error.

- **Windows**: Download a build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)
  or [ffmpeg.org](https://ffmpeg.org/download.html), unzip it, and add the
  `bin` folder to your PATH environment variable. Verify with
  `ffmpeg -version` in a new terminal.
- **macOS**: `brew install ffmpeg`
- **Debian / Ubuntu**: `sudo apt update && sudo apt install ffmpeg`
- **Fedora**: `sudo dnf install ffmpeg`

The app checks for ffmpeg on startup and prints a warning in the console
if it isn't found.

### 2. Install Python dependencies

Requires Python 3.9+.

```bash
pip install -r requirements.txt
```

### 3. Run the app

```bash
python app.py
```

Open `http://localhost:5000` in **Chrome or Edge** (recommended — best
`MediaRecorder`/microphone support), pick a profile on the login screen,
and start practicing.

> The dev server (`app.run(debug=True)`) is fine for local use. For a real
> deployment, run it behind a production WSGI server (e.g. `gunicorn
> app:app`) and a reverse proxy.

## Project structure

```
app.py                     Flask backend: audio pipeline, scoring, IPA/phoneme
                            analysis, syllable analysis, session history, routes
requirements.txt           Python dependencies
weak_sounds.json           Auto-created/updated store of sounds you miss most
history.json                Auto-created session history (git-ignored)
templates/
  login.html                Profile picker
  index.html                Main app shell (Practice / Adults / Kids / Games / Progress)
static/
  css/styles.css             Design system + all component styles
  js/
    utils.js                 Mascot, confetti, score ring, word-detail modal,
                              summary card, weak-sounds panel
    audio.js                 Microphone recording, TTS playback, upload to /api/evaluate
    main.js                  Tab switching + shared app state
    practice.js               Practice tab: sentence library + results
    adults.js                 Adults tab: scenarios + recommended exercises
    kids.js                    Kids tab: word grids + step-by-step coaching
    games.js                   Word search game
    progress.js                 Progress tab: stats, chart, history
```

## API overview

| Route                     | Method | Purpose                                              |
|----------------------------|--------|-------------------------------------------------------|
| `/`                         | GET    | Login / profile picker                                |
| `/app`                      | GET    | Main app                                               |
| `/api/evaluate`             | POST   | Upload `audio` + `target_text` (+ `mode`), get scores, word/syllable/phoneme diff, and a summary |
| `/api/tts?text=...&slow=`   | GET    | Text-to-speech playback (gTTS)                         |
| `/api/weak_sounds`          | GET    | Aggregated weak-sound counts                            |
| `/api/weak_sounds/reset`    | POST   | Clear weak-sound history                                 |
| `/api/history`              | GET    | Session history + aggregate progress stats (optional `?mode=`) |
| `/api/history/reset`        | POST   | Clear session history                                    |

## Notes on the audio pipeline

- Recordings that are genuinely silent (no signal at all) are detected
  *before* calling the speech API, so "No speech detected" only appears
  when there truly was nothing to hear.
- If the initial recognition attempt fails, the server retries once with a
  lower energy threshold before giving up — this rescues quiet or
  distant recordings.
- If ffmpeg is missing or the upload is corrupted, the app returns a
  specific "we couldn't read that recording" message instead of a generic
  failure.

## Known limitations

- Speech recognition uses the free Google Web Speech API via
  `SpeechRecognition`, which requires an internet connection and can be
  rate-limited under heavy use. For production-grade or offline use,
  swap in a dedicated STT service inside `transcribe_audio()` in `app.py`.
- IPA transcription (`eng_to_ipa`) covers standard American English
  pronunciations; uncommon words may fall back to a best-effort guess.
