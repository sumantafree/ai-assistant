"""
CRM Leads routes — full CRUD.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database.db import get_db
from database import models, schemas
from core.dependencies import get_current_user

router = APIRouter(prefix="/leads", tags=["CRM Leads"])


@router.post("/", response_model=schemas.LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(
    body: schemas.LeadCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new lead."""
    lead = models.Lead(**body.model_dump(), owner_id=current_user.id)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/", response_model=List[schemas.LeadOut])
def list_leads(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all leads with optional filtering."""
    query = db.query(models.Lead).filter(models.Lead.owner_id == current_user.id)

    if status:
        query = query.filter(models.Lead.status == status)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (models.Lead.name.ilike(search_term))
            | (models.Lead.email.ilike(search_term))
            | (models.Lead.company.ilike(search_term))
        )

    return query.order_by(models.Lead.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/stats")
def lead_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get lead count by status."""
    from sqlalchemy import func
    results = (
        db.query(models.Lead.status, func.count(models.Lead.id))
        .filter(models.Lead.owner_id == current_user.id)
        .group_by(models.Lead.status)
        .all()
    )
    total = db.query(models.Lead).filter(models.Lead.owner_id == current_user.id).count()
    return {
        "total": total,
        "by_status": {row[0]: row[1] for row in results},
    }


@router.get("/{lead_id}", response_model=schemas.LeadOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific lead by ID."""
    lead = _get_lead_or_404(lead_id, current_user.id, db)
    return lead


@router.put("/{lead_id}", response_model=schemas.LeadOut)
def update_lead(
    lead_id: int,
    body: schemas.LeadUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a lead."""
    lead = _get_lead_or_404(lead_id, current_user.id, db)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)
    lead.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a lead."""
    lead = _get_lead_or_404(lead_id, current_user.id, db)
    db.delete(lead)
    db.commit()


def _get_lead_or_404(lead_id: int, user_id: int, db: Session) -> models.Lead:
    lead = (
        db.query(models.Lead)
        .filter(models.Lead.id == lead_id, models.Lead.owner_id == user_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead
