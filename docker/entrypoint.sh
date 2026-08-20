#!/usr/bin/env bash
# Entrypoint container API.
#
# Migrasi tidak dijalankan otomatis secara diam-diam. Ia hanya jalan bila
# RUN_MIGRATIONS=true, karena beberapa replika yang start bersamaan dan
# sama-sama menjalankan migrasi adalah sumber masalah klasik saat deploy.
set -euo pipefail

if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
    echo "[entrypoint] menjalankan migrasi database..."
    alembic upgrade head
fi

if [[ "${RUN_SEED:-false}" == "true" ]]; then
    echo "[entrypoint] mengisi data awal..."
    python -m scripts.seed
fi

case "${1:-serve}" in
    serve)
        # Jumlah worker mengikuti jumlah CPU yang dialokasikan ke container.
        exec uvicorn app.main:app \
            --host 0.0.0.0 \
            --port 8000 \
            --workers "${WEB_CONCURRENCY:-2}" \
            --proxy-headers \
            --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-127.0.0.1}" \
            --no-server-header
        ;;
    reload)
        exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
        ;;
    migrate)
        exec alembic upgrade head
        ;;
    seed)
        exec python -m scripts.seed
        ;;
    *)
        exec "$@"
        ;;
esac
