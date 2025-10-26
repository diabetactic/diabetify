#!/usr/bin/env bash
set -euo pipefail

# Colores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*"; exit 1; }
info() { echo -e "${CYAN}ℹ${NC} $*"; }

clear
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║      🚀 CONFIGURACIÓN COMPLETA DE ENTORNO DE DESARROLLO      ║
║                                                              ║
║  • mise (gestor universal de versiones)                     ║
║  • Herramientas CLI modernas (eza, bat, fzf, zoxide, etc)   ║
║  • Claude CLI + Codex CLI + Gemini CLI                      ║
║  • Oh My Zsh + Powerlevel10k                                ║
║  • Utilidades adicionales (hr, navi, bd, emojify, mcpm)     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo ""

# === 1. RESPALDO DE CONFIGURACIÓN EXISTENTE ===
log "Creando respaldo de configuración existente..."
backup_dir="$HOME/dotfiles_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"
for file in .bashrc .zshrc .zshenv .bash_profile .profile .tool-versions; do
    [ -f "$HOME/$file" ] && cp "$HOME/$file" "$backup_dir/" && warn "Backup: $file"
done
success "Configuración respaldada en $backup_dir"

# === 2. ACTUALIZACIÓN DEL SISTEMA ===
log "Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# === 3. INSTALACIÓN DE DEPENDENCIAS BASE ===
log "Instalando herramientas esenciales..."
sudo apt install -y \
    build-essential curl git wget unzip zip tar \
    pkg-config libssl-dev libsqlite3-dev \
    libbz2-dev libreadline-dev libncurses5-dev libncursesw5-dev \
    libffi-dev liblzma-dev zlib1g-dev \
    zsh tmux htop jq tree ncdu xclip \
    locales language-pack-es python3-pip

# Configurar locales en español
log "Configurando locale en español..."
sudo locale-gen es_ES.UTF-8
sudo locale-gen es_AR.UTF-8
sudo update-locale LANG=es_ES.UTF-8

# === 4. INSTALACIÓN DE MICRO EDITOR ===
if ! command -v micro &>/dev/null; then
    log "Instalando micro editor..."
    cd /tmp
    curl https://getmic.ro | bash
    sudo mv micro /usr/local/bin/
    chmod +x /usr/local/bin/micro
    cd - >/dev/null
    success "micro instalado"
fi

# === 5. INSTALACIÓN DE HERRAMIENTAS CLI MODERNAS ===
log "Instalando herramientas CLI modernas..."

# fzf
if [ ! -d "$HOME/.fzf" ]; then
    info "Instalando fzf..."
    git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
    ~/.fzf/install --key-bindings --completion --no-update-rc
    success "fzf instalado"
fi

# ripgrep, fd-find, bat
sudo apt install -y ripgrep fd-find bat 2>/dev/null || true

# Crear symlinks
command -v fd >/dev/null 2>&1 || sudo ln -sf "$(command -v fdfind)" /usr/local/bin/fd
command -v bat >/dev/null 2>&1 || sudo ln -sf "$(command -v batcat)" /usr/local/bin/bat

# eza (reemplazo moderno de ls)
if ! command -v eza &>/dev/null; then
    info "Instalando eza..."
    wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
    echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
    sudo chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
    sudo apt update && sudo apt install -y eza
    success "eza instalado"
fi

# zoxide (smart cd)
if ! command -v zoxide &>/dev/null; then
    info "Instalando zoxide..."
    curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash
    success "zoxide instalado"
fi

# === 6. UTILIDADES ADICIONALES ===
log "Instalando utilidades adicionales..."

# hr - horizontal rule
if ! command -v hr &>/dev/null; then
    info "Instalando hr (horizontal rule)..."
    cd /tmp
    git clone https://github.com/LuRsT/hr.git
    cd hr
    sudo make install
    cd - >/dev/null
    rm -rf /tmp/hr
    success "hr instalado"
fi

