"""
VOICE MANAGER
-------------
Orchestrates the full voice pipeline:
  1. Listen (STT) → 2. Process (AI) → 3. Execute (Action) → 4. Respond (TTS)

Designed as a singleton service that runs in the background.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import threading
from .speech_to_text import ContinuousListener, listen_and_transcribe
from .text_to_speech import speak
from ai_agents.agent_executor import process_command


class VoiceManager:
    """
    Manages the complete voice assistant pipeline.
    """

    def __init__(
        self,
        wake_word: str = "assistant",
        language: str = "en",
        on_command: callable = None,
        on_response: callable = None,
    ):
        self.wake_word = wake_word
        self.language = language
        self.on_command = on_command   # Callback: fn(command_text)
        self.on_response = on_response  # Callback: fn(response_text)
        self._listener = None
        self._is_running = False

    def start(self):
        """Start the voice assistant."""
        speak(f"AI Assistant is ready. Say '{self.wake_word}' followed by your command.")
        self._listener = ContinuousListener(
            callback=self._handle_command,
            wake_word=self.wake_word,
            language=self.language,
        )
        self._listener.start()
        self._is_running = True

    def stop(self):
        """Stop the voice assistant."""
        if self._listener:
            self._listener.stop()
        self._is_running = False
        speak("AI Assistant stopped.")

    def process_text_command(self, text: str) -> dict:
        """
        Process a text command directly (bypasses STT).
        Used for dashboard text input.
        """
        return self._handle_command(text, speak_response=True)

    def _handle_command(self, command: str, speak_response: bool = True) -> dict:
        """
        Full pipeline handler for a voice/text command.
        """
        print(f"[Voice] Command received: {command}")

        # Notify callback
        if self.on_command:
            self.on_command(command)

        # Acknowledge
        speak("Processing your command...")

        # Process through AI
        result = process_command(command)

        # Build response text
        response_text = result.get("action_result") or result.get("ai_response", "Done.")
        if len(response_text) > 300:
            response_text = response_text[:300] + "..."

        # Speak response
        if speak_response:
            speak(response_text)

        # Notify callback
        if self.on_response:
            self.on_response(response_text)

        print(f"[Voice] Response: {response_text}")
        return result

    @property
    def is_running(self) -> bool:
        return self._is_running


# Global instance
_voice_manager: VoiceManager = None


def get_voice_manager(**kwargs) -> VoiceManager:
    global _voice_manager
    if _voice_manager is None:
        _voice_manager = VoiceManager(**kwargs)
    return _voice_manager
