# Codex Cloud Environments (Diabetactic)

Use this as a quick reference for configuring Codex Cloud environments for the Diabetactic repos.

## Recommended runtimes

- **Python services**: `python-3.10.12` (matches `runtime.txt` in each repo)
- **Diabetify**: Node + pnpm (use `corepack`)
- **Backoffice web**: Node + npm (use `npm ci`)

## Setup/Maintenance scripts (recommended)

Prefer calling the repo scripts directly (keeps UI config small and consistent).

### Python repos (appointments/login/glucoserver/api-gateway/api-gateway-backoffice)

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

**Optional verify**

```bash
set -euo pipefail
bash scripts/codex/verify.sh
```

### Backoffice web (`komod0/backoffice-web`)

**Setup/Maintenance**

```bash
set -euo pipefail
bash scripts/codex/setup.sh
```

### Diabetify (`komod0/diabetify-dev`)

**Setup/Maintenance**

```bash
set -euo pipefail
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install
```

## Existing environment IDs

From `codex cloud` → `o` (Set Env):

- `diabetactic/diabetify` → `68e99253d218819183ce0be48850aa19`
- `komod0/api-gateway` → `695a892264708191bc74c3df1037fd55`
- `komod0/appointments` → `695a8a5f6c1481918c986b2c2159510f`
- `komod0/backoffice-web` → `695a8bc215fc8191bc42801afd00d4b6`

## Missing environments to create

- `komod0/login`
- `komod0/glucoserver`
- `komod0/api-gateway-backoffice`
- `komod0/container-managing`

## Suggested env vars (safe defaults)

Only add what a given task needs.

### `komod0/api-gateway` and `komod0/api-gateway-backoffice`

- `USERS_BASE_URL=http://localhost:8003`
- `APPOINTMENTS_BASE_URL=http://localhost:8005`
- `GLUCOSERVER_BASE_URL=http://localhost:8002`
- `SECRET_KEY=dev-secret-key`

### `komod0/appointments`

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/appointments`

### `komod0/login`

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/users`
- `NOREPLY_ACCOUNT=noreply@example.invalid`
- `NOREPLY_PASSWORD=disabled`
- `BACKOFFICE_FRONT_URL=http://localhost:5173`

### `komod0/glucoserver`

- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/glucoserver`

### `komod0/backoffice-web`

- `VITE_API_BASE_URL=http://localhost:8006`
