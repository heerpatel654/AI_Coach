import os
import shutil
import difflib
import string
import uuid
from datetime import datetime, timezone

import speech_recognition as sr
from flask import Flask, render_template, request, jsonify, send_file
from pydub import AudioSegment, effects
from pydub.exceptions import CouldntDecodeError
from gtts import gTTS
import tempfile
import eng_to_ipa as ipa
import pyphen
import json
from io import BytesIO

app = Flask(__name__)
dic = pyphen.Pyphen(lang='en_US')

# ─────────────────────────────────────────────────────────────────
# STARTUP CHECKS — ffmpeg is required by pydub to decode WebM/Opus
# audio coming from the browser's MediaRecorder API.
# ─────────────────────────────────────────────────────────────────
FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None
if not FFMPEG_AVAILABLE:
    print(
        "\n[WARNING] ffmpeg was not found on PATH. Audio recorded in the browser "
        "(WebM/Opus) cannot be converted to WAV without it, so speech recognition "
        "will fail. Install ffmpeg and make sure it is on your PATH, then restart "
        "the server. See README.md for OS-specific instructions.\n"
    )

# ─────────────────────────────────────────────────────────────────
# PHONEME REGISTRY, digraphs must come before single chars
# ─────────────────────────────────────────────────────────────────
PHONEME_ORDER = [
    'tʃ', 'dʒ', 'aɪ', 'aʊ', 'oʊ', 'eɪ', 'ɔɪ', 'ɪə', 'eə', 'ʊə',
    'θ', 'ð', 'ʃ', 'ʒ', 'ŋ', 'æ', 'ɑ', 'ɔ', 'ə', 'ɛ', 'ɪ', 'ʊ', 'ʌ',
    'i', 'u', 'r', 'l', 'v', 'w', 'p', 'b', 't', 'd', 'k', 'g',
    'f', 's', 'z', 'h', 'm', 'n', 'j', 'ˈ', 'ˌ'
]

PHONEME_INFO = {
    'θ':  ("TH (voiceless)",  "Put your tongue BETWEEN your teeth and blow air, like in 'think'. Many learners say /t/ instead."),
    'ð':  ("TH (voiced)",     "Tongue between teeth, now USE your voice, like in 'this' or 'the'."),
    'ʃ':  ("SH",              "Round your lips slightly and push air, like in 'shoe' or 'she'."),
    'ʒ':  ("ZH",              "Like SH but voiced, like in 'measure' or 'treasure'."),
    'tʃ': ("CH",              "Start with a T, immediately push into SH, like in 'chair' or 'church'."),
    'dʒ': ("J",               "Start with D, immediately push into ZH, like in 'jump' or 'judge'."),
    'ŋ':  ("NG",              "Back of tongue to soft palate, NO hard G at the end, like in 'sing' or 'thinking'."),
    'æ':  ("short A",         "Open mouth wide and pull lips back, like in 'cat' or 'hat'. Don't say 'eh'."),
    'ɑ':  ("AH",              "Drop your jaw all the way, like in 'father' or 'hot'."),
    'ɔ':  ("AW",              "Round your lips, mid-low, like in 'thought' or 'caught'."),
    'ə':  ("schwa",           "The most relaxed sound in English, like the 'a' in 'sofa' or 'about'. Totally neutral."),
    'ɛ':  ("short E",         "Lips slightly spread, like in 'bed' or 'get'."),
    'ɪ':  ("short I",         "Relaxed, lips slightly spread, like in 'sit' or 'it'. Shorter than EE."),
    'ʊ':  ("short OO",        "Loosely rounded lips, like in 'foot' or 'book'. Don't tense too much."),
    'ʌ':  ("short U",         "Relaxed open mouth, like in 'cup' or 'but'."),
    'i':  ("long EE",         "Lips wide and tense, like in 'see' or 'tree'."),
    'u':  ("long OO",         "Tightly rounded lips, like in 'food' or 'blue'."),
    'eɪ': ("long A",          "Start with E, glide toward I, like in 'say' or 'face'."),
    'aɪ': ("long I",          "Start with AH, glide toward EE, like in 'my' or 'time'."),
    'aʊ': ("OW",              "Start with AH, glide toward OO, like in 'now' or 'out'."),
    'oʊ': ("long O",          "Start with OH, glide toward OO, like in 'go' or 'home'."),
    'ɔɪ': ("OY",              "Start with AW, glide toward EE, like in 'boy' or 'voice'."),
    'r':  ("R",               "Curl tongue back slightly, don't touch the roof, like in 'red'. Don't trill it."),
    'l':  ("L",               "Touch tongue tip to the ridge just behind top teeth, like in 'let'."),
    'v':  ("V",               "Top teeth on lower lip, add voice, like in 'very'. Don't say /w/."),
    'w':  ("W",               "Round your lips then release, like in 'wet' or 'one'."),
    'p':  ("P",               "Lips together, pop air out (no voice), like in 'pen'."),
    'b':  ("B",               "Like P but with voice, like in 'bed'."),
    't':  ("T",               "Tongue tap to the ridge behind top teeth (no voice), like in 'ten'."),
    'd':  ("D",               "Like T but with voice, like in 'dog'."),
    'k':  ("K",               "Back of tongue to soft palate (no voice), like in 'cat'."),
    'g':  ("G",               "Like K but with voice, like in 'go'."),
    'f':  ("F",               "Top teeth lightly touch lower lip, blow air, like in 'fan'."),
    's':  ("S",               "Tongue near the ridge, push air through, like in 'sun'."),
    'z':  ("Z",               "Like S but with voice, like in 'zoo'."),
    'h':  ("H",               "Open mouth, breathe out, like in 'hat'."),
    'm':  ("M",               "Close lips and hum through your nose, like in 'man'."),
    'n':  ("N",               "Tongue to ridge, hum through nose, like in 'no'."),
    'j':  ("Y",               "Middle of tongue to palate, like in 'yes'."),
}


