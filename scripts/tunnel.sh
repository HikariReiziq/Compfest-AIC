#!/usr/bin/env bash
#
# tunnel.sh — buka stack lokal ke internet lewat ngrok, dengan gerbang autentikasi.
#
# Membuka aplikasi ke internet berarti siapa pun yang menebak URL-nya bisa
# memanggil seluruh endpoint, termasuk VTON yang berat dan analisis wajah.
# Karena itu skrip ini MENOLAK berjalan tanpa kata sandi, dan menolak
# menerowongi stack yang backend-nya masih terpublikasi ke jaringan.
#
# Autentikasi ditegakkan oleh gerbang milik kita sendiri (Caddy), bukan oleh
# fitur ngrok, karena basic-auth bawaan ngrok tidak tersedia di semua paket.
# Dengan begitu perlindungannya tidak bergantung pada tier akun.

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

readonly C_RED=$'\033[0;31m' C_GRN=$'\033[0;32m' C_YEL=$'\033[0;33m'
readonly C_BLU=$'\033[0;34m' C_DIM=$'\033[2m' C_OFF=$'\033[0m'
log()  { printf '%s==>%s %s\n' "$C_BLU" "$C_OFF" "$*"; }
ok()   { printf '%s  ok%s %s\n' "$C_GRN" "$C_OFF" "$*"; }
warn() { printf '%s  !!%s %s\n' "$C_YEL" "$C_OFF" "$*" >&2; }
die()  { printf '%s  xx%s %s\n' "$C_RED" "$C_OFF" "$*" >&2; exit 1; }

GATE_PORT="${GATE_PORT:-8080}"
UPSTREAM="${UPSTREAM:-host.docker.internal:3000}"
TUNNEL_USER="${TUNNEL_USER:-coba}"
GATE_NAME="coba-tunnel-gate"

# ---------------------------------------------------------------- prasyarat
ensure_ngrok() {
  if command -v ngrok >/dev/null 2>&1; then return 0; fi
  warn "ngrok belum terpasang"
  cat <<'HINT'

  Pasang salah satu cara:
    Arch    : yay -S ngrok         (atau: paru -S ngrok)
    Manual  : https://ngrok.com/download
              unzip lalu pindahkan biner ke ~/.local/bin/

  Lalu daftarkan token (gratis) dari https://dashboard.ngrok.com:
    ngrok config add-authtoken <TOKEN-ANDA>

HINT
  die "pasang ngrok lebih dulu"
}

ensure_authtoken() {
  # ngrok menolak tunnel tanpa token; deteksi lebih awal agar pesannya jelas.
  if [[ -n "${NGROK_AUTHTOKEN:-}" ]]; then return 0; fi
  local cfg
  cfg="$(ngrok config check 2>&1 || true)"
  if grep -qi "valid" <<<"$cfg"; then return 0; fi
  die "token ngrok belum diset — jalankan: ngrok config add-authtoken <TOKEN>"
}

ensure_password() {
  if [[ -n "${TUNNEL_PASSWORD:-}" ]]; then return 0; fi
  cat <<'HINT'

  Terowongan ini akan bisa dijangkau siapa pun di internet, jadi kata sandi
  wajib. Set lebih dulu, misalnya:

    export TUNNEL_USER=coba
    export TUNNEL_PASSWORD="$(openssl rand -base64 18)"

HINT
  die "TUNNEL_PASSWORD belum diset"
}

ensure_stack_running() {
  curl -fsS --max-time 3 "http://127.0.0.1:3000" >/dev/null 2>&1 && return 0
  die "stack belum jalan di :3000 — jalankan lebih dulu: scripts/stack.sh up"
}

# Menolak menerowongi stack yang backend-nya masih terbuka. Kalau port 8000
# terpublikasi, gerbang ini bisa dilewati begitu saja lewat jalur lain.
ensure_backend_not_exposed() {
  if ss -ltn 2>/dev/null | grep -qE '0\.0\.0\.0:8000|\[::\]:8000'; then
    warn "port 8000 terbuka ke semua antarmuka — gerbang autentikasi bisa dilewati"
    die  "jalankan profil hardened: scripts/stack.sh down && scripts/stack.sh up"
  fi
  ok "backend tidak terbuka langsung"
}

