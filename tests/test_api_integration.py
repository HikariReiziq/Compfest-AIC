"""Test integrasi ujung ke ujung.

Butuh Postgres dan Redis hidup (docker compose up -d postgres redis) serta
database yang sudah dimigrasi dan di-seed.

Jalankan: pytest -m integration
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_liveness_dan_readiness(client: AsyncClient):
    assert (await client.get("/healthz")).status_code == 200
    body = (await client.get("/readyz")).json()
    assert body["status"] == "ready", f"dependency belum siap: {body}"


async def test_header_keamanan_selalu_terpasang(client: AsyncClient):
    response = await client.get("/healthz")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Request-ID"]


async def test_pohon_kategori(client: AsyncClient):
    tree = (await client.get("/api/v1/catalog/categories")).json()
    slugs = {node["slug"] for node in tree}
    assert {"apparel", "accessories", "footwear"} <= slugs
    apparel = next(n for n in tree if n["slug"] == "apparel")
    assert any(child["slug"] == "topwear" for child in apparel["children"])


async def test_daftar_produk_dan_keyset_pagination(client: AsyncClient):
    first = (await client.get("/api/v1/catalog/products", params={"limit": 5})).json()
    assert len(first["items"]) == 5
    assert first["has_more"] is True

    second = (
        await client.get(
            "/api/v1/catalog/products", params={"limit": 5, "cursor": first["next_cursor"]}
        )
    ).json()
    ids_pertama = {item["id"] for item in first["items"]}
    ids_kedua = {item["id"] for item in second["items"]}
    # Halaman berikutnya tidak boleh mengulang baris halaman sebelumnya.
    assert not (ids_pertama & ids_kedua)


async def test_filter_kategori_menjangkau_seluruh_turunan(client: AsyncClient):
    """Filter 'apparel' (level master) harus menangkap tshirts dan jeans di bawahnya."""
    response = await client.get(
        "/api/v1/catalog/products", params={"category_slug": "apparel", "limit": 50}
    )
    slugs = {item["category"]["slug"] for item in response.json()["items"]}
    assert {"tshirts", "jeans"} <= slugs


async def test_pencarian_teks(client: AsyncClient):
    hasil = (await client.get("/api/v1/catalog/products", params={"q": "batik"})).json()
    assert hasil["items"]
    assert all("Batik" in item["display_name"] for item in hasil["items"])


async def test_etag_menghasilkan_304(client: AsyncClient):
    daftar = (await client.get("/api/v1/catalog/products", params={"limit": 1})).json()
    product_id = daftar["items"][0]["id"]

    pertama = await client.get(f"/api/v1/catalog/products/{product_id}")
    assert pertama.status_code == 200
    etag = pertama.headers["ETag"]

    kedua = await client.get(
        f"/api/v1/catalog/products/{product_id}", headers={"If-None-Match": etag}
    )
    assert kedua.status_code == 304
    assert kedua.content == b""


async def test_produk_tidak_ada_mengembalikan_problem_json(client: AsyncClient):
    response = await client.get("/api/v1/catalog/products/99999999")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["title"] == "not_found"


async def test_alur_sesi_lengkap(client: AsyncClient):
    # 1. Mulai sesi
    sesi = (await client.post("/api/v1/session")).json()
    session_id = sesi["session_id"]
    headers = {"X-Session-Id": session_id}

    # 2. Kirim hasil scan tubuh
    profil = await client.patch(
        "/api/v1/session/profile",
        headers=headers,
        json={
            "gender": "men",
            "undertone": "warm",
            "body_shape": "rectangle",
            "face_shape": "round",
            "height_cm": 172,
            "weight_kg": 68,
            "measurements": {"chest_circumference": 95.0},
        },
    )
    assert profil.status_code == 200
    assert profil.json()["profile"]["undertone"] == "warm"

    # 3. Jawab batch pertama
    jawaban = await client.post(
        "/api/v1/session/answers",
        headers=headers,
        json={
            "batch_code": "batch1",
            "answers": {"occasion": "casual", "fit_preference": "regular"},
        },
    )
    assert jawaban.status_code == 200
    state = jawaban.json()
    assert state["completed_batches"] == ["batch1"]
    assert state["profile"]["occasion"] == "casual"

    # 4. Ambil rekomendasi
    reko = await client.post(
        "/api/v1/session/recommendations", headers=headers, json={"limit": 6}
    )
    assert reko.status_code == 200
    hasil = reko.json()
    assert hasil["items"], "rekomendasi tidak boleh kosong"
    assert hasil["engine"] == "heuristic"
    assert hasil["cached"] is False
    teratas = hasil["items"][0]
    assert 0 <= teratas["score"] <= 1
    assert teratas["reasons"], "setiap rekomendasi harus bisa dijelaskan"

    # 5. Permintaan identik dilayani cache, tidak menghitung ulang
    ulang = (
        await client.post("/api/v1/session/recommendations", headers=headers, json={"limit": 6})
    ).json()
    assert ulang["cached"] is True
    assert [i["product"]["id"] for i in ulang["items"]] == [
        i["product"]["id"] for i in hasil["items"]
    ]

    # 6. Beri feedback tidak cocok
    feedback = await client.post(
        "/api/v1/session/feedback",
        headers=headers,
        json={"product_id": teratas["product"]["id"], "liked": False},
    )
    assert feedback.status_code == 202
    assert feedback.json()["feedback_count"] == 1

    # 7. Produk yang ditolak tidak muncul lagi
    setelah = (
        await client.post("/api/v1/session/recommendations", headers=headers, json={"limit": 6})
    ).json()
    assert teratas["product"]["id"] not in [i["product"]["id"] for i in setelah["items"]]

    # 8. Akhiri sesi, seluruh datanya hilang
    assert (await client.delete("/api/v1/session", headers=headers)).status_code == 204
    assert (await client.get("/api/v1/session", headers=headers)).status_code == 410


async def test_saran_ukuran_ikut_terlampir(client: AsyncClient):
    sesi = (await client.post("/api/v1/session")).json()
    headers = {"X-Session-Id": sesi["session_id"]}
    await client.patch(
        "/api/v1/session/profile",
        headers=headers,
        json={"gender": "men", "measurements": {"chest_circumference": 95.0}},
    )
    hasil = (
        await client.post("/api/v1/session/recommendations", headers=headers, json={"limit": 10})
    ).json()
    dengan_ukuran = [i for i in hasil["items"] if i.get("size")]
    assert dengan_ukuran, "produk dengan size chart harus membawa saran ukuran"
    assert dengan_ukuran[0]["size"]["recommended"] in {"S", "M", "L", "XL"}


async def test_sesi_tidak_dikenal_ditolak(client: AsyncClient):
    response = await client.get("/api/v1/session", headers={"X-Session-Id": "x" * 40})
    assert response.status_code == 410
    assert response.json()["title"] == "session_expired"


async def test_kuesioner_tersedia(client: AsyncClient):
    batches = (await client.get("/api/v1/questionnaire")).json()
    assert [b["code"] for b in batches] == ["batch1", "batch2", "batch3"]
    assert batches[0]["questions"][0]["maps_to"] == "occasion"


async def test_alur_autentikasi_penjual(client: AsyncClient):
    email = f"penjual-{uuid.uuid4().hex[:10]}@contoh.id"
    password = "Kata-Sandi-Yang-Panjang-99"

    daftar = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Toko Uji"},
    )
    assert daftar.status_code == 201

    # Email yang sama ditolak
    assert (
        await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    ).status_code == 409

    masuk = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert masuk.status_code == 200
    token = masuk.json()

    saya = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token['access_token']}"}
    )
    assert saya.json()["email"] == email

    # Refresh token menghasilkan pasangan baru
    segar = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": token["refresh_token"]}
    )
    assert segar.status_code == 200
    assert segar.json()["refresh_token"] != token["refresh_token"]

    # Token lama yang sudah dirotasi dianggap bocor dan ditolak
    ulang = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": token["refresh_token"]}
    )
    assert ulang.status_code == 401


async def test_token_refresh_tidak_bisa_dipakai_sebagai_token_akses(client: AsyncClient):
    email = f"penjual-{uuid.uuid4().hex[:10]}@contoh.id"
    password = "Kata-Sandi-Yang-Panjang-99"
    await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    token = (
        await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    ).json()

    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token['refresh_token']}"}
    )
    assert response.status_code == 401


async def test_login_salah_tidak_membocorkan_email_terdaftar(client: AsyncClient):
    tak_ada = await client.post(
        "/api/v1/auth/login", json={"email": "tidakada@contoh.id", "password": "salah-sekali-99"}
    )
    assert tak_ada.status_code == 401
    assert tak_ada.json()["detail"] == "Email atau password salah."
