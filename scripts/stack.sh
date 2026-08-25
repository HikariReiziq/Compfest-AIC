#!/usr/bin/env bash
#
# stack.sh — pengendali tunggal untuk seluruh stack COBA.
#
# Menyatukan tiga profil compose yang berbeda tujuan agar tidak ada lagi
# rangkaian flag panjang yang harus diingat dan mudah salah ketik:
#
#   dev       kode di-bind-mount, hot reload, port terbuka untuk debugging
#   prod      image mandiri, tanpa bind mount
#   hardened  prod + pengerasan keamanan, backend tidak terpublikasi
#
# Gunakan `hardened` untuk apa pun yang akan dijangkau dari luar mesin ini.

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

readonly C_RED=$'\033[0;31m' C_GRN=$'\033[0;32m' C_YEL=$'\033[0;33m'
readonly C_BLU=$'\033[0;34m' C_DIM=$'\033[2m' C_OFF=$'\033[0m'

log()  { printf '%s==>%s %s\n' "$C_BLU" "$C_OFF" "$*"; }
ok()   { printf '%s  ok%s %s\n' "$C_GRN" "$C_OFF" "$*"; }
warn() { printf '%s  !!%s %s\n' "$C_YEL" "$C_OFF" "$*" >&2; }
die()  { printf '%s  xx%s %s\n' "$C_RED" "$C_OFF" "$*" >&2; exit 1; }

PROFILE="${PROFILE:-hardened}"

compose_files() {
  case "$PROFILE" in
    dev)      printf -- '-f docker-compose.yml -f docker-compose.dev.yml' ;;
    prod)     printf -- '-f docker-compose.yml' ;;
    hardened) printf -- '-f docker-compose.yml -f docker-compose.hardened.yml' ;;
    *) die "profil tidak dikenal: '$PROFILE' (pilih: dev | prod | hardened)" ;;
  esac
}

dc() {
  # shellcheck disable=SC2046
  docker compose $(compose_files) "$@"
}

require_docker() {
  command -v docker >/dev/null 2>&1 || die "docker tidak terpasang"
  if ! docker info >/dev/null 2>&1; then
    warn "daemon docker tidak berjalan, mencoba menyalakan..."
    systemctl start docker 2>/dev/null || true
    sleep 2
    docker info >/dev/null 2>&1 || die "daemon docker gagal dinyalakan (butuh hak akses?)"
  fi
}

# Endpoint yang dipublikasikan berbeda antar profil: pada 'hardened' backend
# sengaja tidak terbuka dan hanya dijangkau lewat proxy di client.
client_url() { printf 'http://127.0.0.1:3000'; }
health_url() {
  case "$PROFILE" in
    hardened) printf 'http://127.0.0.1:3000/api/v1/health' ;;
    *)        printf 'http://127.0.0.1:8000/health' ;;
  esac
}

wait_healthy() {
  local url timeout=${1:-120} waited=0
  url="$(health_url)"
  log "menunggu backend siap di $url"
  while (( waited < timeout )); do
    if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
      ok "backend menjawab setelah ${waited}s"
      return 0
    fi
    sleep 3; waited=$((waited + 3))
    printf '%s  .. %ss%s\r' "$C_DIM" "$waited" "$C_OFF"
  done
  printf '\n'
  warn "backend belum menjawab dalam ${timeout}s — lihat: $0 logs"
  return 1
}

cmd_up() {
  require_docker
  log "profil: $PROFILE"
  dc up --build -d
  wait_healthy || true
  cmd_status
  printf '\n'
  ok "aplikasi: $(client_url)"
  if [[ "$PROFILE" == "hardened" ]]; then
    printf '%s     backend sengaja tidak dipublikasikan; diakses lewat proxy client%s\n' "$C_DIM" "$C_OFF"
    printf '%s     buka ke internet dengan: scripts/tunnel.sh%s\n' "$C_DIM" "$C_OFF"
  fi
}

