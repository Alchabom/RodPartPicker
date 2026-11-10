from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV, extra="ignore")
    DB_HOST: str = "localhost"
    DB_PASSWORD: str
    API_PORT: int = 3001
    DB_USER: str
    DB_NAME: str
    DB_PORT: int = 3306
    TEST_DB_NAME: str = "rodpartpicker_test"

    # Auth (see docs/superpowers/specs/2026-11-09-auth-design.md, "Settings").
    # The two secrets have no default and a minimum length, so the API refuses
    # to start when they're missing or left empty from .env.example.
    JWT_SECRET: str = Field(min_length=32)
    CODE_HMAC_SECRET: str = Field(min_length=32)
    APP_ORIGIN: str = "http://localhost:5173"
    COOKIE_SECURE: bool = True
    TRUST_PROXY_HEADERS: bool = False
    EMAIL_BACKEND: Literal["console", "resend"] = "console"
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "RodPartPicker <onboarding@resend.dev>"


settings = Settings()
