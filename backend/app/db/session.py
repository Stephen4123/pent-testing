from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def sync_db_schema():
    from app.db.models import Base
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        import sqlite3
        db_path = settings.DATABASE_URL.replace("sqlite:///", "")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            def get_cols(table_name):
                try:
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    return [row[1] for row in cursor.fetchall()]
                except Exception:
                    return []

            scan_cols = get_cols("scan_sessions")
            if scan_cols:
                if "user_id" not in scan_cols:
                    cursor.execute("ALTER TABLE scan_sessions ADD COLUMN user_id VARCHAR(36)")
                if "profile" not in scan_cols:
                    cursor.execute("ALTER TABLE scan_sessions ADD COLUMN profile VARCHAR(50) DEFAULT 'full'")
                if "report_json" not in scan_cols:
                    cursor.execute("ALTER TABLE scan_sessions ADD COLUMN report_json TEXT")
                if "report_pdf" not in scan_cols:
                    cursor.execute("ALTER TABLE scan_sessions ADD COLUMN report_pdf BLOB")

            user_cols = get_cols("users")
            if user_cols:
                if "is_admin" not in user_cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
                if "is_active" not in user_cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")

            finding_cols = get_cols("scan_findings")
            if finding_cols:
                if "evidence" not in finding_cols:
                    cursor.execute("ALTER TABLE scan_findings ADD COLUMN evidence TEXT")
                if "source_scanner" not in finding_cols:
                    cursor.execute("ALTER TABLE scan_findings ADD COLUMN source_scanner VARCHAR(100)")
                if "status" not in finding_cols:
                    cursor.execute("ALTER TABLE scan_findings ADD COLUMN status VARCHAR(50) DEFAULT 'UNVERIFIED'")
                    
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Notice during schema sync: {e}")