# ---------------------------------------------------------------- gerbang
start_gate() {
  log "menyalakan gerbang autentikasi di :$GATE_PORT"
  docker rm -f "$GATE_NAME" >/dev/null 2>&1 || true

  local hash
  # Caddy menyimpan sandi sebagai hash bcrypt; sandi mentah tidak pernah
  # ditulis ke berkas konfigurasi maupun ke image.
  hash="$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$TUNNEL_PASSWORD" 2>/dev/null | tail -1)"
  [[ -n "$hash" ]] || die "gagal membuat hash sandi"

  local cfg="$ROOT/.tunnel-Caddyfile"
  cat > "$cfg" <<CADDY
{
	admin off
	auto_https off
}

:${GATE_PORT} {
	basic_auth {
		${TUNNEL_USER} ${hash}
	}

	# Batasi ukuran body: endpoint VTON menerima gambar base64, dan tanpa
	# batas satu permintaan besar bisa menghabiskan memori container.
	request_body {
		max_size 12MB
	}

	header {
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy no-referrer
		-Server
	}

	reverse_proxy ${UPSTREAM}
}
CADDY

  docker run -d --name "$GATE_NAME" \
    --add-host host.docker.internal:host-gateway \
    -p "127.0.0.1:${GATE_PORT}:${GATE_PORT}" \
    -v "$cfg:/etc/caddy/Caddyfile:ro" \
    --security-opt no-new-privileges:true \
    --cap-drop ALL --cap-add NET_BIND_SERVICE \
    --read-only --tmpfs /tmp --tmpfs /config --tmpfs /data \
    --memory 256m --pids-limit 128 \
    caddy:2-alpine >/dev/null

  sleep 2
  docker ps --format '{{.Names}}' | grep -q "$GATE_NAME" \
    || { docker logs "$GATE_NAME" 2>&1 | tail -20; die "gerbang gagal menyala"; }

  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${GATE_PORT}/" || true)"
  [[ "$code" == "401" ]] || die "gerbang tidak meminta autentikasi (dapat $code) — dibatalkan demi keamanan"
  ok "gerbang aktif dan menolak akses tanpa sandi (401)"
}

stop_gate() {
  docker rm -f "$GATE_NAME" >/dev/null 2>&1 || true
  rm -f "$ROOT/.tunnel-Caddyfile"
}

cleanup() {
  printf '\n'
  log "membersihkan"
  stop_gate
  ok "gerbang dimatikan; stack lokal tetap berjalan"
}

# ---------------------------------------------------------------- perintah
cmd_start() {
  ensure_ngrok
  ensure_authtoken
  ensure_password
  ensure_stack_running
  ensure_backend_not_exposed
  start_gate
  trap cleanup EXIT INT TERM

  printf '\n'
  ok "pengguna : $TUNNEL_USER"
  ok "sandi    : (dari \$TUNNEL_PASSWORD)"
  printf '%s     URL publik muncul di bawah. Tekan Ctrl+C untuk menutup.%s\n\n' "$C_DIM" "$C_OFF"

  ngrok http "${GATE_PORT}" --log stdout --log-format term
}

cmd_stop() { stop_gate; ok "gerbang dihentikan"; }

cmd_status() {
  if docker ps --format '{{.Names}}' | grep -q "$GATE_NAME"; then
    ok "gerbang berjalan di :$GATE_PORT"
  else
    warn "gerbang tidak berjalan"
  fi
  pgrep -x ngrok >/dev/null && ok "ngrok berjalan" || warn "ngrok tidak berjalan"
}

usage() {
  cat <<USAGE
tunnel.sh — buka stack lokal ke internet dengan gerbang autentikasi

  export TUNNEL_PASSWORD="\$(openssl rand -base64 18)"
  $0 start

Perintah
  start     nyalakan gerbang + terowongan ngrok (Ctrl+C untuk menutup)
  stop      hentikan gerbang
  status    keadaan gerbang dan ngrok

Environment
  TUNNEL_USER       nama pengguna basic auth (bawaan: coba)
  TUNNEL_PASSWORD   WAJIB — tanpa ini skrip menolak jalan
  GATE_PORT         port gerbang lokal (bawaan: 8080)

Syarat: stack sudah jalan lewat scripts/stack.sh up (profil hardened).
USAGE
}

case "${1:-help}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  help|-h|--help) usage ;;
  *) die "perintah tidak dikenal: $1" ;;
esac
