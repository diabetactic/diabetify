#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RESET=false
PNPM_STORE_PRUNE=false
DOCKER_CLEAN=false
REINSTALL=false
QUALITY_FULL=false
E2E_DOCKER=false

usage() {
  cat <<'EOF'
Usage: ./scripts/doctor.sh [options]

Options:
  --reset              Remove build outputs, node_modules, and test artifacts
  --pnpm-store-prune   Run `pnpm store prune`
  --docker-clean       Stop/remove repo Docker stacks (volumes too)
  --reinstall          Run `pnpm install`
  --quality-full       Run `pnpm -s run quality:full`
  --e2e-docker         Run `pnpm -s run test:e2e:docker -- --clean`
  --all                Run `--quality-full` and `--e2e-docker`
  --help               Show help

Examples:
  ./scripts/doctor.sh --all
  ./scripts/doctor.sh --reset --docker-clean --reinstall --all
EOF
}

log() { printf '%s\n' "$*"; }

have() { command -v "$1" >/dev/null 2>&1; }

safe_relpath_or_die() {
  local rel="$1"
  if [[ "$rel" == /* ]] || [[ "$rel" == *".."* ]]; then
    log "Refusing unsafe path: $rel"
    exit 2
  fi
}

ensure_writable_or_delete() {
  local rel="$1"
  safe_relpath_or_die "$rel"

  [[ -e "$rel" ]] || return 0
  if [[ -w "$rel" ]]; then
    return 0
  fi

  log "Fixing permissions for: $rel"

  if have sudo && sudo -n true >/dev/null 2>&1; then
    sudo -n chown -R "$(id -u)":"$(id -g)" "$rel" >/dev/null 2>&1 || true
    sudo -n chmod -R u+rwX "$rel" >/dev/null 2>&1 || true
    return 0
  fi

  if have docker && docker info >/dev/null 2>&1; then
    log "Deleting as root via Docker: $rel"
    docker run --rm -v "$PROJECT_ROOT":/work alpine:3.20 sh -lc "rm -rf \"/work/$rel\"" >/dev/null
    return 0
  fi

  log "Could not fix permissions for: $rel"
  return 1
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi
  if have docker-compose; then
    echo "docker-compose"
    return
  fi
  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reset) RESET=true; shift ;;
    --pnpm-store-prune) PNPM_STORE_PRUNE=true; shift ;;
    --docker-clean) DOCKER_CLEAN=true; shift ;;
    --reinstall) REINSTALL=true; shift ;;
    --quality-full) QUALITY_FULL=true; shift ;;
    --e2e-docker) E2E_DOCKER=true; shift ;;
    --all) QUALITY_FULL=true; E2E_DOCKER=true; shift ;;
    --help) usage; exit 0 ;;
    *) log "Unknown option: $1"; usage; exit 1 ;;
  esac
done

cd "$PROJECT_ROOT"

log "== Diabetify doctor =="
log "cwd: $PROJECT_ROOT"
log ""

log "== Versions =="
have mise && log "mise: $(mise --version)" || log "mise: (not found)"
have node && log "node: $(node --version)" || log "node: (not found)"
have pnpm && log "pnpm: $(pnpm --version)" || log "pnpm: (not found)"
have docker && log "docker: $(docker --version)" || log "docker: (not found)"
if have docker; then
  if docker compose version >/dev/null 2>&1; then
    log "docker compose: $(docker compose version | head -n1)"
  elif have docker-compose; then
    log "docker-compose: $(docker-compose --version)"
  else
    log "docker compose: (not found)"
  fi
fi
log ""

if [[ "$RESET" == "true" ]]; then
  log "== Reset workspace outputs =="
  ensure_writable_or_delete "playwright-report/data"
  ensure_writable_or_delete "playwright-report/trace"
  ensure_writable_or_delete "playwright/artifacts"
  rm -rf \
    node_modules \
    .angular \
    www \
    dist \
    coverage \
    junit.xml \
    test-results \
    playwright-report \
    playwright/artifacts \
    .turbo
  log "Reset done."
  log ""
fi

if [[ "$DOCKER_CLEAN" == "true" ]]; then
  log "== Docker clean (repo stacks) =="
  if ! have docker; then
    log "Docker not found; skipping."
  else
    COMPOSE="$(compose_cmd)" || { log "docker compose/docker-compose not found; skipping."; COMPOSE=""; }
    if [[ -n "$COMPOSE" ]]; then
      $COMPOSE -f docker/docker-compose.e2e.yml down -v --remove-orphans >/dev/null 2>&1 || true
      $COMPOSE -f docker/docker-compose.local.yml down -v --remove-orphans >/dev/null 2>&1 || true
      $COMPOSE -f docker/docker-compose.ci.yml down -v --remove-orphans >/dev/null 2>&1 || true
    fi
  fi
  log "Docker clean done."
  log ""
fi

if [[ "$PNPM_STORE_PRUNE" == "true" ]]; then
  log "== pnpm store prune =="
  pnpm store prune
  log ""
fi

if [[ "$REINSTALL" == "true" ]]; then
  log "== pnpm install =="
  pnpm install
  log ""
fi

if [[ "$QUALITY_FULL" == "true" ]]; then
  log "== quality:full =="
  pnpm -s run quality:full
  log ""
fi

if [[ "$E2E_DOCKER" == "true" ]]; then
  log "== e2e:docker =="
  pnpm -s run test:e2e:docker -- --clean
  log ""
fi

log "Done."
