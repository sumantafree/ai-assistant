"""
CONTENT AGENT
-------------
Capabilities:
  - YouTube video scripts
  - Social media posts (LinkedIn, Twitter/X, Instagram)
  - Ad copy (Google Ads, Meta Ads)
  - Blog post outlines
"""
import json
import re
from .gemini_client import generate

SYSTEM_PROMPT = """
You are a world-class content strategist and copywriter.
You create viral, engaging content for digital platforms.

RULES:
- Always return a valid JSON object
- Match tone to platform (professional for LinkedIn, casual for Instagram)
- Include hashtags for social posts
- YouTube scripts must have Hook, Body, CTA sections
- Ad copy must be concise with strong headline + description
"""


def run(input_text: str, context: dict = None) -> dict:
    """
    Execute content agent.

    Args:
        input_text: Content request description
        context: Optional dict with brand/audience info

    Returns:
        Structured JSON dict
    """
    ctx = context or {}
    brand_info = ""
    if ctx:
        brand_info = f"\n\nBrand/Context:\n{json.dumps(ctx, indent=2)}"

    prompt = f"""
{brand_info}

Content Request: {input_text}

Return a JSON object:
{{
  "type": "youtube_script" | "linkedin_post" | "twitter_post" | "instagram_post" | "ad_copy" | "blog_outline",
  "title": "Content title or headline",
  "content": "Main content body",
  "hook": "Opening hook (for videos/posts)",
  "cta": "Call to action",
  "hashtags": ["tag1", "tag2"],
  "word_count": 150,
  "platform_notes": "Platform-specific tips"
}}

Only return valid JSON. No markdown, no explanation.
"""
    raw = generate(prompt, SYSTEM_PROMPT)

    try:
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {
            "type": "raw",
            "title": "Generated Content",
            "content": raw,
            "hashtags": [],
            "platform_notes": "Raw response — JSON parsing failed",
        }


def create_youtube_script(topic: str, duration_minutes: int = 10, audience: str = "") -> dict:
    """Generate a full YouTube video script."""
    return run(
        f"Create a YouTube script for a {duration_minutes}-minute video about: {topic}. Audience: {audience}",
        {"topic": topic, "duration": duration_minutes, "audience": audience},
    )


def create_social_post(platform: str, topic: str, brand_name: str = "") -> dict:
    """Generate a social media post."""
    return run(
        f"Write a {platform} post about: {topic}",
        {"platform": platform, "brand": brand_name},
    )


def create_ad_copy(product: str, target_audience: str, platform: str = "Google Ads") -> dict:
    """Generate ad copy."""
    return run(
        f"Write {platform} ad copy for {product} targeting {target_audience}",
        {"product": product, "audience": target_audience, "platform": platform},
    )