# navi - cheatsheet interactivo
if ! command -v navi &>/dev/null; then
    info "Instalando navi..."
    bash <(curl -sL https://raw.githubusercontent.com/denisidoro/navi/master/scripts/install)
    success "navi instalado"
fi

# bd - back to parent directory
if [ ! -f "$HOME/bin/bd" ]; then
    info "Instalando bd..."
    mkdir -p "$HOME/bin"
    wget -O "$HOME/bin/bd" https://raw.githubusercontent.com/vigneshwaranr/bd/master/bd
    chmod +x "$HOME/bin/bd"
    success "bd instalado"
fi

# emojify
if ! command -v emojify &>/dev/null; then
    info "Instalando emojify..."
    sudo wget -O /usr/local/bin/emojify https://raw.githubusercontent.com/mrowa44/emojify/master/emojify
    sudo chmod +x /usr/local/bin/emojify
    success "emojify instalado"
fi

# mcpm.sh - MCP Manager
if [ ! -f "$HOME/bin/mcpm" ]; then
    info "Instalando mcpm (MCP Manager)..."
    mkdir -p "$HOME/bin"
    wget -O "$HOME/bin/mcpm" https://raw.githubusercontent.com/pathintegral-institute/mcpm.sh/main/mcpm.sh
    chmod +x "$HOME/bin/mcpm"
    success "mcpm instalado"
fi

# === 7. MISE - GESTOR UNIVERSAL DE VERSIONES ===
log "Instalando mise (gestor universal de versiones)..."
if ! command -v mise &>/dev/null; then
    curl https://mise.run | sh
    export PATH="$HOME/.local/bin:$PATH"
    success "mise instalado"
else
    info "mise ya está instalado"
fi

# Verificar instalación de mise
if ! command -v mise &>/dev/null; then
    error "mise no se instaló correctamente"
fi

# Instalar runtimes con mise
log "Instalando runtimes con mise..."
mise install node@lts
mise install python@latest
mise install rust@latest
mise install go@latest
mise use -g node@lts python@latest rust@latest go@latest
success "Runtimes instalados con mise"

# === 8. RUST ADICIONAL (para cargo) ===
if ! command -v rustc &>/dev/null; then
    info "Instalando Rust adicional..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    source "$HOME/.cargo/env"
    success "Rust instalado"
fi

# === 9. BUN ===
if ! command -v bun &>/dev/null; then
    info "Instalando Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    success "Bun instalado"
fi

# === 10. CONFIGURACIÓN NPM GLOBAL ===
log "Configurando npm global..."
mkdir -p "$HOME/.npm-global"
mise exec -- npm config set prefix "$HOME/.npm-global"

# === 11. INSTALACIÓN DE CLIs DE AI ===
log "Instalando CLIs de AI (Claude, Codex, Gemini)..."

# Claude CLI
if ! command -v claude &>/dev/null; then
    info "Instalando Claude CLI..."
    mise exec -- npm install -g @anthropic-ai/claude-code
    success "Claude CLI instalado"
fi

# Codex CLI (OpenAI)
if ! command -v codex &>/dev/null; then
    info "Instalando Codex CLI (OpenAI)..."
    mise exec -- npm install -g @openai/codex-cli
    success "Codex CLI instalado"
fi

# Gemini CLI
if ! command -v gemini &>/dev/null; then
    info "Instalando Gemini CLI..."
    pip3 install --user google-generativeai gemini-cli
    success "Gemini CLI instalado"
fi

# Otras herramientas npm globales
info "Instalando herramientas npm adicionales..."
mise exec -- npm install -g \
    @microsoft/inshellisense \
    pnpm \
    yarn

# === 12. OH MY ZSH Y PLUGINS ===
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    log "Instalando Oh My Zsh..."
    RUNZSH=no CHSH=no sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
    success "Oh My Zsh instalado"
fi

ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"

# Powerlevel10k
if [ ! -d "$ZSH_CUSTOM/themes/powerlevel10k" ]; then
    info "Instalando Powerlevel10k..."
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$ZSH_CUSTOM/themes/powerlevel10k"
    success "Powerlevel10k instalado"
fi

# Plugins
[ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ] && \
    git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions"

[ ! -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ] && \
    git clone https://github.com/zsh-users/zsh-syntax-highlighting "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting"

[ ! -d "$ZSH_CUSTOM/plugins/zsh-completions" ] && \
    git clone https://github.com/zsh-users/zsh-completions "$ZSH_CUSTOM/plugins/zsh-completions"

success "Plugins de Zsh instalados"

# === 13. ATUIN (Better History) ===
if ! command -v atuin &>/dev/null; then
    info "Instalando Atuin..."
    bash <(curl --proto '=https' --tlsv1.2 -sSf https://setup.atuin.sh)
    success "Atuin instalado"
fi

# === 14. DIRENV ===
sudo apt install -y direnv 2>/dev/null || true

# === 15. CREAR .tool-versions (para mise) ===
log "Creando archivos de configuración..."
cat > "$HOME/.tool-versions" << 'TOOL_VERSIONS_EOF'
node lts
python latest
rust latest
go latest
TOOL_VERSIONS_EOF

# === 16. CREAR .zshenv ===
cat > "$HOME/.zshenv" << 'ZSHENV_EOF'
# XDG Base Directory Specification
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
export XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"

# Locale en español
export LANG=es_ES.UTF-8
export LC_ALL=es_ES.UTF-8

# Editor
export EDITOR=micro
export VISUAL=micro

# PATH - ORDEN CRÍTICO: locales primero, luego sistema
typeset -U path  # Remove duplicates
path=(
    "$HOME/.local/bin"
    "$HOME/.npm-global/bin"
    "$HOME/.cargo/bin"
    "$HOME/.bun/bin"
    "$HOME/bin"
    "$HOME/.local/share/pnpm"
    $path
)
export PATH
ZSHENV_EOF

# === 17. CREAR .zshrc ===
cat > "$HOME/.zshrc" << 'ZSHRC_EOF'
# Enable Powerlevel10k instant prompt
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# Performance optimizations
DISABLE_AUTO_UPDATE="true"
DISABLE_MAGIC_FUNCTIONS="true"
ZSH_DISABLE_COMPFIX="true"

# Oh My Zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="powerlevel10k/powerlevel10k"

plugins=(
    git
    docker
    docker-compose
    kubectl
    npm
    node
    rust
    python
    fzf
    zsh-autosuggestions
    zsh-syntax-highlighting
    zsh-completions
)

source "$ZSH/oh-my-zsh.sh"

# === MISE - GESTOR UNIVERSAL DE VERSIONES ===
eval "$(mise activate zsh)"

# === TOOL INTEGRATIONS ===

# fzf
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
export FZF_ALT_C_COMMAND='fd --type d --hidden --follow --exclude .git'

# Cyberpunk theme for fzf
fg="#CBE0F0"; bg="#011423"; purple="#B388FF"; cyan="#2CF9ED"
export FZF_DEFAULT_OPTS="--color=fg:${fg},bg:${bg},hl:${purple},fg+:${cyan},bg+:#033259,hl+:${purple},info:${cyan},prompt:${cyan},pointer:${cyan},marker:${purple},spinner:${cyan},header:${purple}"

# zoxide
eval "$(zoxide init zsh)"

# direnv
eval "$(direnv hook zsh)"

# atuin
if command -v atuin &>/dev/null; then
    eval "$(atuin init zsh --disable-up-arrow)"
fi

# navi widget
if command -v navi &>/dev/null; then
    eval "$(navi widget zsh)"
fi

# bd - quick parent directory navigation
if [ -f "$HOME/bin/bd" ]; then
    alias bd=". $HOME/bin/bd -si"
fi

# pnpm
export PNPM_HOME="$XDG_DATA_HOME/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# Bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
[ -s "$BUN_INSTALL/_bun" ] && source "$BUN_INSTALL/_bun"

# inshellisense
[[ -f ~/.inshellisense/zsh/init.zsh ]] && source ~/.inshellisense/zsh/init.zsh

# === ALIASES ===

# Herramientas modernas
alias ls='eza --color=always --icons --group-directories-first'
alias ll='eza -la --color=always --icons --group-directories-first --git'
alias lt='eza --tree --level=2 --color=always --icons'
alias cat='bat --style=auto'
alias grep='rg'
alias find='fd'
alias cd='z'

# Git shortcuts
alias gs='git status -sb'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gd='git diff'
alias gco='git checkout'
alias glog='git log --oneline --graph --decorate'

# mise shortcuts
alias msl='mise ls'
alias msi='mise install'
alias msu='mise use'
alias msup='mise upgrade'

# AI CLIs
alias ask-claude='claude'
alias ask-codex='codex'
alias ask-gemini='gemini'

# Utilidades
alias separator='hr'
alias cheat='navi'

# === FUNCTIONS ===

# Mostrar PATH en formato legible
show-path() {
    echo "$PATH" | tr ':' '\n' | nl
}

# Agregar directorio al PATH (sesión + persistente)
add-to-path() {
    if [[ $# -eq 0 ]]; then
        echo "Uso: add-to-path <directorio>"
        return 1
    fi

    local new_dir="${1/#\~/$HOME}"
    
    if [[ ! -d "$new_dir" ]]; then
        echo "Error: El directorio no existe: $new_dir"
        return 1
    fi

    new_dir="$(cd "$new_dir" && pwd)"

    if [[ ":$PATH:" == *":$new_dir:"* ]]; then
        echo "Ya está en PATH: $new_dir"
        return 0
    fi

    export PATH="$new_dir:$PATH"
    echo "✓ Agregado al PATH: $new_dir"
    
    # Agregar a .zshenv para persistencia
    if ! grep -q "path+=.*$new_dir" "$HOME/.zshenv" 2>/dev/null; then
        echo "path+=('$new_dir')" >> "$HOME/.zshenv"
        echo "✓ Guardado en .zshenv"
    fi
}

# Eliminar directorio del PATH
remove-from-path() {
    if [[ $# -eq 0 ]]; then
        echo "Uso: remove-from-path <directorio>"
        return 1
    fi
    
    local dir_to_remove="${1/#\~/$HOME}"
    export PATH=$(echo "$PATH" | sed -e "s|:$dir_to_remove||g" -e "s|$dir_to_remove:||g")
    echo "✓ Eliminado del PATH: $dir_to_remove"
}

# Clonar repo y entrar al directorio
gccd() {
    if [[ -z "$1" ]]; then
        echo "Uso: gccd <repo-url> [directorio]"
        return 1
    fi
    
    local repo="$1"
    local dir="${2:-$(basename "$repo" .git)}"
    
    git clone "$repo" "$dir" && cd "$dir"
}

# Crear directorio y entrar
mkcd() {
    mkdir -p "$1" && cd "$1"
}

# Actualizar mise y todos los runtimes
mise-update() {
    echo "Actualizando mise..."
    mise self-update
    echo "Actualizando runtimes..."
    mise upgrade
    echo "✓ Actualización completa"
}

# Actualizar todo el sistema
update-all() {
    echo "🔄 Actualizando sistema completo..."
    hr "="
    
    echo "📦 APT..."
    sudo apt update && sudo apt upgrade -y
    
    echo "🦀 Rust..."
    rustup update
    
    echo "📊 mise..."
    mise self-update && mise upgrade
    
    echo "🔧 Oh My Zsh..."
    omz update
    
    echo "🔮 Atuin..."
    command -v atuin &>/dev/null && atuin self-update || true
    
    hr "="
    echo "✅ Todo actualizado!"
}

# Quick AI assistant
ask() {
    local provider="${1:-claude}"
    shift
    
    case "$provider" in
        claude|c)
            claude "$@"
            ;;
        codex|openai|o)
            codex "$@"
            ;;
        gemini|g)
            gemini "$@"
            ;;
        *)
            echo "Uso: ask [claude|codex|gemini] <pregunta>"
            echo "Proveedores: claude (c), codex/openai (o), gemini (g)"
            return 1
            ;;
    esac
}

# Crear separador visual bonito
sep() {
    local char="${1:-─}"
    hr "$char"
}

# Powerlevel10k configuration
[[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh
ZSHRC_EOF

# === 18. CREAR .bashrc ===
cat > "$HOME/.bashrc" << 'BASHRC_EOF'
# ~/.bashrc: executed by bash(1) for non-login shells.

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# === ENVIRONMENT ===
export LANG=es_ES.UTF-8
export LC_ALL=es_ES.UTF-8
export EDITOR=micro
export VISUAL=micro

# === PATH ===
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$HOME/.cargo/bin:$HOME/.bun/bin:$HOME/bin:$PATH"

# === HISTORY ===
HISTCONTROL=ignoreboth:erasedups
HISTSIZE=10000
HISTFILESIZE=20000
HISTTIMEFORMAT="%F %T "
shopt -s histappend

# === SHELL OPTIONS ===
shopt -s checkwinsize
shopt -s globstar
shopt -s cdspell
shopt -s dirspell

# === PROMPT ===
if [ -x /usr/bin/tput ] && tput setaf 1 >&/dev/null; then
    PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
else
    PS1='\u@\h:\w\$ '
fi

case "$TERM" in
xterm*|rxvt*)
    PS1="\[\e]0;\u@\h: \w\a\]$PS1"
    ;;
esac

# === COLORS ===
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    alias grep='grep --color=auto'
fi

# === ALIASES ===
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias separator='hr'
alias cheat='navi'

# bd
[ -f "$HOME/bin/bd" ] && alias bd=". $HOME/bin/bd -si"

# === COMPLETION ===
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

# === MISE - GESTOR UNIVERSAL DE VERSIONES ===
eval "$(mise activate bash)"

# === TOOL INTEGRATIONS ===

# Bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# fzf
[ -f ~/.fzf.bash ] && source ~/.fzf.bash

# zoxide
eval "$(zoxide init bash)"

# atuin
if command -v atuin &>/dev/null; then
    [ -f ~/.bash-preexec.sh ] && source ~/.bash-preexec.sh
    eval "$(atuin init bash)"
fi

# navi
command -v navi &>/dev/null && eval "$(navi widget bash)"

# inshellisense
[ -f ~/.inshellisense/bash/init.sh ] && source ~/.inshellisense/bash/init.sh

# === FUNCTIONS ===
show-path() {
    echo "$PATH" | tr ':' '\n' | nl
}

add-to-path() {
    if [[ $# -eq 0 ]]; then
        echo "Uso: add-to-path <directorio>"
        return 1
    fi
    
    local dir="${1/#\~/$HOME}"
    dir="$(cd "$dir" 2>/dev/null && pwd)" || {
        echo "Error: El directorio no existe: $1"
        return 1
    }
    
    if [[ ":$PATH:" != *":$dir:"* ]]; then
        export PATH="$dir:$PATH"
        echo "✓ Agregado al PATH: $dir"
    else
        echo "Ya está en PATH: $dir"
    fi
}

ask() {
    local provider="${1:-claude}"
    shift
    
    case "$provider" in
        claude|c) claude "$@" ;;
        codex|openai|o) codex "$@" ;;
        gemini|g) gemini "$@" ;;
        *)
            echo "Uso: ask [claude|codex|gemini] <pregunta>"
            return 1
            ;;
    esac
}
BASHRC_EOF

# === 19. CONFIGURACIÓN DE MICRO ===
log "Configurando micro editor..."
mkdir -p "$HOME/.config/micro"
cat > "$HOME/.config/micro/settings.json" << 'MICRO_EOF'
{
    "autoindent": true,
    "autosu": true,
    "colorscheme": "monokai",
    "cursorline": true,
    "ignorecase": true,
    "scrollbar": true,
    "tabsize": 4,
    "tabstospaces": true,
    "syntax": true,
    "saveundo": true,
    "autosave": 10
}
MICRO_EOF

# === 20. CREAR CHEATSHEET PERSONALIZADO PARA NAVI ===
mkdir -p "$HOME/.local/share/navi/cheats"
cat > "$HOME/.local/share/navi/cheats/personal.cheat" << 'NAVI_EOF'
% mise, gestión de versiones

# Listar versiones instaladas
mise ls

# Instalar una versión específica
mise install <runtime>@<version>

# Usar versión globalmente
mise use -g <runtime>@<version>

# Actualizar todos los runtimes
mise upgrade

# Ver diagnóstico
mise doctor

$ runtime: echo "node python rust go" | tr ' ' '\n'

% git, control de versiones

# Estado resumido
git status -sb

# Ver commits en una línea
git log --oneline --graph --decorate -20

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1

# Ver diferencias del último commit
git diff HEAD~1

% ai, asistentes de inteligencia artificial

# Preguntar a Claude
claude "<pregunta>"

# Preguntar a Codex (OpenAI)
codex "<pregunta>"

# Preguntar a Gemini
gemini "<pregunta>"

# Usar función ask (por defecto Claude)
ask "<pregunta>"

% utilidades, herramientas útiles

# Crear separador visual
hr

# Volver a directorio padre
bd <directorio>

# Emojificar texto
echo "<texto>" | emojify

# Gestión de MCP
mcpm list
mcpm install <servidor>
NAVI_EOF

# === 21. CAMBIAR SHELL A ZSH ===
if [ "$SHELL" != "$(which zsh)" ]; then
    log "Cambiando shell predeterminado a zsh..."
    chsh -s "$(which zsh)" || warn "No se pudo cambiar el shell. Ejecuta: chsh -s \$(which zsh)"
fi

# === 22. MENSAJE FINAL ===
clear
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║             ✅ CONFIGURACIÓN COMPLETADA CON ÉXITO            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 PRÓXIMOS PASOS${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  1️⃣  Reinicia tu terminal o ejecuta: ${CYAN}exec zsh${NC}"
echo "  2️⃣  Configura Powerlevel10k: ${CYAN}p10k configure${NC}"
echo "  3️⃣  Verifica mise: ${CYAN}mise doctor${NC}"
echo "  4️⃣  Verifica Claude CLI: ${CYAN}claude --version${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🚀 COMANDOS ÚTILES DE MISE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  ${CYAN}mise ls${NC}                    Ver versiones instaladas"
echo "  ${CYAN}mise install node@20${NC}       Instalar Node.js 20"
echo "  ${CYAN}mise use -g node@20${NC}        Usar Node.js 20 globalmente"
echo "  ${CYAN}mise upgrade${NC}               Actualizar todos los runtimes"
echo "  ${CYAN}mise doctor${NC}                Diagnóstico del sistema"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🤖 CLIs DE INTELIGENCIA ARTIFICIAL${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  ${MAGENTA}Claude:${NC}  ${CYAN}claude \"¿Cómo hacer X?\"${NC}"
echo "  ${MAGENTA}Codex:${NC}   ${CYAN}codex \"¿Cómo hacer Y?\"${NC}"
echo "  ${MAGENTA}Gemini:${NC}  ${CYAN}gemini \"¿Cómo hacer Z?\"${NC}"
echo "  ${MAGENTA}Rápido:${NC}  ${CYAN}ask \"pregunta\"${NC} (usa Claude por defecto)"
echo "  ${MAGENTA}Rápido:${NC}  ${CYAN}ask codex \"pregunta\"${NC} (especifica proveedor)"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🛠️  HERRAMIENTAS INSTALADAS${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

tools_check=(
    "mise:Gestor universal de versiones"
    "micro:Editor de texto moderno"
    "fzf:Fuzzy finder"
    "rg:ripgrep (grep mejorado)"
    "fd:find mejorado"
    "bat:cat con syntax highlighting"
    "eza:ls moderno"
    "zoxide:cd inteligente"
    "atuin:Historial mejorado"
    "hr:Separadores visuales"
    "navi:Cheatsheets interactivos"
    "bd:Navegación rápida a padres"
    "emojify:Emojis en terminal"
    "mcpm:MCP Manager"
    "claude:Claude AI CLI"
)

for tool_info in "${tools_check[@]}"; do
    tool="${tool_info%%:*}"
    desc="${tool_info#*:}"
    if command -v "$tool" &>/dev/null; then
        echo "  ${GREEN}✓${NC} ${CYAN}$tool${NC} - $desc"
    fi
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📚 TIPS${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  • Usa ${CYAN}cheat${NC} o ${CYAN}navi${NC} para ver cheatsheets interactivos"
echo "  • Usa ${CYAN}Ctrl+R${NC} con atuin para buscar en historial"
echo "  • Usa ${CYAN}separator${NC} o ${CYAN}hr${NC} para crear líneas divisoras"
echo "  • Usa ${CYAN}bd directorio${NC} para volver rápido a directorios padres"
echo "  • Usa ${CYAN}z${NC} en vez de ${CYAN}cd${NC} para navegar más rápido"
echo "  • Configura tus API keys para los CLIs de AI en sus respectivos archivos"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ℹ️  INFORMACIÓN${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  ${MAGENTA}Backup:${NC}      $backup_dir"
echo "  ${MAGENTA}Editor:${NC}      micro"
echo "  ${MAGENTA}Locale:${NC}      es_ES.UTF-8"
echo "  ${MAGENTA}Shell:${NC}       zsh + Oh My Zsh + Powerlevel10k"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}¡Disfruta de tu nuevo entorno de desarrollo! 🚀${NC}"
echo ""