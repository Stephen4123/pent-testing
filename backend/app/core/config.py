from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Pentest Platform"
    VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "sqlite:///./pentest.db"
    
    # Security / JWT
    SECRET_KEY: str = "supersecretjwtkey_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # LLM Settings
    LLM_PROVIDER: str = "gemini" # "openai", "gemini", "anthropic", "local"
    LLM_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    
    # Scanner Paths (Optional for local execution)
    ZAP_API_URL: str = "http://localhost:8081"
    ZAP_API_KEY: Optional[str] = None
    NUCLEI_PATH: str = "nuclei"
    
    # Safety Safeguard
    SAFE_MODE: bool = False # If True, restricts scanning to localhost/authorized domains

    class Config:
        env_file = ".env"

settings = Settings()
