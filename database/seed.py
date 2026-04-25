"""
Seed the database with a demo admin user and sample leads/tasks.
Run: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database.db import engine, SessionLocal
from database import models
from core.security import hash_password
from datetime import datetime, timedelta


def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ── Admin user ──────────────────────────────────────────────────
    existing = db.query(models.User).filter_by(username="admin").first()
    if not existing:
        admin = models.User(
            email="admin@aiassistant.local",
            username="admin",
            hashed_password=hash_password("admin123"),
            full_name="Admin User",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"[seed] Admin user created  (id={admin.id})")
    else:
        admin = existing
        print("[seed] Admin user already exists")

    # ── Demo leads ──────────────────────────────────────────────────
    demo_leads = [
        {"name": "Rahul Sharma",   "phone": "+919876543210", "email": "rahul@example.com",   "company": "TechCorp",    "status": "new"},
        {"name": "Priya Patel",    "phone": "+919123456780", "email": "priya@example.com",   "company": "StartupXYZ",  "status": "contacted"},
        {"name": "Amit Singh",     "phone": "+918765432109", "email": "amit@example.com",    "company": "MediaPro",    "status": "qualified"},
        {"name": "Sneha Gupta",    "phone": "+917654321098", "email": "sneha@example.com",   "company": "EduTech",     "status": "proposal"},
        {"name": "Vikram Mehta",   "phone": "+916543210987", "email": "vikram@example.com",  "company": "RetailHub",   "status": "won"},
    ]
    for ld in demo_leads:
        exists = db.query(models.Lead).filter_by(email=ld["email"]).first()
        if not exists:
            db.add(models.Lead(**ld, owner_id=admin.id, last_contact=datetime.utcnow()))
    db.commit()
    print(f"[seed] {len(demo_leads)} demo leads added")

    # ── Demo tasks ──────────────────────────────────────────────────
    demo_tasks = [
        {"title": "Follow up with Rahul",     "priority": "high",   "status": "todo",        "due_date": datetime.utcnow() + timedelta(days=1)},
        {"title": "Send proposal to Sneha",   "priority": "high",   "status": "in_progress", "due_date": datetime.utcnow() + timedelta(days=2)},
        {"title": "Review campaign metrics",  "priority": "medium", "status": "todo",        "due_date": datetime.utcnow() + timedelta(days=3)},
        {"title": "Prepare demo deck",        "priority": "medium", "status": "done",        "due_date": datetime.utcnow() - timedelta(days=1)},
        {"title": "Cold email batch - Week 2","priority": "low",    "status": "todo",        "due_date": datetime.utcnow() + timedelta(days=7)},
    ]
    for tk in demo_tasks:
        exists = db.query(models.Task).filter_by(title=tk["title"], owner_id=admin.id).first()
        if not exists:
            db.add(models.Task(**tk, owner_id=admin.id))
    db.commit()
    print(f"[seed] {len(demo_tasks)} demo tasks added")

    db.close()
    print("[seed] Done!")


if __name__ == "__main__":
    seed()
