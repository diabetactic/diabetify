#!/usr/bin/env zsh
# Script para:
#  1) Crear (o usar) un worktree de git para una branch dada.
#  2) Construir una imagen de Docker/Podman con Claude Code CLI + GitHub CLI + zsh.
#  3) Ejecutar Claude Code en un contenedor montando ese worktree.
#
# Uso:
#   ./ccdock.sh <branch> [ruta_worktree] [base_ref]
#
# Ejemplos:
#   ./ccdock.sh feature/api
#   ./ccdock.sh bugfix/login /tmp/mi-repo-bugfix
#   ./ccdock.sh feature/ui "../mi-repo-feature-ui" origin/main
#
# Notas:
#   - Ejecutar dentro del repo git principal.
#   - NO usa API key de Claude; login interactivo dentro del contenedor.
#   - Configs separadas y persistentes:
#       Claude Code -> ~/.claude_cc_container (host) -> /root/.claude        (container)
#       GitHub CLI  -> ~/.gh_cc_container      (host) -> /root/.config/gh    (container)

set -euo pipefail

# ===== Helpers =====

echo_err() {
  >&2 echo "[claude-worktree] $*"
}

usage() {
  cat <<EOF
Uso:
  $(basename "$0") <branch> [ruta_worktree] [base_ref]

  <branch>        Nombre de la branch a usar/crear (obligatorio).
  [ruta_worktree] Directorio donde se creará el worktree (opcional).
                  Por defecto: ../<nombre_repo>-<branch_sanitizada>
  [base_ref]      Ref base para crear la branch si no existe (opcional).
                  Por defecto: HEAD

Ejemplos:
  $(basename "$0") feature/api
  $(basename "$0") feature/ui "../mi-repo-feature-ui" origin/main
  $(basename "$0") bugfix/login /tmp/mi-repo-bugfix
EOF
}

# ===== Chequeos iniciales =====

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo_err "Este script debe ejecutarse dentro de un repositorio git."
  exit 1
fi

BRANCH="$1"
shift || true

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

REPO_NAME=$(basename "$REPO_ROOT")

sanitize_branch() {
  # Reemplaza caracteres raros por guiones bajos
  echo "$1" | sed 's#[^a-zA-Z0-9._-]#_#g'
}

BRANCH_SAFE=$(sanitize_branch "$BRANCH")

# Ruta del worktree
if [[ $# -ge 1 ]]; then
  WORKTREE_PATH="$1"
  shift || true
else
  WORKTREE_PATH="../${REPO_NAME}-${BRANCH_SAFE}"
fi

# Ref base
if [[ $# -ge 1 ]]; then
  BASE_REF="$1"
else
  BASE_REF="HEAD"
fi

# ===== Elegir motor de contenedores (docker/podman) =====

ENGINE=""
if command -v docker >/dev/null 2>&1; then
  ENGINE="docker"
elif command -v podman >/dev/null 2>&1; then
  ENGINE="podman"
else
  echo_err "No se encontró ni docker ni podman en el sistema. Instala uno."
  exit 1
fi

echo_err "Usando motor de contenedores: $ENGINE"

# ===== Crear o usar worktree =====

if [[ -d "$WORKTREE_PATH" ]]; then
  echo_err "El directorio de worktree ya existe: $WORKTREE_PATH"
  echo_err "No se modificará. Usando el existente."
else
  echo_err "Creando worktree en: $WORKTREE_PATH"
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo_err "La branch '$BRANCH' ya existe. Creando worktree con esa branch."
    git worktree add "$WORKTREE_PATH" "$BRANCH"
  else
    echo_err "La branch '$BRANCH' no existe. Creando branch nueva desde '$BASE_REF'."
    git worktree add -b "$BRANCH" "$WORKTREE_PATH" "$BASE_REF"
  fi
fi

cd "$WORKTREE_PATH"

# ===== Dockerfile e imagen de Claude Code + gh =====

DOCKERFILE_NAME=".claude-code.Dockerfile"
IMAGE_NAME="claude-code-cli:latest"

# Siempre regeneramos el Dockerfile para asegurar que tenga zsh y dependencias actualizadas
echo_err "Generando/Actualizando Dockerfile para Claude Code: $DOCKERFILE_NAME"
cat > "$DOCKERFILE_NAME" <<'EOF'
FROM node:22-bookworm

# Paquetes básicos, git, zsh y herramientas para instalar GitHub CLI
RUN apt-get update && apt-get install -y \
    git \
    bash \
    zsh \
    ca-certificates \
    curl \
    gnupg \
    vim \
  && rm -rf /var/lib/apt/lists/*

# Instalar GitHub CLI desde el repo oficial
RUN mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
     | gpg --dearmor -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
     > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update \
  && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Instalar Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /workspace

# Por defecto claude, pero se puede sobreescribir
CMD ["claude"]
EOF

# Construir imagen siempre (Docker cacheará si no hay cambios)
echo_err "Asegurando imagen $IMAGE_NAME..."
$ENGINE build -f "$DOCKERFILE_NAME" -t "$IMAGE_NAME" "$WORKTREE_PATH"

# ===== Directorios de config (Claude + gh) separados y persistentes =====

CLAUDE_DIR="$HOME/.claude_cc_container"
GH_DIR="$HOME/.gh_cc_container"

mkdir -p "$CLAUDE_DIR" "$GH_DIR"

CONTAINER_NAME="cc-${BRANCH_SAFE}"

echo_err "Lanzando contenedor '$CONTAINER_NAME' con Claude Code en worktree: $WORKTREE_PATH"
echo_err "Dentro del contenedor:"
echo_err "  - primera vez: ejecutá 'claude' -> login interactivo."
echo_err "  - para GitHub: 'gh auth login' y opcionalmente 'gh auth setup-git'."
echo_err ""
echo_err "TIP: Para abrir una shell (zsh) en este contenedor desde otra terminal:"
echo_err "  $ENGINE exec -it $CONTAINER_NAME zsh"

# Limpiar contenedor anterior si quedó huerfano
$ENGINE rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

# ===== Ejecutar contenedor =====

$ENGINE run --rm -it \
  --name "$CONTAINER_NAME" \
  -v "$WORKTREE_PATH":/workspace \
  -v "$CLAUDE_DIR":/root/.claude \
  -v "$GH_DIR":/root/.config/gh \
  -w /workspace \
  "$IMAGE_NAME"