# ─────────────────────────────────────────────────────────────────
# WEAK SOUNDS PERSISTENCE
# ─────────────────────────────────────────────────────────────────
def load_weak_sounds():
    try:
        with open("weak_sounds.json", "r") as f:
            return json.load(f)
    except Exception:
        return {}


def save_weak_sounds(data):
    with open("weak_sounds.json", "w") as f:
        json.dump(data, f, indent=4)


def update_weak_sound(phoneme):
    if phoneme not in PHONEME_INFO:
        return
    label = PHONEME_INFO[phoneme][0]
    data = load_weak_sounds()
    data[label] = data.get(label, 0) + 1
    save_weak_sounds(data)


# ─────────────────────────────────────────────────────────────────
# AUDIO TRANSCRIPTION
# ─────────────────────────────────────────────────────────────────
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def preprocess_audio(file_path: str, wav_path: str) -> AudioSegment:
    """
    Load the raw upload (WebM/Opus, MP4, OGG, whatever the browser sent) and
    turn it into a clean, mono, 16kHz WAV suitable for speech recognition.

    Steps:
      1. Decode with pydub/ffmpeg (auto-detects container/codec).
      2. Convert to mono.
      3. Resample to 16kHz (what Google's recognizer expects).
      4. High-pass filter to remove low-frequency rumble / mic hum.
      5. Normalize volume so quiet recordings aren't mistaken for silence.

    Raises CouldntDecodeError if ffmpeg/pydub cannot read the file at all
    (almost always means ffmpeg is missing or the upload was corrupted).
    """
    audio = AudioSegment.from_file(file_path)

    if audio.channels > 1:
        audio = audio.set_channels(1)

    audio = audio.set_frame_rate(16000)

    # Remove rumble/hum below human speech range before normalizing,
    # otherwise a loud low-frequency artifact can dominate the gain
    # calculation and speech ends up too quiet.
    audio = audio.high_pass_filter(80)

    # effects.normalize brings the peak up to 0dB without clipping,
    # which reliably fixes "spoke too quietly" false negatives.
    audio = effects.normalize(audio)

    audio.export(wav_path, format="wav")
    return audio


