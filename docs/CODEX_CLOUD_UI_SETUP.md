# Codex Cloud (Web UI) – Environment Setup Guide

This guide explains how to configure Codex Cloud environments from the **web UI** for the Diabetactic repos, using the repo-local scripts we added (so the UI config stays small and consistent).

> Note: UI labels change over time. If a button/menu name differs, use the closest equivalent (the intent is always: **select repo → configure environment runtimes → add setup/maintenance scripts → add env vars → run setup → verify**).

## Screenshot checklist (where to put them)

If you want this doc to be fully “click-through” later, save screenshots under:

- `docs/images/codex-cloud/`

Suggested filenames are included below at each step.

---

## What you will configure

For each repo environment, you will set:

- **Runtime(s)**
  - Python repos: **Python `3.10.12`**
  - Node repos: Node version as required by the repo (see below)
- **Setup script**: runs on a fresh environment
- **Maintenance script**: runs on an existing environment
- **Environment variables**: safe defaults for local-style wiring

### Repos and runtimes

**Python repos (set Python to `3.10.12`)**

- `komod0/api-gateway` (branch: `main`)
- `komod0/api-gateway-backoffice` (branch: `master`)
- `komod0/appointments` (branch: `main`)
- `komod0/login` (branch: `main`)
- `komod0/glucoserver` (branch: `master`)

**Node repos**

- `komod0/backoffice-web` (branch: `main`) → Node 20+ is fine
- `komod0/diabetify-dev` (branch varies) → use Node + `corepack` (pnpm)

---

## Step-by-step (Web UI)

### 1) Open Codex Cloud and select the repo

1. Open the Codex Cloud web UI in your browser.
2. Find the repo list (or search bar) and open the target repo (e.g., `komod0/login`).

**Screenshot to capture**

- Repo selection / repo landing page showing the repo name at the top.
  - Save as `docs/images/codex-cloud/01-repo-selected.png`

![Repo selected](images/codex-cloud/01-repo-selected.png)

---

### 2) Go to Environment settings

1. In the repo UI, open the section for **Environments** (or **Settings → Environment**).
2. If an environment already exists, open it.
3. If it does **not** exist, click **Create Environment** (or **New**).

**Screenshot to capture**

- Environment list (or “Create environment” dialog).
  - Save as `docs/images/codex-cloud/02-env-list-or-create.png`

![Environment list / create](images/codex-cloud/02-env-list-or-create.png)

---

### 3) Choose the default branch (if prompted)

If the UI asks which branch to attach:

- Use the repo’s default branch:
  - Most: `main`
  - Some: `master` (notably `api-gateway-backoffice`, `glucoserver`)

**Screenshot to capture**

- Branch selection UI showing the chosen branch.
  - Save as `docs/images/codex-cloud/03-branch-selection.png`

![Branch selection](images/codex-cloud/03-branch-selection.png)

---

### 4) Configure runtimes

#### Python repos

1. In the environment “Runtimes” section, enable **Python**.
2. Select **Python `3.10.12`**.

**Screenshot to capture**

- Runtimes section showing Python enabled and set to `3.10.12`.
  - Save as `docs/images/codex-cloud/04-runtime-python-3_10_12.png`

![Python runtime](images/codex-cloud/04-runtime-python-3_10_12.png)

#### Node repos

For `komod0/backoffice-web`:

1. Enable **Node**.
2. Choose Node 20+ (if you can pick a specific version, prefer **Node 20 LTS**).

For `komod0/diabetify-dev`:

1. Enable **Node**.
2. Use the repo’s Node expectations (often Node 22 for the Ionic/Angular app; if the UI offers LTS vs latest, prefer **latest stable** that matches your local `mise.toml`).

**Screenshot to capture**

- Runtimes section showing Node enabled and the chosen version.
  - Save as `docs/images/codex-cloud/05-runtime-node.png`

![Node runtime](images/codex-cloud/05-runtime-node.png)

---

### 5) Configure Setup / Maintenance scripts

#### Python repos (recommended: call repo scripts)

