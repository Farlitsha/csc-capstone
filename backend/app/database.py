from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# ORM configuration
DATABASE_URL = f"mysql+pymysql://{settings.database_username}:{settings.database_password}@{settings.database_hostname}/{settings.database_name}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def sync_db_schema(target_engine=None):
    """Ensure all tables and migrated columns exist in the database."""
    try:
        from app import models  # noqa: F401 - ensure models are registered on Base
        eng = target_engine or engine
        Base.metadata.create_all(bind=eng)
        insp = inspect(eng)
        table_names = insp.get_table_names()
        with eng.connect() as conn:
            if "users" in table_names:
                user_cols = [c["name"] for c in insp.get_columns("users")]
                if "is_active" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))
                    conn.commit()
            if "services" in table_names:
                service_cols = [c["name"] for c in insp.get_columns("services")]
                if "image_size" not in service_cols:
                    conn.execute(text("ALTER TABLE services ADD COLUMN image_size INT NULL"))
                    conn.commit()
    except Exception:
        pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()