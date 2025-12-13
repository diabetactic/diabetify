# Quick Start Guide

Get Diabetify running in 5 minutes!

## Prerequisites

- Node.js 20+ (`node --version`)
- pnpm 10+ (recommended) or npm 10+
- Git

**Install pnpm globally** (recommended for 3x faster installs):

```bash
npm install -g pnpm@latest
```

## 1. Clone & Install (2 min)

```bash
git clone <repo-url>
cd diabetify

# With pnpm (recommended - 3x faster)
pnpm install

# Or with npm (still works)
npm install
```

**Note**: First install downloads dependencies (~500MB). Subsequent installs with pnpm are instant thanks to Turborepo caching.

## 2. Start Development Server (1 min)

```bash
# Recommended: Mock backend (no external dependencies)
pnpm run start:mock

# Alternative: Cloud backend (requires internet)
pnpm run start:cloud
```

Open http://localhost:4200

## 3. Login (30 sec)

Use test credentials:

- **User ID:** `1000`
- **Password:** `tuvieja`

## 4. Verify Everything Works

You should see:

- ✅ Dashboard with glucose stats
- ✅ Readings list
- ✅ Appointments section
- ✅ Profile page

## 5. Run Tests (1 min)

```bash
pnpm test
```

All 2060+ tests should pass.

**Turborepo Caching**: If you run tests again without changing files, results are cached and complete instantly.

## Common Issues

### Port 4200 in use

```bash
npm start -- --port 4201
```

### Node version mismatch

```bash
nvm use 20  # or fnm use 20
```

### pnpm/npm install fails

```bash
# With pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm install

# With npm
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read [CLAUDE.md](../CLAUDE.md) for full documentation
- Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

## Key Commands

**Note**: Use `pnpm` for faster execution. All commands also work with `npm`.

| Command               | Purpose                   |
| --------------------- | ------------------------- |
| `pnpm run start:mock` | Dev server with mock data |
| `pnpm test`           | Run unit tests            |
| `pnpm run lint`       | Check code style          |
| `pnpm run build:prod` | Production build          |
| `pnpm run test:e2e`   | E2E tests                 |
