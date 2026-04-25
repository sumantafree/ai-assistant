"""
Email automation routes.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database.db import get_db
from database import models, schemas
from core.dependencies import get_current_user

router = APIRouter(prefix="/email", tags=["Email"])


@router.post("/send")
def send_email(
    body: schemas.EmailSend,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Send an email via Gmail SMTP."""
    log = models.EmailLog(
        to_email=body.to_email,
        subject=body.subject,
        body=body.body,
        status="pending",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    background_tasks.add_task(
        _send_email_background, log.id, body.to_email, body.subject, body.body
    )
    return {"message": "Email queued", "log_id": log.id}


@router.post("/generate")
def generate_email(
    body: dict,
    current_user: models.User = Depends(get_current_user),
):
    """AI-generate a cold email."""
    from ai_agents import sales_agent
    result = sales_agent.generate_cold_email(
        lead_name=body.get("lead_name", ""),
        company=body.get("company", ""),
        product=body.get("product", ""),
    )
    return result


@router.get("/logs")
def email_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.EmailLog)
        .order_by(models.EmailLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def _send_email_background(log_id: int, to_email: str, subject: str, body: str):
    from automation.email_sender import send_email
    from database.db import SessionLocal

    result = send_email(to_email, subject, body)
    db = SessionLocal()
    try:
        log = db.query(models.EmailLog).filter(models.EmailLog.id == log_id).first()
        if log:
            log.status = "sent" if result.get("success") else "failed"
            log.sent_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()
