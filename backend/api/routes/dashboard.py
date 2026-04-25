"""
Dashboard stats endpoint — aggregated metrics for the home page.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from database import models
from core.dependencies import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return aggregated dashboard statistics."""
    uid = current_user.id
    today = datetime.utcnow()
    week_ago = today - timedelta(days=7)

    total_leads = db.query(models.Lead).filter(models.Lead.owner_id == uid).count()
    new_leads_week = (
        db.query(models.Lead)
        .filter(models.Lead.owner_id == uid, models.Lead.created_at >= week_ago)
        .count()
    )

    total_tasks = db.query(models.Task).filter(models.Task.owner_id == uid).count()
    done_tasks = (
        db.query(models.Task)
        .filter(models.Task.owner_id == uid, models.Task.status == "done")
        .count()
    )

    messages_sent = (
        db.query(models.WhatsAppLog)
        .filter(models.WhatsAppLog.status == "sent")
        .count()
    )

    emails_sent = (
        db.query(models.EmailLog)
        .filter(models.EmailLog.status == "sent")
        .count()
    )

    total_commands = (
        db.query(models.CommandLog)
        .filter(models.CommandLog.user_id == uid)
        .count()
    )

    # Recent activity (last 10 command logs)
    recent_commands = (
        db.query(models.CommandLog)
        .filter(models.CommandLog.user_id == uid)
        .order_by(models.CommandLog.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "leads": {
            "total": total_leads,
            "new_this_week": new_leads_week,
        },
        "tasks": {
            "total": total_tasks,
            "completed": done_tasks,
            "completion_rate": round(done_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0,
        },
        "automation": {
            "whatsapp_sent": messages_sent,
            "emails_sent": emails_sent,
        },
        "voice": {
            "total_commands": total_commands,
        },
        "recent_activity": [
            {
                "command": c.command_text,
                "action": c.action_taken,
                "success": c.success,
                "time": c.created_at.isoformat(),
            }
            for c in recent_commands
        ],
    }
