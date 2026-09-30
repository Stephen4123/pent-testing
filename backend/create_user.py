from app.db.session import SessionLocal
from app.db.models import User
import bcrypt
import uuid

db = SessionLocal()
hashed = bcrypt.hashpw(b'Password123!', bcrypt.gensalt()).decode('utf-8')
new_user = User(
    id=uuid.uuid4(),
    username='testuser8',
    email='testuser8@example.com',
    hashed_password=hashed
)
db.add(new_user)
db.commit()
print("User created successfully!")
db.close()