def transcribe_audio(file_path: str) -> tuple:
    """
    Convert the uploaded recording into text.

    Returns (text, error_code) where error_code is one of:
      None            success (text may still be "" if nothing was said)
      "empty_upload"  the browser sent an empty/near-empty file
      "decode_error"  pydub/ffmpeg could not read the audio container
      "silent"        audio decoded fine but there is no detectable speech
      "api_error"     the Google Speech API could not be reached
    """
    r = sr.Recognizer()
    r.energy_threshold = 300
    r.dynamic_energy_threshold = True
    wav_path = file_path + ".wav"

    if not os.path.exists(file_path) or os.path.getsize(file_path) < 200:
        return "", "empty_upload"

    try:
        audio = preprocess_audio(file_path, wav_path)
    except CouldntDecodeError as e:
        print(f"[transcribe_audio] Decode error: {e}")
        return "", "decode_error"
    except FileNotFoundError as e:
        # Raised by pydub when ffmpeg itself is missing from PATH.
        print(f"[transcribe_audio] ffmpeg not found: {e}")
        return "", "decode_error"
    except Exception as e:
        print(f"[transcribe_audio] Unexpected preprocessing error: {e}")
        return "", "decode_error"

    try:
        # A truly silent / empty recording has almost no signal and is very
        # short. Catch that case explicitly instead of relying on the API,
        # so we never say "no speech detected" just because Google's
        # recognizer struggled with an otherwise valid recording.
        if len(audio) < 250 or audio.dBFS == float("-inf") or audio.dBFS < -45:
            return "", "silent"

        with sr.AudioFile(wav_path) as source:
            r.adjust_for_ambient_noise(source, duration=min(0.5, len(audio) / 2000))
            audio_data = r.record(source)

        try:
            text = r.recognize_google(audio_data, language='en-US')
            return text, None
        except sr.UnknownValueError:
            # Try once more with a lower energy threshold — helps with
            # soft-spoken or distant recordings that are not actually silent.
            try:
                r.energy_threshold = 150
                text = r.recognize_google(audio_data, language='en-US')
                return text, None
            except sr.UnknownValueError:
                return "", "silent"
            except sr.RequestError as e:
                print(f"[transcribe_audio] SR API error (retry): {e}")
                return "", "api_error"
        except sr.RequestError as e:
            print(f"[transcribe_audio] SR API error: {e}")
            return "", "api_error"

    except Exception as e:
        print(f"[transcribe_audio] Transcription error: {e}")
        return "", "silent"
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)


# ─────────────────────────────────────────────────────────────────
# IPA UTILITIES
# ─────────────────────────────────────────────────────────────────
def get_ipa(word: str) -> str:
    """Convert a word to IPA. Returns word itself if not found."""
    try:
        result = ipa.convert(word)
        return word if (not result or result.startswith('*')) else result
    except Exception:
        return word


def tokenize_ipa(ipa_str: str) -> list:
    """
    Split IPA string into proper phoneme tokens.
    Digraphs are matched before single chars so tʃ beats t+ʃ.
    """
    tokens = []
    i = 0
    while i < len(ipa_str):
        matched = False
        for ph in PHONEME_ORDER:
            if ipa_str[i:].startswith(ph):
                tokens.append(ph)
                i += len(ph)
                matched = True
                break
        if not matched:
            tokens.append(ipa_str[i])
            i += 1
    return tokens


def content_tokens(ipa_str: str) -> list:
    """Tokens with stress markers and spaces removed, for scoring."""
    return [p for p in tokenize_ipa(ipa_str) if p not in ('ˈ', 'ˌ', ' ')]


SUFFIX_SPLITS = [
    ('ing', -3), ('ed', -2), ('er', -2), ('est', -3),
    ('ly', -2), ('ness', -4), ('tion', -4), ('sion', -4),
    ('ment', -4), ('ful', -3), ('less', -4), ('able', -4),
    ('ible', -4), ('ous', -3), ('ive', -3), ('al', -2),
]


def syllabify(word: str) -> list:
    """Syllabify a word; falls back to suffix-splitting when pyphen gives one chunk."""
    raw = dic.inserted(word)
    if '-' in raw:
        return raw.split('-')
    low = word.lower()
    for suffix, cut in SUFFIX_SPLITS:
        if low.endswith(suffix) and len(word) + cut >= 2:
            stem = word[:cut]
            if len(stem) >= 2:
                return [stem, word[cut:]]
    return [word]


