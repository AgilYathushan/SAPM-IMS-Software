from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_NAME: str = "images"
    MINIO_SECURE: bool = False
    SECRET_KEY: str = "your-secret-key-change-in-production-use-env-var"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"
    API_GATEWAY_URL: str = "http://api-gateway:8000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

