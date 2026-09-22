from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    app_name: str = "Website Security Scanner"
    debug: bool = False
    
    # Scanner Timeouts
    port_scan_timeout: int = 1
    ssl_scan_timeout: int = 3
    http_timeout: int = 10
    
    # Rate Limiting
    rate_limit_scan: str = "5/minute"
    
    # Caching
    cache_ttl: int = 3600  # 1 hour
    
    # Penalty Weights
    penalty_ssl_invalid: int = 30
    penalty_missing_header: int = 5
    penalty_port_21: int = 10
    penalty_port_22: int = 2   # Informational penalty now
    penalty_port_25: int = 10
    penalty_port_3306: int = 10
    penalty_missing_seo_title: int = 5
    penalty_missing_seo_desc: int = 5
    penalty_missing_spf: int = 5
    penalty_missing_dmarc: int = 5

    # New optional penalty weights (additive; existing weights above unchanged)
    penalty_insecure_cookie: int = 2
    penalty_exposed_path: int = 8
    penalty_cors_misconfig: int = 10

    # Auth / Database
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "website_security_scanner"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    free_tier_scans: int = 100

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
