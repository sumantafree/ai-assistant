"""
SALES AGENT
-----------
Capabilities:
  - Generate WhatsApp sales messages
  - Write cold emails
  - Write follow-up messages
  - Lead nurturing sequences
"""
import json
import re
from .gemini_client import generate

SYSTEM_PROMPT = """
You are an expert B2B sales copywriter and growth hacker.
Your job is to craft highly personalized, persuasive sales messages.

RULES:
- Always return a valid JSON object
- Be conversational, not spammy
- Keep WhatsApp messages under 200 words
- Keep emails professional with subject + body
- Include a clear CTA (Call To Action)
"""


def run(input_text: str, context: dict = None) -> dict:
    """
    Execute sales agent.

    Args:
        input_text: Natural language instruction
        context: Optional dict with lead info (name, company, etc.)

    Returns:
        Structured JSON dict
    """
    ctx = context or {}
    lead_info = ""
    if ctx:
        lead_info = f"\n\nLead context:\n{json.dumps(ctx, indent=2)}"

    prompt = f"""
{lead_info}

Task: {input_text}

Return a JSON object with this structure:
{{
  "type": "whatsapp_message" | "cold_email" | "follow_up" | "nurture_sequence",
  "subject": "Email subject (if email)",
  "message": "The main message content",
  "cta": "Call to action text",
  "followup_in_days": 3,
  "notes": "Any strategic notes"
}}

Only return valid JSON. No markdown, no explanation.
"""
    raw = generate(prompt, SYSTEM_PROMPT)

    # Extract JSON from response
    try:
        # Remove markdown code blocks if present
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {
            "type": "raw",
            "message": raw,
            "cta": "",
            "notes": "Raw response — JSON parsing failed",
        }


def generate_whatsapp_message(lead_name: str, product: str, context: str = "") -> str:
    """Quick helper for WhatsApp message generation."""
    result = run(
        f"Write a WhatsApp sales message for {lead_name} about {product}. {context}",
        {"name": lead_name},
    )
    return result.get("message", "")


def generate_cold_email(lead_name: str, company: str, product: str) -> dict:
    """Quick helper for cold email generation."""
    return run(
        f"Write a cold email to {lead_name} at {company} about {product}",
        {"name": lead_name, "company": company},
    )


def generate_followup(lead_name: str, last_contact_summary: str) -> str:
    """Quick helper for follow-up messages."""
    result = run(
        f"Write a follow-up message for {lead_name}. Last interaction: {last_contact_summary}",
        {"name": lead_name},
    )
    return result.get("message", "")
