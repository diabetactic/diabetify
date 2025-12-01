# Backend Mode Configuration Guide

Diabetactic supports three backend modes to accommodate different development and deployment scenarios. This guide explains how to switch between them and verify which mode is active.

---

## Overview of Backend Modes

The app supports three backend modes:

1. **`mock`** - In-memory mock adapter, no backend required
2. **`local`** - Local Docker backend at localhost:8000
3. **`cloud`** (alias: `heroku`) - Heroku API Gateway (production)

### When to Use Each Mode

**Mock Mode** (`mock`)

- Use for: Fast development, offline work, unit testing
- Backend: None required (in-memory data)
- Data: Temporary, reset on app restart
- Tidepool: Mock integration (no real Tidepool connection)

**Local Mode** (`local`)

- Use for: Full-stack development, Docker Compose testing
- Backend: Docker Compose with extServices running on localhost:8000
- Data: Persists in local PostgreSQL
- Tidepool: Can connect to real Tidepool API (optional)

**Cloud Mode** (`cloud` or `heroku`)

- Use for: Integration testing, production validation
- Backend: Heroku API Gateway at https://diabetactic-api-gateway-37949d6f182f.herokuapp.com
- Data: Persists in Heroku PostgreSQL
- Tidepool: Full integration with Tidepool API

---

## Switching Between Modes

### Using npm Scripts (Recommended)

The easiest way to switch modes is using the provided npm scripts:

```bash
# Mock mode - in-memory data, no backend required
npm run start:mock

# Local mode - Docker backend at localhost:8000
npm run start:local

# Cloud mode - Heroku production API
npm run start:cloud
```

### Using ENV Variable

You can also use the `ENV` variable directly:

```bash
# Mock mode
ENV=mock npm start

# Local mode
ENV=local npm start

# Cloud mode (both work)
ENV=cloud npm start
ENV=heroku npm start
```

### Default Mode

If no `ENV` variable is specified:

```bash
npm start  # Defaults to 'mock' mode
```

The default is configured in `scripts/start-with-env.mjs` (line 20):

```javascript
const envMode = (process.env.ENV || 'mock').toLowerCase();
```

---

## Configuration Details

### Environment Configuration File

The backend mode is primarily configured in `src/environments/environment.ts`:

```typescript
const DEV_BACKEND_MODE: BackendMode = 'cloud';
```

However, this hardcoded value is **overridden** by the `ENV` variable when using `npm start`.

### How the ENV Variable Works

The `scripts/start-with-env.mjs` script:

1. Reads the `ENV` environment variable
2. Maps it to the appropriate API Gateway URL:
   - `mock` → No URL (empty string)
   - `local` → `http://localhost:8000`
   - `cloud`/`heroku` → `https://diabetactic-api-gateway-37949d6f182f.herokuapp.com`
3. Sets `API_GATEWAY_URL` environment variable
4. Launches Angular dev server with the correct configuration

### Platform-Specific URLs

The app handles platform differences automatically:

**Web Development (Browser)**

- `mock` → No backend
- `local` → `http://localhost:8000`
- `cloud` → `/api` (uses proxy.conf.json to avoid CORS)

**Android Native**

- `mock` → No backend
- `local` → `http://10.0.2.2:8000` (Android emulator localhost)
- `cloud` → Direct Heroku URL

**iOS Native**

- `mock` → No backend
- `local` → `http://localhost:8000`
- `cloud` → Direct Heroku URL

---

## Verifying Active Backend Mode

### Console Logs

When the app starts, check the terminal output:

```bash
[dev] ENV=mock → API_GATEWAY_URL=(mock mode) (ng serve --configuration mock --proxy-config proxy.conf.json)
```

This shows:

- Current ENV mode
- API Gateway URL (or "mock mode" if using mock)
- Angular configuration being used

### Browser DevTools

Open the browser console and check for environment logs. The app logs configuration on startup.

You can also inspect the environment object:

```javascript
// In browser console
import { environment } from './environments/environment';
console.log('Backend Mode:', environment.backendMode);
console.log('API Gateway URL:', environment.backendServices.apiGateway.baseUrl);
```

### Network Tab

Watch the Network tab in browser DevTools:

- **Mock mode**: No HTTP requests to backend services
- **Local mode**: Requests to `localhost:8000` or `/api` (proxied to localhost)
- **Cloud mode**: Requests to `/api` (proxied to Heroku) or direct Heroku URL

---

## Production Builds

Production builds always use cloud/Heroku backend:

```bash
# Production build
npm run build:prod  # Always uses cloud mode

# Mobile builds (always production)
npm run mobile:sync
npm run mobile:build
```

Production is configured in `src/environments/environment.prod.ts` with `production: true` and cloud backend URLs.

---

## Testing Configuration

### Unit Tests

Unit tests (Jest) should always use mock mode to avoid hitting real APIs. This is configured in the test environment.

