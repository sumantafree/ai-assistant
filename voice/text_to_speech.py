"""
TEXT TO SPEECH
--------------
Uses pyttsx3 for offline TTS.
Runs in a background thread to avoid blocking.

Voice options:
  - Rate: 150 (words/min) — adjustable
  - Volume: 0.0 to 1.0
  - Voice: system voices (David, Zira on Windows)
"""
import pyttsx3
import threading
import queue
from typing import Optional


class TTSEngine:
    """
    Thread-safe TTS engine using pyttsx3.
    Processes speech requests from a queue.
    """

    def __init__(self, rate: int = 175, volume: float = 0.9, voice_name: str = None):
        self._queue = queue.Queue()
        self._running = False
        self._thread = None
        self.rate = rate
        self.volume = volume
        self.voice_name = voice_name
        self._engine = None

    def _init_engine(self):
        """Initialize pyttsx3 engine (must be in the same thread it's used)."""
        self._engine = pyttsx3.init()
        self._engine.setProperty("rate", self.rate)
        self._engine.setProperty("volume", self.volume)

        # Set voice
        voices = self._engine.getProperty("voices")
        if self.voice_name:
            for v in voices:
                if self.voice_name.lower() in v.name.lower():
                    self._engine.setProperty("voice", v.id)
                    break
        elif voices:
            # Default: first female voice if available
            female = [v for v in voices if "zira" in v.name.lower() or "female" in v.name.lower()]
            if female:
                self._engine.setProperty("voice", female[0].id)

    def start(self):
        """Start the TTS worker thread."""
        self._running = True
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the TTS worker."""
        self._running = False
        self._queue.put(None)  # Sentinel to unblock

    def speak(self, text: str, priority: bool = False):
        """
        Queue text for speaking.

        Args:
            text: Text to speak
            priority: If True, clear queue and speak immediately
        """
        if priority:
            self.clear_queue()
        self._queue.put(text)

    def speak_sync(self, text: str):
        """Speak text synchronously (blocks until done)."""
        engine = pyttsx3.init()
        engine.setProperty("rate", self.rate)
        engine.setProperty("volume", self.volume)
        engine.say(text)
        engine.runAndWait()

    def clear_queue(self):
        """Clear pending speech queue."""
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
            except queue.Empty:
                break

    def _worker(self):
        """Worker thread — processes speech queue."""
        self._init_engine()
        while self._running:
            try:
                text = self._queue.get(timeout=0.5)
                if text is None:
                    break
                self._engine.say(text)
                self._engine.runAndWait()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[TTS] Error: {e}")


# Global singleton
_tts_engine: Optional[TTSEngine] = None


def get_tts() -> TTSEngine:
    """Get or create the global TTS engine."""
    global _tts_engine
    if _tts_engine is None:
        _tts_engine = TTSEngine()
        _tts_engine.start()
    return _tts_engine


def speak(text: str, sync: bool = False):
    """
    Speak text using TTS.

    Args:
        text: Text to speak
        sync: If True, block until speech completes
    """
    if sync:
        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()
    else:
        get_tts().speak(text)


def set_voice_rate(rate: int):
    """Adjust speaking rate (words per minute)."""
    get_tts().rate = rate


def available_voices() -> list:
    """Return list of available TTS voices."""
    engine = pyttsx3.init()
    voices = engine.getProperty("voices")
    return [{"id": v.id, "name": v.name} for v in voices]
