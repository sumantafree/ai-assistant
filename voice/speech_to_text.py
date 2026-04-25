"""
SPEECH TO TEXT
--------------
Uses OpenAI Whisper for accurate local speech recognition.
Supports continuous listening mode with a simple callback system.

Models: tiny, base, small, medium, large
  - tiny/base: Fast, good for simple commands
  - small: Balanced (recommended)
  - medium/large: High accuracy, slower
"""
import whisper
import sounddevice as sd
import numpy as np
import tempfile
import os
import wave
import threading
import time
from typing import Callable, Optional

# Load model once at startup (small = good balance of speed/accuracy)
_model = None
_model_name = "small"


def _get_model():
    global _model
    if _model is None:
        print(f"[STT] Loading Whisper model: {_model_name}...")
        _model = whisper.load_model(_model_name)
        print("[STT] Whisper model loaded")
    return _model


def transcribe_audio_file(audio_path: str, language: str = "en") -> str:
    """
    Transcribe an audio file to text.

    Args:
        audio_path: Path to .wav or .mp3 file
        language: Language code (en, hi, bn, etc.)

    Returns:
        Transcribed text
    """
    model = _get_model()
    result = model.transcribe(audio_path, language=language, task="transcribe")
    return result["text"].strip()


def record_audio(duration: float = 5.0, sample_rate: int = 16000) -> str:
    """
    Record audio from microphone and save to temp file.

    Args:
        duration: Recording duration in seconds
        sample_rate: Audio sample rate (Whisper needs 16000)

    Returns:
        Path to saved .wav file
    """
    print(f"[STT] Recording for {duration}s...")
    audio_data = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype=np.int16,
    )
    sd.wait()
    print("[STT] Recording complete")

    # Save to temp file
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    with wave.open(tmp.name, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data.tobytes())

    return tmp.name


def listen_and_transcribe(duration: float = 5.0, language: str = "en") -> str:
    """
    Record audio and return transcribed text.

    Args:
        duration: How long to listen (seconds)
        language: Language code

    Returns:
        Transcribed text
    """
    audio_path = record_audio(duration)
    try:
        text = transcribe_audio_file(audio_path, language)
        return text
    finally:
        os.unlink(audio_path)  # Clean up temp file


class ContinuousListener:
    """
    Continuous listening mode — listens for voice activity and transcribes.

    Usage:
        listener = ContinuousListener(callback=process_command)
        listener.start()
        # ... later ...
        listener.stop()
    """

    def __init__(
        self,
        callback: Callable[[str], None],
        wake_word: Optional[str] = "assistant",
        sample_rate: int = 16000,
        chunk_duration: float = 3.0,
        silence_threshold: float = 0.01,
        language: str = "en",
    ):
        self.callback = callback
        self.wake_word = wake_word.lower() if wake_word else None
        self.sample_rate = sample_rate
        self.chunk_duration = chunk_duration
        self.silence_threshold = silence_threshold
        self.language = language
        self._running = False
        self._thread = None

    def start(self):
        """Start continuous listening in a background thread."""
        self._running = True
        self._thread = threading.Thread(target=self._listen_loop, daemon=True)
        self._thread.start()
        print("[STT] Continuous listening started")
        if self.wake_word:
            print(f"[STT] Wake word: '{self.wake_word}'")

    def stop(self):
        """Stop the listening thread."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        print("[STT] Continuous listening stopped")

    def _has_speech(self, audio: np.ndarray) -> bool:
        """Simple energy-based voice activity detection."""
        return np.sqrt(np.mean(audio.astype(float) ** 2)) > self.silence_threshold * 32768

    def _listen_loop(self):
        """Main listening loop."""
        while self._running:
            try:
                # Record chunk
                audio = sd.rec(
                    int(self.chunk_duration * self.sample_rate),
                    samplerate=self.sample_rate,
                    channels=1,
                    dtype=np.int16,
                )
                sd.wait()

                # Skip silent chunks
                if not self._has_speech(audio):
                    continue

                # Transcribe
                tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                with wave.open(tmp.name, "w") as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(self.sample_rate)
                    wf.writeframes(audio.tobytes())

                text = transcribe_audio_file(tmp.name, self.language)
                os.unlink(tmp.name)

                if not text.strip():
                    continue

                print(f"[STT] Heard: {text}")

                # Wake word check
                if self.wake_word:
                    if self.wake_word in text.lower():
                        # Extract command after wake word
                        parts = text.lower().split(self.wake_word, 1)
                        command = parts[1].strip() if len(parts) > 1 else text
                        if command:
                            self.callback(command)
                    # If no wake word in text, ignore
                else:
                    self.callback(text)

            except Exception as e:
                print(f"[STT] Error in listen loop: {e}")
                time.sleep(1)
