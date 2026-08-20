"""DTO autentikasi penjual."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import UserRole

# NIST SP 800-63B: panjang jauh lebih menentukan daripada kombinasi karakter,
# jadi yang ditegakkan minimum 12 karakter dan penolakan pola yang jelas lemah.
_WEAK_PATTERNS = re.compile(
    r"^(password|passw0rd|qwerty|12345678|admin1234|coba1234)", re.IGNORECASE
)


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str | None = Field(default=None, max_length=120)

    @field_validator("password")
    @classmethod
    def _not_weak(cls, v: str) -> str:
        if _WEAK_PATTERNS.match(v):
            raise ValueError("Password terlalu mudah ditebak.")
        if len(set(v)) < 5:
            raise ValueError("Password terlalu sedikit variasi karakternya.")
        return v

    @field_validator("email")
    @classmethod
    def _normalise(cls, v: str) -> str:
        return v.strip().lower()


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _normalise(cls, v: str) -> str:
        return v.strip().lower()


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=16, max_length=4096)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105 - nama skema OAuth2, bukan kredensial
    expires_in: int


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    created_at: datetime
