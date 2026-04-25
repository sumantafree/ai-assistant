"""
Shared Gemini API client — single point of initialization.
"""
import google.generativeai as genai
from core.config import settings

# Configure once at import time
genai.configure(api_key=settings.GEMINI_API_KEY)

# Default model — gemini-1.5-flash is fast + cheap; swap to gemini-1.5-pro for quality
MODEL_NAME = "gemini-1.5-flash"


def get_model(system_instruction: str = "") -> genai.GenerativeModel:
    """Return a configured GenerativeModel with optional system instruction."""
    return genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=system_instruction or "You are a helpful AI assistant.",
    )


def generate(prompt: str, system_instruction: str = "") -> str:
    """Single-turn generate — returns plain text response."""
    model = get_model(system_instruction)
    response = model.generate_content(prompt)
    return response.text.strip()
