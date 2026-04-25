"""
AGENT ROUTER
------------
Routes incoming requests to the correct agent based on intent classification.
Also handles command parsing for the voice/desktop action system.
"""
import json
import re
from .gemini_client import generate

ROUTER_SYSTEM_PROMPT = """
You are an AI command router for a desktop assistant.
Your job is to classify user intent and route to the correct handler.

Available agents:
- sales: Sales messages, cold emails, follow-ups, WhatsApp messages
- content: YouTube scripts, social posts, ad copy, blog content
- task: Task creation, reminders, scheduling, to-do lists

Available desktop actions:
- open_app: Open a desktop application (chrome, notepad, vscode, calculator, etc.)
- open_website: Open a URL in the browser
- type_text: Type text using keyboard automation
- send_email: Send an email via Gmail SMTP
- send_whatsapp: Send a WhatsApp message
- take_screenshot: Take a screenshot
- search_google: Search Google for something
- system_info: Get system information
- none: Just answer as a conversational assistant

RULES:
- Return only valid JSON
- Be precise about the action type
- Extract all relevant parameters
"""


def classify_command(user_input: str) -> dict:
    """
    Classify a user command and return routing information.

    Returns:
        {
          "route": "agent" | "action" | "conversation",
          "agent_type": "sales" | "content" | "task" | null,
          "action": "open_app" | "send_email" | ... | null,
          "parameters": {...},
          "confidence": 0.95
        }
    """
    prompt = f"""
Classify this command: "{user_input}"

Return a JSON object:
{{
  "route": "agent" | "action" | "conversation",
  "agent_type": "sales" | "content" | "task" | null,
  "action": "open_app" | "open_website" | "type_text" | "send_email" | "send_whatsapp" | "take_screenshot" | "search_google" | "system_info" | "none",
  "parameters": {{
    "app_name": "chrome",
    "url": "https://example.com",
    "text": "text to type",
    "phone": "+919876543210",
    "message": "message content",
    "to_email": "email@example.com",
    "subject": "email subject",
    "query": "search query"
  }},
  "original_command": "{user_input}",
  "confidence": 0.9
}}

Only include relevant parameters. Return valid JSON only.
"""
    raw = generate(prompt, ROUTER_SYSTEM_PROMPT)

    try:
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {
            "route": "conversation",
            "agent_type": None,
            "action": "none",
            "parameters": {},
            "original_command": user_input,
            "confidence": 0.5,
        }


def get_conversational_reply(user_input: str) -> str:
    """Fallback: get a helpful conversational response."""
    return generate(
        f"User says: {user_input}\n\nRespond helpfully and concisely.",
        "You are a helpful AI desktop assistant. Be concise and actionable.",
    )
