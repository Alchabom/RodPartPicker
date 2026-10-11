from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV, extra="ignore")
    DB_HOST: str = "localhost"
    DB_PASSWORD: str
    API_PORT: int = 3001
    DB_USER: str 
    DB_NAME: str 
    DB_PORT: int = 3306

settings = Settings()
    
