# syntax=docker/dockerfile:1

# ---------- Tahap 1: bangun dependency ----------
# Dependency dipasang di tahap terpisah agar toolchain kompilasi (gcc, header)
# tidak ikut terbawa ke image akhir. Image jadi jauh lebih kecil dan permukaan
# serangannya berkurang.
FROM python:3.14-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Salin requirements lebih dulu supaya layer dependency tetap tersimpan di cache
# selama daftar paket tidak berubah, walau kode aplikasi berubah terus.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt


# ---------- Tahap 2: image runtime ----------
FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    # Proses tidak berjalan sebagai root. Kalau ada celah RCE, penyerang
    # mendarat sebagai pengguna tanpa hak istimewa.
    && groupadd --gid 1001 coba \
    && useradd --uid 1001 --gid coba --create-home --shell /usr/sbin/nologin coba

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=coba:coba app ./app
COPY --chown=coba:coba alembic ./alembic
COPY --chown=coba:coba scripts ./scripts
COPY --chown=coba:coba alembic.ini pyproject.toml ./
COPY --chown=coba:coba docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER coba
EXPOSE 8000

# Dipakai Docker dan orkestrator untuk tahu kapan container siap menerima trafik.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["serve"]