cmd_down()    { require_docker; dc down --remove-orphans; ok "stack dihentikan"; }
cmd_restart() { cmd_down; cmd_up; }
cmd_logs()    { require_docker; dc logs -f --tail="${2:-100}" "${1:-}"; }
cmd_ps()      { require_docker; dc ps; }

cmd_status() {
  require_docker
  printf '\n'
  dc ps --format 'table {{.Service}}\t{{.State}}\t{{.Ports}}' 2>/dev/null || dc ps
}

# Membuktikan pengerasan benar-benar aktif, bukan sekadar tertulis di berkas.
# Setelan keamanan yang diyakini aktif padahal tidak adalah keadaan terburuk:
# ia memberi rasa aman tanpa perlindungan.
cmd_audit() {
  require_docker
  local fail=0
  log "audit pengerasan container"
  printf '\n%-26s %-10s %-10s %-12s %s\n' "CONTAINER" "USER" "READONLY" "CAP_DROP" "NO-NEW-PRIV"
  printf -- '%.0s-' {1..76}; printf '\n'

  for c in $(dc ps -q 2>/dev/null); do
    local name user ro caps nnp
    name=$(docker inspect -f '{{.Name}}' "$c" | sed 's|^/||')
    user=$(docker inspect -f '{{.Config.User}}' "$c"); user=${user:-root}
    ro=$(docker inspect -f '{{.HostConfig.ReadonlyRootfs}}' "$c")
    caps=$(docker inspect -f '{{.HostConfig.CapDrop}}' "$c")
    nnp=$(docker inspect -f '{{.HostConfig.SecurityOpt}}' "$c")

    [[ "$user" == "root" || "$user" == "0" ]] && { user="${C_RED}root${C_OFF}"; fail=1; }
    [[ "$ro" != "true" ]] && fail=1
    [[ "$caps" != *"ALL"* ]] && fail=1
    [[ "$nnp" != *"no-new-privileges"* ]] && fail=1

    printf '%-26s %-19s %-10s %-12s %s\n' "$name" "$user" "$ro" "$caps" "$nnp"
  done

  printf '\n'
  # Docker socket di dalam container sama dengan memberi akses root ke host.
  if dc config 2>/dev/null | grep -q 'docker.sock'; then
    warn "docker.sock ter-mount ke container — setara memberi root pada host"
    fail=1
  else
    ok "tidak ada container yang memegang docker.sock"
  fi

  if [[ "$PROFILE" == "hardened" ]]; then
    if dc config 2>/dev/null | grep -A3 '^  server:' | grep -q 'published'; then
      warn "backend terpublikasi padahal profil hardened"; fail=1
    else
      ok "backend tidak terpublikasi ke host"
    fi
  fi

  (( fail == 0 )) && ok "seluruh pemeriksaan lolos" || warn "ada pemeriksaan yang gagal di atas"
  return "$fail"
}

usage() {
  cat <<USAGE
stack.sh — pengendali stack COBA

  PROFILE=<dev|prod|hardened> $0 <perintah>

Perintah
  up            bangun & jalankan, tunggu sampai sehat
  down          hentikan & bersihkan
  restart       down lalu up
  status        ringkasan container
  logs [svc]    ikuti log (opsional satu service)
  audit         buktikan pengerasan keamanan benar-benar aktif
  help          tampilkan ini

Profil
  dev           hot reload, port terbuka — untuk pengembangan lokal
  prod          image mandiri
  hardened      (bawaan) prod + pengerasan; backend tidak terpublikasi

Contoh
  $0 up                       # hardened
  PROFILE=dev $0 up           # pengembangan
  $0 audit                    # periksa pengerasan
USAGE
}

case "${1:-help}" in
  up)      cmd_up ;;
  down)    cmd_down ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  ps)      cmd_ps ;;
  logs)    shift; cmd_logs "${1:-}" "${2:-100}" ;;
  audit)   cmd_audit ;;
  help|-h|--help) usage ;;
  *) die "perintah tidak dikenal: $1 (lihat: $0 help)" ;;
esac