def distribute_ipa_to_syllables(word: str, word_ipa: str) -> list:
    """
    Proportionally assign IPA characters to each syllable.
    Returns list of { syllable, ipa_chunk }.
    """
    syllables = syllabify(word)

    if len(syllables) == 1:
        return [{"syllable": syllables[0], "ipa_chunk": word_ipa}]

    # Peel off leading stress marker
    stress_prefix = ""
    clean_ipa = word_ipa
    while clean_ipa and clean_ipa[0] in ('ˈ', 'ˌ'):
        stress_prefix += clean_ipa[0]
        clean_ipa = clean_ipa[1:]

    total_letters = sum(len(s) for s in syllables)
    result = []
    ipa_pos = 0

    for i, syl in enumerate(syllables):
        if i == len(syllables) - 1:
            chunk = clean_ipa[ipa_pos:]
        else:
            size = max(1, round((len(syl) / total_letters) * len(clean_ipa)))
            chunk = clean_ipa[ipa_pos: ipa_pos + size]
            ipa_pos += size
        prefix = stress_prefix if i == 0 else ""
        result.append({"syllable": syl, "ipa_chunk": prefix + chunk})

    return result


# ─────────────────────────────────────────────────────────────────
# PHONEME DIFF
# ─────────────────────────────────────────────────────────────────
def diff_phonemes(target_ipa: str, heard_ipa: str) -> list:
    """
    Token-level diff between two IPA strings (stress markers ignored).
    Returns list of { target, heard, label, tip }.
    """
    t_tok = content_tokens(target_ipa)
    h_tok = content_tokens(heard_ipa)

    matcher = difflib.SequenceMatcher(None, t_tok, h_tok)
    issues = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            continue

        target_chunk = t_tok[i1:i2]
        heard_chunk  = h_tok[j1:j2]

        # Find the first known phoneme in the target chunk to get a tip
        found_tip = False
        for ph in target_chunk:
            if ph in PHONEME_INFO:
                label, tip = PHONEME_INFO[ph]
                update_weak_sound(ph)
                issues.append({
                    "target": ''.join(target_chunk),
                    "heard":  ''.join(heard_chunk) if heard_chunk else "(missing)",
                    "label":  label,
                    "tip":    tip,
                })
                found_tip = True
                break

        if not found_tip and target_chunk:
            issues.append({
                "target": ''.join(target_chunk),
                "heard":  ''.join(heard_chunk) if heard_chunk else "(missing)",
                "label":  ''.join(target_chunk),
                "tip":    f"Focus on clearly pronouncing /{' '.join(target_chunk)}/ here.",
            })

    return issues


# ─────────────────────────────────────────────────────────────────
# SYLLABLE SCORING
# ─────────────────────────────────────────────────────────────────
def score_syllables_for_word(target_word: str, heard_word: str) -> list:
    """
    Per-syllable accuracy breakdown.
    Returns list of { syllable, ipa, heard_ipa, accuracy, status, issues }.
    """
    t_ipa = get_ipa(target_word)
    h_ipa = get_ipa(heard_word) if heard_word else ""

    t_spans = distribute_ipa_to_syllables(target_word, t_ipa)
    h_spans = distribute_ipa_to_syllables(heard_word, h_ipa) if heard_word and h_ipa else []

    result = []
    for i, span in enumerate(t_spans):
        t_chunk = span["ipa_chunk"]
        h_chunk = h_spans[i]["ipa_chunk"] if i < len(h_spans) else ""

        t_tok = content_tokens(t_chunk)
        h_tok = content_tokens(h_chunk)

        ratio    = difflib.SequenceMatcher(None, t_tok, h_tok).ratio() if t_tok else 1.0
        accuracy = int(ratio * 100)

        if accuracy >= 85:
            status = "correct"
        elif accuracy >= 55:
            status = "close"
        else:
            status = "wrong"

        issues = diff_phonemes(t_chunk, h_chunk) if status != "correct" else []

        result.append({
            "syllable":  span["syllable"],
            "ipa":       t_chunk,
            "heard_ipa": h_chunk,
            "accuracy":  accuracy,
            "status":    status,
            "issues":    issues,
        })

    return result


