"""Bentuk data sesi try-on. Hidup di Redis, tidak pernah menyentuh Postgres."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.cache.keys import digest
from app.models.enums import (
    BodyShape,
    FaceShape,
    FitPreference,
    Gender,
    Undertone,
    UsageContext,
)


class PersonalProfile(BaseModel):
    """Karakter personal pembeli, hasil gabungan scan kamera dan kuesioner.

    Semua kolom opsional karena profil dibangun bertahap: batch pertama mungkin
    baru mengisi occasion, sementara undertone menyusul setelah scan selesai.
    """

    model_config = ConfigDict(extra="forbid")

    gender: Gender | None = None
    undertone: Undertone | None = None
    # Skala Monk Skin Tone 1-10, hasil klasifikasi di sisi klien.
    monk_skin_tone: int | None = Field(default=None, ge=1, le=10)
    body_shape: BodyShape | None = None
    face_shape: FaceShape | None = None
    height_cm: float | None = Field(default=None, ge=80, le=250)
    weight_kg: float | None = Field(default=None, ge=20, le=300)
    # Dimensi tubuh dalam cm, kuncinya mengikuti tabel measurement_key.
    measurements: dict[str, float] = Field(default_factory=dict)
    occasion: UsageContext | None = None
    fit_preference: FitPreference | None = None
    # Jawaban kuesioner lain yang belum punya kolom khusus.
    preferences: dict[str, Any] = Field(default_factory=dict)

    @field_validator("measurements")
    @classmethod
    def _sane_measurements(cls, v: dict[str, float]) -> dict[str, float]:
        for key, value in v.items():
            if not 1 <= value <= 300:
                raise ValueError(f"nilai '{key}' di luar rentang wajar (1-300 cm)")
        return v

    def fingerprint(self) -> str:
        """Kunci cache rekomendasi. Profil berubah -> hasil lama otomatis tidak terpakai."""
        return digest(self.model_dump(mode="json", exclude_none=True))

    @property
    def bmi(self) -> float | None:
        if not self.height_cm or not self.weight_kg:
            return None
        return round(self.weight_kg / ((self.height_cm / 100) ** 2), 2)


class SessionState(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    created_at: datetime
    profile: PersonalProfile = Field(default_factory=PersonalProfile)
    answers: dict[str, Any] = Field(default_factory=dict)
    completed_batches: list[str] = Field(default_factory=list)
    feedback_count: int = 0
    expires_in_seconds: int = 0

    @property
    def age_seconds(self) -> float:
        return (datetime.now(UTC) - self.created_at).total_seconds()


class FeedbackEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int
    liked: bool
    reason: str | None = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
