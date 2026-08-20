"""Test primitif keamanan. Tidak butuh Postgres maupun Redis."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    fingerprint,
    hash_password,
    new_session_id,
    verify_password,
)


@pytest.fixture(scope="module")
def settings() -> Settings:
    return Settings(_env_file=None, jwt_secret="x" * 48)


def test_hash_berbeda_untuk_password_sama():
    """Salt acak: dua hash dari password yang sama tidak boleh identik."""
    assert hash_password("rahasia-panjang-123") != hash_password("rahasia-panjang-123")


def test_verifikasi_password():
    hashed = hash_password("rahasia-panjang-123")
    assert verify_password("rahasia-panjang-123", hashed)
    assert not verify_password("salah", hashed)


def test_verifikasi_menolak_hash_rusak():
    assert not verify_password("apa saja", "bukan-hash-argon2")


def test_token_akses_bisa_didekode(settings: Settings):
    issued = create_access_token("user-1", role="merchant", settings=settings)
    payload = decode_token(issued.token, expected_type="access", settings=settings)
    assert payload["sub"] == "user-1"
    assert payload["role"] == "merchant"
    assert payload["jti"] == issued.jti


def test_refresh_token_ditolak_sebagai_token_akses(settings: Settings):
    """Klaim `typ` mencegah token refresh dipakai untuk mengakses endpoint."""
    issued = create_refresh_token("user-1", settings=settings)
    with pytest.raises(TokenError):
        decode_token(issued.token, expected_type="access", settings=settings)


def test_token_ditolak_bila_secret_berbeda(settings: Settings):
    issued = create_access_token("user-1", role="merchant", settings=settings)
    other = Settings(_env_file=None, jwt_secret="y" * 48)
    with pytest.raises(TokenError):
        decode_token(issued.token, expected_type="access", settings=other)


def test_konfigurasi_production_menolak_secret_default():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(_env_file=None, env="production")


def test_session_id_acak_dan_panjang():
    ids = {new_session_id() for _ in range(200)}
    assert len(ids) == 200
    assert all(len(i) >= 32 for i in ids)


def test_fingerprint_stabil_dan_satu_arah():
    assert fingerprint("abc") == fingerprint("abc")
    assert fingerprint("abc") != fingerprint("abd")
    assert len(fingerprint("abc")) == 64
