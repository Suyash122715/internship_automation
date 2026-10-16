import os
import sys
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.db.session import engine
from backend.app.db.base import Base

logger = logging.getLogger(__name__)


def init_db(reset: bool = False) -> bool:
    """Initialize SQLite database tables and ensure all model columns exist."""
    try:
        if reset:
            logger.info("Dropping all existing database tables for schema refresh...")
            Base.metadata.drop_all(bind=engine)
            
        logger.info("Creating all database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Safe migration for existing SQLite database: add missing columns if table already existed
        with engine.connect() as conn:
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            
            if "jobs" in inspector.get_table_names():
                existing_columns = {col["name"] for col in inspector.get_columns("jobs")}
                expected_columns = {
                    "workplace_type": "VARCHAR(50)",
                    "employment_type": "VARCHAR(50)",
                    "skills": "JSON",
                    "salary_or_stipend": "VARCHAR(255)",
                    "source_id": "VARCHAR(255)",
                    "raw_source_data": "JSON",
                    "dedup_hash": "VARCHAR(64)",
                }
                for col_name, col_type in expected_columns.items():
                    if col_name not in existing_columns:
                        logger.info(f"Migrating jobs table: adding missing column {col_name}")
                        try:
                            conn.execute(text(f"ALTER TABLE jobs ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                        except Exception as ce:
                            logger.warning(f"Could not add column {col_name}: {ce}")

            # Batch 7 — safe migration for contacts table new columns
            if "contacts" in inspector.get_table_names():
                existing_cols = {col["name"] for col in inspector.get_columns("contacts")}
                contacts_new_columns = {
                    "verification_status": "VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN'",
                    "confidence_level": "VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN'",
                    "profile_url": "VARCHAR(1000)",
                    "source_url": "VARCHAR(1000)",
                    "outreach_status": "VARCHAR(50) DEFAULT 'CONTACT FOUND'",
                    "discovery_notes": "TEXT",
                    "job_id": "INTEGER REFERENCES jobs(id)",
                }
                for col_name, col_def in contacts_new_columns.items():
                    if col_name not in existing_cols:
                        logger.info(f"Migrating contacts table: adding missing column {col_name}")
                        try:
                            conn.execute(text(f"ALTER TABLE contacts ADD COLUMN {col_name} {col_def}"))
                            conn.commit()
                        except Exception as ce:
                            logger.warning(f"Could not add column {col_name} to contacts: {ce}")

            # Batch 8 — safe migration for outreach_emails table new columns
            if "outreach_emails" in inspector.get_table_names():
                existing_email_cols = {col["name"] for col in inspector.get_columns("outreach_emails")}
                outreach_new_columns = {
                    "recipient_email": "VARCHAR(255)",
                    "template_id": "VARCHAR(100)",
                    "user_edited": "INTEGER DEFAULT 0",
                    "provider": "VARCHAR(50) DEFAULT 'simulated'",
                    "retry_count": "INTEGER DEFAULT 0",
                    "approved_at": "DATETIME",
                    "queued_at": "DATETIME",
                }
                for col_name, col_def in outreach_new_columns.items():
                    if col_name not in existing_email_cols:
                        logger.info(f"Migrating outreach_emails table: adding missing column {col_name}")
                        try:
                            conn.execute(text(f"ALTER TABLE outreach_emails ADD COLUMN {col_name} {col_def}"))
                            conn.commit()
                        except Exception as ce:
                            logger.warning(f"Could not add column {col_name} to outreach_emails: {ce}")

        logger.info("Database initialized successfully.")
        return True
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise e


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db(reset=True)
