import sqlite3

def migrate():
    print("Connecting to pentest_local.db...")
    conn = sqlite3.connect("pentest_local.db")
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE scan_sessions ADD COLUMN profile VARCHAR(50) DEFAULT 'full'")
        print("Successfully added 'profile' column to 'scan_sessions' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'profile' already exists.")
        else:
            print(f"Error: {e}")
            
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
