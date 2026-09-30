from app.db.session import SessionLocal, engine
from app.db.models import Base, User
from sqlalchemy import text
import bcrypt
import uuid

def setup_admin():
    # Automatically create all schema tables if they do not exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print("Admin user already exists. Updating credentials and role...")
            admin.is_admin = True
            admin.is_active = True
            admin.hashed_password = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode('utf-8')
        else:
            print("Creating new admin user...")
            hashed = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode('utf-8')
            admin = User(
                id=uuid.uuid4(),
                username='admin',
                email='admin@autosec.local',
                hashed_password=hashed,
                is_admin=True,
                is_active=True
            )
            db.add(admin)
        
        db.commit()
        print("Admin user setup successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    setup_admin()

