"""Test validasi DTO."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest
from app.schemas.catalog import decode_cursor, encode_cursor
from app.schemas.session import PersonalProfile


def test_cursor_bolak_balik():
    assert decode_cursor(encode_cursor(0.87, 12345)) == (0.87, 12345)


def test_cursor_rusak_tidak_meledak():
    """Cursor asal-asalan dari klien harus jadi halaman pertama, bukan error 500."""
    assert decode_cursor("bukan-base64!!") is None
    assert decode_cursor("") is None


def test_profil_menolak_tinggi_tidak_masuk_akal():
    with pytest.raises(ValidationError):
        PersonalProfile(height_cm=400)


def test_profil_menolak_ukuran_tubuh_tidak_wajar():
    with pytest.raises(ValidationError):
        PersonalProfile(measurements={"chest_circumference": 900})


def test_sidik_jari_profil_berubah_saat_isinya_berubah():
    a = PersonalProfile(undertone="warm", occasion="formal")
    b = PersonalProfile(undertone="cool", occasion="formal")
    assert a.fingerprint() != b.fingerprint()
    assert a.fingerprint() == PersonalProfile(undertone="warm", occasion="formal").fingerprint()


def test_bmi_dihitung_saat_data_lengkap():
    assert PersonalProfile(height_cm=170, weight_kg=65).bmi == pytest.approx(22.49, abs=0.01)
    assert PersonalProfile(height_cm=170).bmi is None


def test_password_lemah_ditolak():
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@b.com", password="password1234")
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@b.com", password="aaaaaaaaaaaa")


def test_email_dinormalisasi_ke_huruf_kecil():
    assert RegisterRequest(email="  A@B.COM ", password="Kata-Sandi-Kuat-99").email == "a@b.com"
