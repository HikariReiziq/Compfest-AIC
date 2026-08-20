"""Konfigurasi aplikasi.

Semua nilai dibaca dari environment (12-factor). Tidak ada satu pun kredensial
yang di-hardcode; `.env` hanya dipakai untuk pengembangan lokal.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "test", "staging", "production"]

_INSECURE_SECRETS = {
    "",
    "change-me",
    "change-me-please-openssl-rand-hex-32",
    "secret",
    "changethis",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---------- App ----------
    app_name: str = "COBA API"
    env: Environment = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # ---------- Security ----------
    jwt_secret: SecretStr = SecretStr("change-me-please-openssl-rand-hex-32")
    jwt_algorithm: str = "HS256"
    access_token_ttl_seconds: int = 900
    refresh_token_ttl_seconds: int = 1_209_600
    cors_origins: list[str] = Field(default_factory=list)
    max_request_body_bytes: int = 2 * 1024 * 1024

    # ---------- Postgres ----------
    database_url: str = "postgresql+asyncpg://coba:coba@localhost:5432/coba"
    database_replica_url: str | None = None
    db_pool_size: int = 10
    db_max_overflow: int = 10
    db_pool_recycle_seconds: int = 1800
    db_statement_timeout_ms: int = 5000
    db_echo: bool = False
    # Set true bila di belakang PgBouncer transaction pooling (prepared statement
    # tidak bertahan lintas transaksi di mode itu).
    db_disable_prepared_statements: bool = False

    # ---------- Redis ----------
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_catalog_seconds: int = 3600
    cache_ttl_recommendation_seconds: int = 300
    cache_ttl_negative_seconds: int = 30
    cache_lock_timeout_seconds: int = 5

    # ---------- Sesi try-on ----------
    session_ttl_seconds: int = 1800
    session_max_feedback: int = 200

    # ---------- Rate limit ----------
    rate_limit_enabled: bool = True
    rate_limit_anon_per_minute: int = 60
    rate_limit_auth_per_minute: int = 240
    rate_limit_login_per_minute: int = 5

    # ---------- AI ----------
    recommender_backend: Literal["heuristic", "remote"] = "heuristic"
    recommender_timeout_seconds: float = 2.5
    recommender_remote_url: str | None = None
    feedback_aggregate_enabled: bool = True

    @field_validator("database_url", "database_replica_url")
    @classmethod
    def _require_async_driver(cls, v: str | None) -> str | None:
        """asyncpg wajib: driver sync akan memblokir event loop."""
        if v and not v.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL harus memakai skema postgresql+asyncpg://")
        return v

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str) and not v.strip().startswith("["):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @model_validator(mode="after")
    def _harden_non_local(self) -> Settings:
        """Cegah konfigurasi berbahaya lolos ke staging/production."""
        if self.env in ("staging", "production"):
            if self.jwt_secret.get_secret_value() in _INSECURE_SECRETS:
                raise ValueError("JWT_SECRET masih nilai default. Set secret yang asli.")
            if len(self.jwt_secret.get_secret_value()) < 32:
                raise ValueError("JWT_SECRET minimal 32 karakter.")
            if self.debug:
                raise ValueError("DEBUG harus false di luar lingkungan lokal.")
            if "*" in self.cors_origins:
                raise ValueError("CORS wildcard tidak boleh dipakai di luar lokal.")
        return self

    @property
    def is_local(self) -> bool:
        return self.env in ("local", "test")

    @property
    def read_database_url(self) -> str:
        """URL untuk query baca. Jatuh balik ke primary bila replica belum ada."""
        return self.database_replica_url or self.database_url


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
