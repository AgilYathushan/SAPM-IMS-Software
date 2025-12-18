# Application Configuration Settings
# Manages all environment variables and application settings using Pydantic

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    
    # Database Configuration
    DATABASE_URL: str
    
    # JWT Authentication Configuration
    SECRET_KEY: str = "your-secret-key-change-in-production-use-env-var"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Admin Authentication Configuration
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = "admin#123"
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    # API Gateway URL for inter-service communication
    API_GATEWAY_URL: str = "http://api-gateway:8000"
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()