# ─────────────────────────────────────────────────────────────────
# SCORING
# ─────────────────────────────────────────────────────────────────
def calculate_pronunciation_score(target: str, recognized: str) -> dict:
    """
    Returns:
      total         , final weighted score 0–100  ← also returned as 'score' for backward compat
      word_score    , word sequence match 0–100
      ipa_score     , phoneme token similarity 0–100
      syllable_score, average syllable accuracy 0–100
    Weights: word 25 | ipa 50 | syllable 25
    """
    t_words = target.split()
    r_words = recognized.split()

    # 1. Word-sequence score
    word_score = int(difflib.SequenceMatcher(None, t_words, r_words).ratio() * 100)

    # 2. Full-sentence IPA phoneme score
    t_ipa_full = " ".join(get_ipa(w) for w in t_words)
    r_ipa_full = " ".join(get_ipa(w) for w in r_words)
    t_tok = content_tokens(t_ipa_full)
    r_tok = content_tokens(r_ipa_full)
    ipa_score = int(difflib.SequenceMatcher(None, t_tok, r_tok).ratio() * 100)

    # 3. Per-syllable score averaged across all paired words
    syl_accs = []
    for tw, rw in zip(t_words, r_words):
        for s in score_syllables_for_word(tw, rw):
            syl_accs.append(s["accuracy"])
    syllable_score = int(sum(syl_accs) / len(syl_accs)) if syl_accs else word_score

    total = int(word_score * 0.25 + ipa_score * 0.50 + syllable_score * 0.25)

    return {
        "total":          total,
        "word_score":     word_score,
        "ipa_score":      ipa_score,
        "syllable_score": syllable_score,
    }


# ─────────────────────────────────────────────────────────────────
# WORD DIFF
# ─────────────────────────────────────────────────────────────────
def get_word_diff(target: str, recognized: str) -> list:
    target_words = target.lower().split()
    rec_words    = recognized.lower().split()
    matcher      = difflib.SequenceMatcher(None, target_words, rec_words)
    diff         = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():

        if tag == "equal":
            for word in target_words[i1:i2]:
                diff.append({
                    "word":      word,
                    "status":    "correct",
                    "word_ipa":  get_ipa(word),
                    "syllables": score_syllables_for_word(word, word),
                    "tip":       "",
                })

        elif tag == "replace":
            for i in range(max(i2 - i1, j2 - j1)):
                t_word = target_words[i1 + i] if i < (i2 - i1) else ""
                r_word = rec_words[j1 + i]    if i < (j2 - j1) else ""

                if t_word and r_word:
                    t_ipa = get_ipa(t_word)
                    r_ipa = get_ipa(r_word)

                    text_ratio = difflib.SequenceMatcher(None, t_word, r_word).ratio()
                    t_tok = content_tokens(t_ipa)
                    r_tok = content_tokens(r_ipa)
                    ipa_ratio  = difflib.SequenceMatcher(None, t_tok, r_tok).ratio()
                    similarity = round(text_ratio * 0.4 + ipa_ratio * 0.6, 3)

                    phoneme_issues  = diff_phonemes(t_ipa, r_ipa)
                    syllable_scores = score_syllables_for_word(t_word, r_word)

                    # Human-readable tip, simple, syllable-first, no em dashes
                    tip_lines = [f"You said '{r_word}'. The correct word is '{t_word}'."]

                    # Syllable-by-syllable breakdown
                    if len(syllable_scores) > 1:
                        tip_lines.append("Here is each syllable:")
                    for s in syllable_scores:
                        syl = s["syllable"]
                        if s["status"] == "correct":
                            tip_lines.append(f"'{syl}' - good job on this part!")
                        elif s["status"] == "close":
                            tip_lines.append(f"'{syl}' - almost there, say this part a little more clearly.")
                        else:
                            if s["issues"]:
                                p = s["issues"][0]
                                tip_lines.append(
                                    f"'{syl}' - needs work. "
                                    f"Focus on the {p['label']} sound here. "
                                    f"{p['tip']}"
                                )
                            else:
                                tip_lines.append(f"'{syl}' - needs work. Say this part more slowly.")

                    # One clear overall fix
                    if phoneme_issues:
                        p = phoneme_issues[0]
                        tip_lines.append(
                            f"Main sound to practise: {p['label']}. "
                            f"{p['tip']}"
                        )

                    status = "wrong" if similarity < 0.75 else "close"

                    diff.append({
                        "word":           t_word,
                        "status":         status,
                        "recognized":     r_word,
                        "word_ipa":       t_ipa,
                        "recognized_ipa": r_ipa,
                        "similarity":     similarity,
                        "phoneme_issues": phoneme_issues,
                        "syllables":      syllable_scores,
                        "tip":            "\n".join(tip_lines),
                    })

                elif t_word:
                    syls = dic.inserted(t_word).replace('-', ' - ')
                    diff.append({
                        "word":      t_word,
                        "status":    "missing",
                        "word_ipa":  get_ipa(t_word),
                        "syllables": score_syllables_for_word(t_word, ""),
                        "tip":       f"You skipped '{t_word}'. Try breaking it down: {syls}.",
                    })
                elif r_word:
                    diff.append({"word": r_word, "status": "extra", "tip": f"You said '{r_word}' but it is not in the target. Try to stick to the text."})

        elif tag == "delete":
            for word in target_words[i1:i2]:
                syls = dic.inserted(word).replace('-', ' - ')
                diff.append({
                    "word":      word,
                    "status":    "missing",
                    "word_ipa":  get_ipa(word),
                    "syllables": score_syllables_for_word(word, ""),
                    "tip":       f"You skipped '{word}'. Try breaking it down: {syls}.",
                })

        elif tag == "insert":
            for word in rec_words[j1:j2]:
                diff.append({"word": word, "status": "extra", "tip": f"You said '{word}' but it is not in the target. Try to stick to the text."})

    return diff


