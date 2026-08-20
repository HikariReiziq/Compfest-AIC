"""Penyimpanan sesi try-on yang ephemeral.

Keputusan arsitektur paling penting di modul ini: sesi tidak pernah masuk
Postgres. Proposal menjanjikan jawaban dan riwayat feedback hilang saat sesi
berakhir, dan Redis dengan TTL menegakkan janji itu secara mekanis, bukan lewat
cron pembersih yang bisa lupa jalan. Efek sampingnya menguntungkan: jalur paling
sibuk aplikasi ini (setiap kali pembeli menjawab pertanyaan) tidak menyentuh
database sama sekali.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import orjson
from loguru import logger

from app.cache.client import get_redis
from app.cache.keys import session_feedback_key, session_key
from app.core.config import get_settings
from app.core.errors import DependencyUnavailableError, SessionExpiredError
from app.core.security import new_session_id
from app.schemas.session import FeedbackEntry, PersonalProfile, SessionState

_FIELD_META = b"meta"
_FIELD_PROFILE = b"profile"
_FIELD_ANSWERS = b"answers"
_FIELD_BATCHES = b"batches"


class SessionStore:
    """Semua operasi memperbarui TTL, sehingga sesi aktif jadi sliding window."""

    def __init__(self) -> None:
        self._settings = get_settings()

    @property
    def ttl(self) -> int:
        return self._settings.session_ttl_seconds

    async def create(self) -> SessionState:
        session_id = new_session_id()
        created_at = datetime.now(UTC)
        key = session_key(session_id)
        try:
            pipe = get_redis().pipeline()
            pipe.hset(
                key,
                mapping={
                    _FIELD_META: orjson.dumps({"created_at": created_at.isoformat()}),
                    _FIELD_PROFILE: orjson.dumps({}),
                    _FIELD_ANSWERS: orjson.dumps({}),
                    _FIELD_BATCHES: orjson.dumps([]),
                },
            )
            pipe.expire(key, self.ttl)
            await pipe.execute()
        except Exception as exc:
            logger.error("gagal membuat sesi: {}", exc)
            raise DependencyUnavailableError("Penyimpanan sesi tidak tersedia.") from exc

        return SessionState(
            session_id=session_id,
            created_at=created_at,
            expires_in_seconds=self.ttl,
        )

    async def get(self, session_id: str) -> SessionState:
        key = session_key(session_id)
        try:
            pipe = get_redis().pipeline()
            pipe.hgetall(key)
            pipe.llen(session_feedback_key(session_id))
            # Perpanjang umur sesi setiap kali dipakai.
            pipe.expire(key, self.ttl)
            pipe.expire(session_feedback_key(session_id), self.ttl)
            raw, feedback_count, _, _ = await pipe.execute()
        except Exception as exc:
            logger.error("gagal membaca sesi: {}", exc)
            raise DependencyUnavailableError("Penyimpanan sesi tidak tersedia.") from exc

        if not raw:
            raise SessionExpiredError()

        meta = orjson.loads(raw.get(_FIELD_META, b"{}"))
        return SessionState(
            session_id=session_id,
            created_at=datetime.fromisoformat(meta["created_at"]),
            profile=PersonalProfile.model_validate(orjson.loads(raw.get(_FIELD_PROFILE, b"{}"))),
            answers=orjson.loads(raw.get(_FIELD_ANSWERS, b"{}")),
            completed_batches=orjson.loads(raw.get(_FIELD_BATCHES, b"[]")),
            feedback_count=int(feedback_count or 0),
            expires_in_seconds=self.ttl,
        )

    async def _write_field(self, session_id: str, field: bytes, value: Any) -> None:
        key = session_key(session_id)
        pipe = get_redis().pipeline()
        pipe.hset(key, field, orjson.dumps(value))
        pipe.expire(key, self.ttl)
        await pipe.execute()

    async def update_profile(self, session_id: str, profile: PersonalProfile) -> None:
        await self._ensure_exists(session_id)
        await self._write_field(
            session_id, _FIELD_PROFILE, profile.model_dump(mode="json", exclude_none=True)
        )

    async def merge_answers(
        self, session_id: str, batch_code: str, answers: dict[str, Any]
    ) -> SessionState:
        state = await self.get(session_id)
        state.answers.update(answers)
        if batch_code not in state.completed_batches:
            state.completed_batches.append(batch_code)

        key = session_key(session_id)
        pipe = get_redis().pipeline()
        pipe.hset(key, _FIELD_ANSWERS, orjson.dumps(state.answers))
        pipe.hset(key, _FIELD_BATCHES, orjson.dumps(state.completed_batches))
        pipe.expire(key, self.ttl)
        await pipe.execute()
        return state

    async def add_feedback(self, session_id: str, entry: FeedbackEntry) -> int:
        await self._ensure_exists(session_id)
        key = session_feedback_key(session_id)
        pipe = get_redis().pipeline()
        pipe.lpush(key, orjson.dumps(entry.model_dump(mode="json")))
        # Potong dari sisi terlama: satu sesi tidak boleh menghabiskan memori.
        pipe.ltrim(key, 0, self._settings.session_max_feedback - 1)
        pipe.expire(key, self.ttl)
        pipe.expire(session_key(session_id), self.ttl)
        pipe.llen(key)
        results = await pipe.execute()
        return int(results[-1])

    async def list_feedback(self, session_id: str, limit: int = 100) -> list[FeedbackEntry]:
        raw = await get_redis().lrange(session_feedback_key(session_id), 0, limit - 1)
        return [FeedbackEntry.model_validate(orjson.loads(item)) for item in raw]

    async def delete(self, session_id: str) -> None:
        """Dipanggil saat pembeli menutup sesi. TTL tetap jadi jaring pengaman."""
        await get_redis().delete(session_key(session_id), session_feedback_key(session_id))

    async def _ensure_exists(self, session_id: str) -> None:
        if not await get_redis().exists(session_key(session_id)):
            raise SessionExpiredError()


_store: SessionStore | None = None


def get_session_store() -> SessionStore:
    global _store
    if _store is None:
        _store = SessionStore()
    return _store
