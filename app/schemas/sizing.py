"""DTO untuk hasil pemilihan ukuran."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SizeOption(BaseModel):
    label: str
    score: float = Field(ge=0.0, le=1.0)
    sort_order: int = 0
    # Per dimensi: True kalau nilai tubuh jatuh di dalam rentang ukuran ini.
    fits: dict[str, bool] = Field(default_factory=dict)


class SizeSuggestion(BaseModel):
    recommended: str
    confidence: float = Field(ge=0.0, le=1.0)
    chart_code: str
    chart_version: int
    options: list[SizeOption] = Field(default_factory=list)