# ─────────────────────────────────────────────────────────────────
# SESSION SUMMARY
# Turns the raw diff + scores into the kind of high level readout a
# real coaching app shows: "7 of 9 words correct", weakest phoneme,
# hardest word, and an overall confidence figure.
# ─────────────────────────────────────────────────────────────────
def build_summary(diff: list, scores: dict) -> dict:
    scored_words = [d for d in diff if d["status"] != "extra"]
    total_count   = len(scored_words)
    correct_count = len([d for d in scored_words if d["status"] == "correct"])

    phoneme_counter = {}
    hardest_word       = None
    hardest_word_score = 101

    for d in scored_words:
        if d["status"] != "correct":
            sim_pct = round(d.get("similarity", 0) * 100) if "similarity" in d else 0
            if sim_pct < hardest_word_score:
                hardest_word_score = sim_pct
                hardest_word = d["word"]

        for issue in d.get("phoneme_issues", []) or []:
            phoneme_counter[issue["label"]] = phoneme_counter.get(issue["label"], 0) + 1
        for syl in d.get("syllables", []) or []:
            for issue in syl.get("issues", []) or []:
                phoneme_counter[issue["label"]] = phoneme_counter.get(issue["label"], 0) + 1

    main_problems   = sorted(phoneme_counter.items(), key=lambda x: x[1], reverse=True)[:3]
    weakest_phoneme = main_problems[0][0] if main_problems else None

    # Confidence blends how cleanly words matched with how clean the
    # phoneme stream matched — a simple, explainable proxy for "how sure
    # are we this assessment reflects what was actually said".
    confidence = round(scores["word_score"] * 0.4 + scores["ipa_score"] * 0.6)

    return {
        "correct_count":       correct_count,
        "total_count":         total_count,
        "main_problems":       [label for label, _ in main_problems],
        "most_difficult_word": hardest_word,
        "weakest_phoneme":     weakest_phoneme,
        "confidence":          confidence,
    }


# ─────────────────────────────────────────────────────────────────
# SESSION HISTORY / PROGRESS TRACKING
# Every evaluation is appended to history.json so Adults mode (and the
# Progress panel) can show trends over time instead of a single score.
# ─────────────────────────────────────────────────────────────────
HISTORY_FILE = "history.json"
MAX_HISTORY_ENTRIES = 300


def load_history() -> list:
    try:
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


def save_history(history: list) -> None:
    with open(HISTORY_FILE, "w") as f:
        json.dump(history[-MAX_HISTORY_ENTRIES:], f, indent=2)


