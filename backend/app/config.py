from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_db_url: str

    # Gemini
    gemini_api_key: str

    # Groq (LLM text/JSON generation)
    groq_api_key: str = ""

    # App
    app_env: str = "development"
    app_debug: bool = True
    cors_origins: str = "http://localhost:5173"

    # SMTP Settings
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_sender: str = "noreply@talentscout.ai"

    # External Job Boards API Keys (Optional)
    linkedin_api_key: str = ""
    naukri_api_key: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
