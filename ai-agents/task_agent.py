"""
TASK AGENT
----------
Capabilities:
  - Create structured tasks from natural language
  - Set reminders and deadlines
  - Suggest scheduling
  - Prioritize task list
"""
import json
import re
from datetime import datetime
from .gemini_client import generate

SYSTEM_PROMPT = """
You are a highly efficient personal productivity assistant and project manager.
You help people organize their work, set priorities, and manage time.

RULES:
- Always return a valid JSON object
- Parse dates intelligently (today, tomorrow, next Monday, etc.)
- Use ISO 8601 format for dates: YYYY-MM-DDTHH:MM:SS
- Priority levels: low | medium | high
- Status: todo | in_progress | done
"""


def run(input_text: str, context: dict = None) -> dict:
    """
    Execute task agent.

    Args:
        input_text: Natural language task instruction
        context: Optional dict with current date/time, existing tasks

    Returns:
        Structured JSON dict
    """
    ctx = context or {}
    ctx["current_datetime"] = datetime.now().isoformat()

    prompt = f"""
Context: {json.dumps(ctx, indent=2)}

Request: {input_text}

Return a JSON object:
{{
  "action": "create_task" | "schedule" | "prioritize" | "reminder" | "list_tasks",
  "task": {{
    "title": "Task title",
    "description": "Detailed description",
    "priority": "high" | "medium" | "low",
    "status": "todo",
    "due_date": "2025-01-20T10:00:00",
    "reminder_at": "2025-01-20T09:00:00",
    "tags": ["work", "urgent"]
  }},
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "notes": "Any additional context"
}}

Only return valid JSON. No markdown, no explanation.
"""
    raw = generate(prompt, SYSTEM_PROMPT)

    try:
        clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {
            "action": "create_task",
            "task": {
                "title": input_text[:100],
                "priority": "medium",
                "status": "todo",
            },
            "notes": "Raw response — JSON parsing failed",
        }


def parse_task_from_voice(voice_text: str) -> dict:
    """Convert a voice command into a structured task."""
    return run(
        f"Create a task from this voice command: '{voice_text}'",
        {"source": "voice_command"},
    )


def suggest_schedule(tasks: list) -> dict:
    """AI-powered schedule optimization."""
    return run(
        "Organize and prioritize these tasks with an optimal schedule",
        {"tasks": tasks},
    )


def create_reminder(task_title: str, remind_when: str) -> dict:
    """Create a task with a specific reminder."""
    return run(
        f"Create a task '{task_title}' with a reminder {remind_when}",
    )
