# Quick Start Guide

Get Diabetify running in 5 minutes!

## Prerequisites

- Node.js 20+ (`node --version`)
- npm 10+ (`npm --version`)
- Git

## 1. Clone & Install (2 min)

```bash
git clone <repo-url>
cd diabetify
npm install
```

## 2. Start Development Server (1 min)

```bash
# Recommended: Mock backend (no external dependencies)
npm run start:mock

# Alternative: Cloud backend (requires internet)
npm run start:cloud
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
npm test
```

All 1012 tests should pass.

## Common Issues

### Port 4200 in use

```bash
npm start -- --port 4201
```

### Node version mismatch

```bash
nvm use 20  # or fnm use 20
```

### npm install fails

```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read [CLAUDE.md](../CLAUDE.md) for full documentation
- Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

## Key Commands

| Command              | Purpose                   |
| -------------------- | ------------------------- |
| `npm run start:mock` | Dev server with mock data |
| `npm test`           | Run unit tests            |
| `npm run lint`       | Check code style          |
| `npm run build:prod` | Production build          |
| `npm run test:e2e`   | E2E tests                 |
