from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "mysql+pymysql://btt:btt@127.0.0.1:3307/btt"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8
    # Dev-only admin login (override in .env)
    admin_email: str = "admin@btt.local"
    admin_password: str = "Admin@123"
    frontend_base_url: str = "http://localhost:5173"


settings = Settings()
