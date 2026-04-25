"""
Database engine + session factory.
Supports both SQLite (local dev) and PostgreSQL (Supabase production).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

# DATABASE_URL from .env:
#   Local:      sqlite:///./ai_assistant.db
#   Supabase:   postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite:///./ai_assistant.db"
)

# Supabase/Render sometimes gives "postgres://" — SQLAlchemy needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Connection args differ between SQLite and PostgreSQL
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True,        # auto-reconnect on dropped connections
    pool_size=5 if not DATABASE_URL.startswith("sqlite") else 1,
    max_overflow=10 if not DATABASE_URL.startswith("sqlite") else 0,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
