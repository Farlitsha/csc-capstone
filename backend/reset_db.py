"""One-off local dev helper: forcibly drops and recreates every table, bypassing
foreign-key constraint ordering issues that can make Base.metadata.drop_all() silently
no-op on tables that other tables reference (e.g. `users`, referenced by studies/
services/applications). Run this from backend/ with: python reset_db.py
"""
from sqlalchemy import text
from app.database import engine, Base
import app.models  # noqa: F401 - import needed so all model classes register on Base.metadata

TABLES = [
    "survey_answers", "survey_responses", "survey_questions", "surveys",
    "reports", "audit_logs",
    "services", "applications", "studies", "users",
]

with engine.begin() as conn:
    conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for table in TABLES:
        conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
    conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
print("dropped:", TABLES)

Base.metadata.create_all(bind=engine)
print("recreated all tables")

with engine.connect() as conn:
    result = conn.execute(text("SHOW CREATE TABLE users"))
    print(result.fetchone()[1])
