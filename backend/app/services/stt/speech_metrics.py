import re
from typing import List, Dict, Any
from app.schemas.attempt import SpeechMetrics

# Standard filler words and common conversational crutches
FILLER_PATTERNS = [
    r"\bum\b",
    r"\buh\b",
    r"\ber\b",
    r"\bah\b",
    r"\blike\b",
    r"\byou know\b",
    r"\bbasically\b",
    r"\bactually\b",
    r"\bliterally\b",
    r"\bi mean\b",
    r"\bsort of\b",
    r"\bkind of\b",
]

COMPILED_FILLER_REGEX = re.compile("|".join(FILLER_PATTERNS), re.IGNORECASE)


def calculate_speech_metrics(
    transcript: str,
    duration_sec: float,
    silence_segments: List[float] = None
) -> SpeechMetrics:
    """
    Computes candidate speech delivery metrics:
    - Words Per Minute (WPM)
    - Filler word count & breakdown
    - Long pauses (> 1.8 seconds)
    - Optimal pace check (130-165 WPM)
    """
    cleaned_transcript = transcript.strip()
    words = cleaned_transcript.split()
    word_count = len(words)

    # Effective duration guard
    effective_duration = max(duration_sec, 1.0)

    # Words Per Minute
    wpm = round((word_count / effective_duration) * 60.0, 1)

    # Filler words detection
    matches = COMPILED_FILLER_REGEX.findall(cleaned_transcript.lower())
    filler_word_count = len(matches)

    # Long pauses (> 1.8 seconds)
    long_pause_count = 0
    if silence_segments:
        long_pause_count = sum(1 for pause_duration in silence_segments if pause_duration >= 1.8)

    optimal_pace = 120.0 <= wpm <= 170.0

    return SpeechMetrics(
        wpm=wpm,
        filler_word_count=filler_word_count,
        filler_words=[m.lower() for m in matches],
        long_pause_count=long_pause_count,
        optimal_pace=optimal_pace,
    )
