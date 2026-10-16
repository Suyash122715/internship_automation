import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Internship Automation Agent"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # SQLite Database URL
    DATABASE_URL: str = "sqlite:///./internship_agent.db"
    
    # Email / SMTP Configuration (Batch 8 - PRD Section 15)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "Internship Applicant"
    EMAIL_SIMULATE: bool = True  # Safe default: simulated dispatch unless configured
    EMAIL_RATE_LIMIT_PER_MINUTE: int = 5
    EMAIL_RATE_LIMIT_PER_DAY: int = 30
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
