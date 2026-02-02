"""Configuration management for AgriWatch backend."""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "AgriWatch API"
    environment: str = "development"
    debug: bool = True
    
    # Google Earth Engine
    gee_project_id: str = ""
    google_application_credentials: str = ""
    
    # Google Cloud Storage
    gcs_bucket_name: str = ""
    
    # Microsoft Planetary Computer
    mpc_subscription_key: Optional[str] = None
    
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Rate limiting
    rate_limit_per_minute: int = 60
    
    # Analysis settings
    default_scale: int = 10  # Sentinel-2 native resolution
    max_cloud_cover: int = 20  # Maximum cloud cover percentage
    gee_export_timeout: int = 600  # seconds
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