```bash
npm test              # Uses mock mode
npm run test:watch    # Uses mock mode
npm run test:coverage # Uses mock mode
```

### Integration Tests

Integration tests may use any backend mode:

```bash
# Integration tests against cloud backend
ENV=cloud npm run test:integration

# Integration tests against local backend
ENV=local npm run test:integration
```

### E2E Tests

E2E tests (Playwright) can be configured to use any backend:

```bash
# E2E with mock backend
ENV=mock npm run test:e2e

# E2E with local backend (Docker must be running)
ENV=local npm run test:e2e

# E2E with cloud backend
ENV=cloud npm run test:e2e
```

---

## Common Scenarios

### Scenario 1: Offline Development

**Goal**: Develop without internet or backend

**Solution**:

```bash
npm run start:mock
```

All data is in-memory. Changes are lost on refresh.

### Scenario 2: Full-Stack Development

**Goal**: Test frontend + backend together locally

**Prerequisites**: Docker Compose running with extServices

**Solution**:

```bash
# Terminal 1: Start Docker backend
cd ../extServices
docker-compose up

# Terminal 2: Start frontend in local mode
npm run start:local
```

### Scenario 3: Testing Against Production API

**Goal**: Validate integration with Heroku before deployment

**Solution**:

```bash
npm run start:cloud
```

**Warning**: This uses real production data. Be careful with test accounts.

### Scenario 4: Mobile Development

**Goal**: Build and test mobile app

**Solution**:

```bash
# Build web app + sync to Capacitor
npm run mobile:sync

# Open in Android Studio
npm run android:open

# Or quick build + install
cd android && ./quick-build.sh
```

Mobile builds always use production environment (cloud mode).

---

## Troubleshooting

### Issue: "Cannot connect to backend"

**Symptoms**: Network errors, "Failed to load readings"

**Solutions**:

1. **Mock mode**: Should work offline. If failing, check browser console for errors.

2. **Local mode**:
   - Verify Docker backend is running: `docker ps`
   - Check backend health: `curl http://localhost:8000/health`
   - For Android emulator: Ensure app uses `http://10.0.2.2:8000`

3. **Cloud mode**:
   - Check internet connection
   - Verify Heroku API is up: `curl https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/health`
   - Check for Heroku maintenance windows

### Issue: "Wrong backend mode active"

**Symptoms**: Expected mock but hitting real API (or vice versa)

**Solutions**:

1. Check terminal output when starting dev server
2. Verify `ENV` variable: `echo $ENV`
3. Kill and restart dev server
4. Clear browser cache and refresh

### Issue: "ENV variable not working"

**Symptoms**: Setting `ENV=mock` but still using cloud backend

**Solutions**:

1. Use npm scripts instead: `npm run start:mock`
2. Check shell syntax:
   - Bash/Zsh: `ENV=mock npm start`
   - Windows CMD: `set ENV=mock && npm start`
   - Windows PowerShell: `$env:ENV="mock"; npm start`
3. Verify `scripts/start-with-env.mjs` is being called

---

## Advanced Configuration

### Overriding API URLs

You can override the default URLs using environment variables:

```bash
# Custom local backend URL
LOCAL_API_GATEWAY_URL=http://192.168.1.100:8000 npm run start:local

# Custom Heroku URL (different deployment)
HEROKU_API_BASE_URL=https://my-custom-api.herokuapp.com npm run start:cloud

# Mock mode with custom URL (unusual)
MOCK_API_GATEWAY_URL=http://localhost:3000 npm run start:mock
```

### Creating Custom Configurations

You can add new Angular configurations in `angular.json`:

```json
"configurations": {
  "staging": {
    "fileReplacements": [{
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.staging.ts"
    }]
  }
}
```

Then create `src/environments/environment.staging.ts` with staging-specific settings.

---

## Summary

### Quick Reference

| Mode  | Command               | Backend        | Data Persistence | Tidepool |
| ----- | --------------------- | -------------- | ---------------- | -------- |
| Mock  | `npm run start:mock`  | None           | No (in-memory)   | Mock     |
| Local | `npm run start:local` | localhost:8000 | Yes (local DB)   | Optional |
| Cloud | `npm run start:cloud` | Heroku         | Yes (cloud DB)   | Yes      |

### Best Practices

1. **Use npm scripts** instead of raw ENV variables (clearer, platform-agnostic)
2. **Start with mock mode** for rapid development
3. **Test with local mode** before pushing backend changes
4. **Validate with cloud mode** before deploying to production
5. **Never commit hardcoded URLs** - use environment configuration
6. **Check console logs** to verify active mode
7. **Use mock mode for unit tests** to avoid external dependencies

---

**Related Documentation**:

- [Android Quick Start](ANDROID_QUICK_START.md) - Mobile development setup
- [User Guide](USER_GUIDE.md) - App usage for end users
- [CLAUDE.md](../CLAUDE.md) - Full project documentation
