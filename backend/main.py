"""
AI Desktop Assistant — FastAPI Backend
Supports local dev (SQLite) and production (Supabase PostgreSQL on Render.com)
Run locally: uvicorn main:app --reload --port 8000
"""
import sys, os

# Allow importing from sibling directories (ai-agents, database, voice, automation)
ROOT = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(ROOT)
for p in [ROOT, PARENT,
          os.path.join(PARENT, "ai-agents"),
          os.path.join(PARENT, "automation"),
          os.path.join(PARENT, "database"),
          os.path.join(PARENT, "voice")]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Load .env (local dev only — Render.com uses dashboard env vars)
from dotenv import load_dotenv
load_dotenv(os.path.join(ROOT, ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from database.db import engine
from database import models

# Create all DB tables on startup
models.Base.metadata.create_all(bind=engine)

# Auto-seed admin user on first deploy
def seed_admin():
    try:
        from database.db import SessionLocal
        from database.models import User
        import bcrypt
        db = SessionLocal()
        existing = db.query(User).filter(User.username == "admin").first()
        if not existing:
            hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
            user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=hashed,
                full_name="Admin User",
                is_active=True,
            )
            db.add(user)
            db.commit()
            print("✅ Admin user seeded: admin / admin123")
        else:
            print("ℹ️  Admin user already exists")
        db.close()
    except Exception as e:
        print(f"⚠️  Seed skipped: {e}")

seed_admin()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI Desktop Assistant SaaS",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.routes import auth, leads, tasks, whatsapp, email, agent, voice, dashboard

app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(tasks.router)
app.include_router(whatsapp.router)
app.include_router(email.router)
app.include_router(agent.router)
app.include_router(voice.router)
app.include_router(dashboard.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=settings.DEBUG)