def record_session(mode: str, target_text: str, recognized_text: str,
                    scores: dict, summary: dict) -> dict:
    entry = {
        "id":               uuid.uuid4().hex[:10],
        "timestamp":        datetime.now(timezone.utc).isoformat(),
        "mode":             mode,
        "target_text":      target_text,
        "recognized_text":  recognized_text,
        "score":            scores["total"],
        "scores":           scores,
        "correct_count":    summary["correct_count"],
        "total_count":      summary["total_count"],
        "weakest_phoneme":  summary["weakest_phoneme"],
    }
    history = load_history()
    history.append(entry)
    save_history(history)
    return entry


def compute_progress_stats(history: list) -> dict:
    """Aggregate the session history into dashboard-friendly stats."""
    if not history:
        return {
            "sessions":            0,
            "average_score":       0,
            "best_score":          0,
            "improvement":         0,
            "most_improved_sound": None,
            "weakest_sound":       None,
            "current_streak":      0,
        }

    scores   = [h["score"] for h in history]
    sessions = len(history)

    recent = scores[-5:]
    prior  = scores[-10:-5] if sessions > 5 else scores[:max(0, sessions - len(recent))]
    improvement = round((sum(recent) / len(recent)) - (sum(prior) / len(prior)), 1) if prior else 0

    half = max(1, sessions // 2)
    first_half, second_half = history[:half], history[half:] or history[-half:]

    def phoneme_counts(chunk):
        counts = {}
        for h in chunk:
            wp = h.get("weakest_phoneme")
            if wp:
                counts[wp] = counts.get(wp, 0) + 1
        return counts

    first_counts, second_counts = phoneme_counts(first_half), phoneme_counts(second_half)
    most_improved, best_drop = None, 0
    for ph, c1 in first_counts.items():
        drop = c1 - second_counts.get(ph, 0)
        if drop > best_drop:
            best_drop, most_improved = drop, ph

    weak_sounds   = load_weak_sounds()
    weakest_sound = max(weak_sounds.items(), key=lambda x: x[1])[0] if weak_sounds else None

    streak = 0
    for h in reversed(history):
        if h["score"] >= 70:
            streak += 1
        else:
            break

    return {
        "sessions":            sessions,
        "average_score":       round(sum(scores) / sessions, 1),
        "best_score":          max(scores),
        "improvement":         improvement,
        "most_improved_sound": most_improved,
        "weakest_sound":       weakest_sound,
        "current_streak":      streak,
    }


# ─────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────
@app.route('/')
def login():
    return render_template('login.html')


@app.route('/app')
def main_app():
    return render_template('index.html')


@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    file_path = None
    try:
        if 'audio' not in request.files or 'target_text' not in request.form:
            return jsonify({'error': 'Missing audio or target_text'}), 400

        audio_file  = request.files['audio']
        target_text = request.form['target_text']
        mode        = request.form.get('mode', 'practice')

        if audio_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if not target_text.strip():
            return jsonify({'error': 'target_text is empty'}), 400

        # Unique filename per request so concurrent recordings never collide.
        safe_name = f"{uuid.uuid4().hex}_{audio_file.filename}"
        file_path = os.path.join(UPLOAD_FOLDER, safe_name)
        audio_file.save(file_path)

        recognized_text, error_code = transcribe_audio(file_path)

        NO_SPEECH_MESSAGES = {
            "empty_upload": "We didn't receive any audio. Please check your microphone permissions and try again.",
            "decode_error": "We couldn't read that recording. Try a different browser (Chrome or Edge work best) or check that ffmpeg is installed on the server.",
            "silent":       "No speech detected. Try moving closer to the microphone and speaking a little louder.",
            "api_error":    "The speech recognition service is temporarily unavailable. Please try again in a moment.",
        }

        if error_code:
            recognized_text = "(No speech detected)"

        def normalize(text):
            return text.lower().translate(str.maketrans('', '', string.punctuation)).strip()

        norm_target = normalize(target_text)

        if error_code:
            # Don't diff/score against the "(No speech detected)" placeholder —
            # that produces nonsense word-by-word comparisons. Return a clean,
            # honest "we didn't get anything to grade" response instead.
            scores = {"total": 0, "word_score": 0, "ipa_score": 0, "syllable_score": 0}
            diff = []
            summary = {
                "correct_count": 0,
                "total_count": len(norm_target.split()),
                "main_problems": [],
                "most_difficult_word": None,
                "weakest_phoneme": None,
                "confidence": 0,
            }
            total = 0
            feedback = NO_SPEECH_MESSAGES.get(error_code, NO_SPEECH_MESSAGES["silent"])
            top_weak = sorted(load_weak_sounds().items(), key=lambda x: x[1], reverse=True)[:5]
        else:
            norm_recognized = normalize(recognized_text)

            scores  = calculate_pronunciation_score(norm_target, norm_recognized)
            diff    = get_word_diff(norm_target, norm_recognized)
            summary = build_summary(diff, scores)
            total   = scores["total"]

            if total >= 90:
                feedback = "Excellent! Your pronunciation is very accurate. 🌟"
            elif total >= 75:
                feedback = "Great job! A few phonemes to polish, check the highlighted words."
            elif total >= 55:
                feedback = "Good effort! Focus on the syllables marked in orange."
            elif total >= 35:
                feedback = "Keep going! Listen to the example, then try syllable by syllable."
            else:
                feedback = "Let's slow it down, say each syllable one at a time."

            weak_sounds = load_weak_sounds()
            top_weak    = sorted(weak_sounds.items(), key=lambda x: x[1], reverse=True)[:5]

            # Only log a session to history when we actually heard something —
            # a genuine silent/failed take shouldn't count against progress stats.
            record_session(mode, target_text, recognized_text, scores, summary)

        print(f"MODE       : {mode}")
        print(f"TARGET     : {norm_target}")
        print(f"RECOGNIZED : {recognized_text}")
        print(f"SCORES     : {scores}")
        if error_code:
            print(f"AUDIO ISSUE: {error_code}")

        return jsonify({
            # ── backward-compatible flat field ──────────────────
            "score":           total,          # ← what your old frontend reads
            # ── new detailed fields ─────────────────────────────
            "scores":          scores,         # { total, word_score, ipa_score, syllable_score }
            "target_text":     target_text,
            "recognized_text": recognized_text,
            "feedback":        feedback,
            "diff":            diff,           # per-word with syllables + phoneme_issues
            "summary":         summary,        # X/Y correct, main problems, hardest word, confidence
            "top_weak_sounds": top_weak,
            "audio_issue":     error_code,      # null on success, else a machine-readable reason
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)


@app.route('/api/tts', methods=['GET'])
def tts():
    text = request.args.get('text')
    slow = request.args.get('slow', 'false').lower() == 'true'
    if not text:
        return "Missing text", 400
    try:
        tts_obj = gTTS(text=text, lang='en', slow=slow)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as fp:
            temp_path = fp.name
            tts_obj.save(temp_path)
        with open(temp_path, 'rb') as f:
            data = f.read()
        os.remove(temp_path)
        return send_file(BytesIO(data), mimetype='audio/mpeg',
                         as_attachment=False, download_name='pronunciation.mp3')
    except Exception as e:
        return str(e), 500


@app.route('/api/weak_sounds', methods=['GET'])
def get_weak_sounds():
    data = load_weak_sounds()
    return jsonify({"weak_sounds": sorted(data.items(), key=lambda x: x[1], reverse=True)})


@app.route('/api/weak_sounds/reset', methods=['POST'])
def reset_weak_sounds():
    save_weak_sounds({})
    return jsonify({"status": "reset"})


@app.route('/api/history', methods=['GET'])
def get_history():
    """Returns recent sessions plus aggregate progress stats for the
    Progress panel. Optional ?mode=adults|kids|practice filters the list."""
    history = load_history()
    mode_filter = request.args.get('mode')
    if mode_filter:
        filtered = [h for h in history if h.get('mode') == mode_filter]
    else:
        filtered = history

    return jsonify({
        "sessions": list(reversed(filtered[-50:])),   # most recent first
        "stats":    compute_progress_stats(filtered),
    })


@app.route('/api/history/reset', methods=['POST'])
def reset_history():
    save_history([])
    return jsonify({"status": "reset"})


if __name__ == "__main__":
    app.run(debug=True)