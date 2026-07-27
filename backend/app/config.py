from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    WHATSAPP_PHONE_NUMBER_ID: str
    WHATSAPP_ACCESS_TOKEN: str  

    class Config:
        env_file = ".env"

settings = Settings()