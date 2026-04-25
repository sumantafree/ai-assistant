"""
AI Agent execution routes.
"""
from fastapi import APIRouter, Depends
from database import schemas
from core.dependencies import get_current_user
from database import models

router = APIRouter(prefix="/agent", tags=["AI Agents"])


@router.post("/run", response_model=schemas.AgentResponse)
def run_agent(
    body: schemas.AgentRequest,
    current_user: models.User = Depends(get_current_user),
):
    """
    Run a specific AI agent.

    agent_type: sales | content | task
    """
    from ai_agents.agent_executor import execute_agent

    result = execute_agent(
        agent_type=body.agent_type,
        input_text=body.input_text,
        context=body.context,
    )

    return schemas.AgentResponse(
        agent_type=body.agent_type,
        input_text=body.input_text,
        output=str(result),
        structured_data=result if isinstance(result, dict) else None,
        action_taken=f"Agent '{body.agent_type}' executed",
    )


@router.post("/classify")
def classify_command(
    body: dict,
    current_user: models.User = Depends(get_current_user),
):
    """Classify a command without executing it."""
    from ai_agents.agent_router import classify_command
    return classify_command(body.get("command", ""))


@router.get("/agents")
def list_agents(current_user: models.User = Depends(get_current_user)):
    """List available agents and their capabilities."""
    return {
        "agents": [
            {
                "id": "sales",
                "name": "Sales Agent",
                "description": "Generate sales messages, cold emails, follow-ups",
                "capabilities": ["whatsapp_message", "cold_email", "follow_up", "nurture_sequence"],
            },
            {
                "id": "content",
                "name": "Content Agent",
                "description": "Create content for YouTube, social media, ads",
                "capabilities": ["youtube_script", "linkedin_post", "twitter_post", "ad_copy"],
            },
            {
                "id": "task",
                "name": "Task Agent",
                "description": "Manage tasks, reminders, scheduling",
                "capabilities": ["create_task", "schedule", "reminder", "prioritize"],
            },
        ]
    }