**Setup script**

```bash
set -euo pipefail
bash scripts/codex/setup.sh
```

**Maintenance script**

```bash
set -euo pipefail
bash scripts/codex/maintenance.sh
```

Optional verification command (run as a task when you want):

```bash
set -euo pipefail
bash scripts/codex/verify.sh
```

#### Backoffice web (`komod0/backoffice-web`)

**Setup / Maintenance**

```bash
set -euo pipefail
bash scripts/codex/setup.sh
```

#### Diabetify (`komod0/diabetify-dev`)

Use `corepack` to get the pinned `pnpm`:

**Setup / Maintenance**

```bash
set -euo pipefail
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install
```

**Screenshot to capture**

- The scripts section showing the final setup + maintenance scripts.
  - Save as `docs/images/codex-cloud/06-scripts.png`

![Scripts](images/codex-cloud/06-scripts.png)

---

### 6) Add environment variables (safe defaults)

Add only what you need for the tasks you’ll run. These defaults keep services “wired” like local Docker ports.

#### `komod0/api-gateway` and `komod0/api-gateway-backoffice`

- `USERS_BASE_URL=http://localhost:8003`
- `APPOINTMENTS_BASE_URL=http://localhost:8005`
- `GLUCOSERVER_BASE_URL=http://localhost:8002`
- `SECRET_KEY=dev-secret-key`

#### `komod0/appointments`

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appointments`

#### `komod0/login`

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/users`
- `NOREPLY_ACCOUNT=noreply@example.invalid`
- `NOREPLY_PASSWORD=disabled`
- `BACKOFFICE_FRONT_URL=http://localhost:5173`

#### `komod0/glucoserver`

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/glucoserver`

#### `komod0/backoffice-web`

- `VITE_API_BASE_URL=http://localhost:8006`

**Screenshot to capture**

- Env var table showing at least 1–2 vars added.
  - Save as `docs/images/codex-cloud/07-env-vars.png`

![Environment variables](images/codex-cloud/07-env-vars.png)

---

### 7) Save and run Setup

1. Click **Save** (or **Apply**).
2. Trigger the **Setup** run from the UI (some UIs run setup automatically on save; others have a “Run setup” button).
3. Watch the logs until it finishes.

**What “good” looks like**

- Setup ends successfully (green status).
- You see dependencies installed (Python wheels / npm packages).

**Screenshot to capture**

- Setup run logs ending in success (green).
  - Save as `docs/images/codex-cloud/08-setup-success.png`

![Setup success](images/codex-cloud/08-setup-success.png)

---

### 8) Verify quickly

After setup is green, run a small verification command.

#### Python repos

Run:

```bash
bash scripts/codex/verify.sh
```

#### Backoffice web

Run:

```bash
bash scripts/codex/verify.sh
```

#### Diabetify

Suggested quick check:

```bash
corepack enable
pnpm -v
```

**Screenshot to capture**

- The verify command output (success).
  - Save as `docs/images/codex-cloud/09-verify-success.png`

![Verify success](images/codex-cloud/09-verify-success.png)

---

## Troubleshooting

### “Setup fails while building asyncpg / missing longintrepr.h”

- This is almost always a **Python version mismatch**. Ensure the environment runtime is **Python `3.10.12`** for the Python repos.

### “Permission denied / weird cache issues”

- Re-run **Maintenance** once.
- If it persists, recreate the environment and run **Setup** again.

### “App import fails due to missing env vars”

- Ensure you added the repo’s required env vars (especially `DATABASE_URL`).
- Re-run **Maintenance** after adding env vars.

---

## Where the scripts live

These scripts are committed in each repo:

- Python repos: `scripts/codex/setup.sh`, `scripts/codex/maintenance.sh`, `scripts/codex/verify.sh`
- Backoffice web: same paths

---

## Reference (CLI help)

If the web UI is unclear about where a setting lives, the CLI can still tell you what exists and which env is currently selected:

- `codex cloud -h`
- `codex cloud help`
- `codex cloud status -h`
