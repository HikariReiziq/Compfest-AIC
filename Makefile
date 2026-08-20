.PHONY: help up down logs build migrate seed revision test test-int lint fmt audit shell clean

help:  ## Tampilkan daftar perintah
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up:  ## Jalankan seluruh stack (api + postgres + redis)
	docker compose up -d --build
	@echo "API: http://localhost:8000/docs"

down:  ## Hentikan stack
	docker compose down

clean:  ## Hentikan stack sekaligus hapus volume data
	docker compose down -v

logs:  ## Ikuti log API
	docker compose logs -f api

build:  ## Bangun ulang image API
	docker compose build api

migrate:  ## Terapkan migrasi ke database
	alembic upgrade head

revision:  ## Buat migrasi baru: make revision m="pesan"
	alembic revision --autogenerate -m "$(m)"

seed:  ## Isi data awal
	python -m scripts.seed

test:  ## Test unit saja (tanpa Postgres/Redis)
	pytest -m "not integration" -q

test-int:  ## Seluruh test termasuk integrasi (butuh stack hidup)
	pytest -q

cov:  ## Test dengan laporan cakupan
	pytest --cov=app --cov-report=term-missing -q

lint:  ## Periksa gaya kode
	ruff check app tests scripts

fmt:  ## Rapikan kode
	ruff check --fix app tests scripts && ruff format app tests scripts

audit:  ## Pindai kerentanan dependency
	pip-audit -r requirements.txt --desc on
