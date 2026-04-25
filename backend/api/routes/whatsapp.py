"""
WhatsApp automation routes.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database.db import get_db
from database import models, schemas
from core.dependencies import get_current_user

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.post("/send")
def send_whatsapp(
    body: schemas.WhatsAppSend,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Send a WhatsApp message. Runs in background."""
    # Log to DB immediately
    log = models.WhatsAppLog(
        lead_id=body.lead_id,
        phone=body.phone,
        message=body.message,
        status="pending",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Send in background
    background_tasks.add_task(_send_in_background, log.id, body.phone, body.message)
    return {"message": "WhatsApp send queued", "log_id": log.id}


@router.post("/send-bulk")
def send_bulk_whatsapp(
    body: schemas.BulkWhatsAppSend,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Send bulk WhatsApp messages."""
    log_ids = []
    for contact in body.contacts:
        msg = body.message_template.replace("{name}", contact.get("name", ""))
        log = models.WhatsAppLog(
            phone=contact.get("phone", ""),
            message=msg,
            status="pending",
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        log_ids.append(log.id)

    background_tasks.add_task(_send_bulk_in_background, body.contacts, body.message_template)
    return {"message": f"Bulk send queued for {len(body.contacts)} contacts", "log_ids": log_ids}


@router.post("/generate-message")
def generate_message(
    body: dict,
    current_user: models.User = Depends(get_current_user),
):
    """AI-generate a WhatsApp message for a lead."""
    from ai_agents import sales_agent
    lead_name = body.get("lead_name", "")
    product = body.get("product", "")
    context = body.get("context", "")
    message = sales_agent.generate_whatsapp_message(lead_name, product, context)
    return {"message": message}


@router.get("/logs", response_model=List[schemas.WhatsAppLogOut])
def get_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get WhatsApp send history."""
    return (
        db.query(models.WhatsAppLog)
        .order_by(models.WhatsAppLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def _send_in_background(log_id: int, phone: str, message: str):
    """Background task: send WhatsApp and update log status."""
    from automation.whatsapp_sender import send_message
    from database.db import SessionLocal

    result = send_message(phone, message)

    db = SessionLocal()
    try:
        log = db.query(models.WhatsAppLog).filter(models.WhatsAppLog.id == log_id).first()
        if log:
            log.status = "sent" if result.get("success") else "failed"
            log.sent_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def _send_bulk_in_background(contacts: list, template: str):
    """Background task: bulk send WhatsApp messages."""
    from automation.whatsapp_sender import send_bulk_messages
    send_bulk_messages(contacts, template)
