# Backend Testing Quick Reference

## Run Tests Fast

```bash
# Mock tests (instant, no network)
maestro test --tags mock maestro/tests/

# Heroku tests (live API)
maestro test --tags heroku maestro/tests/

# Specific test
maestro test maestro/tests/auth/01-login-flow.mock.yaml
maestro test maestro/tests/auth/01-login-flow.heroku.yaml
```

## Test Coverage

| Test | Mock | Heroku | Category |
|------|------|--------|----------|
| Login Flow | 01-login-flow.mock.yaml | 01-login-flow.heroku.yaml | auth, smoke |
| Add Reading | 02-add-reading.mock.yaml | 02-add-reading.heroku.yaml | readings |
| Complete Workflow | 01-complete-workflow.mock.yaml | 01-complete-workflow.heroku.yaml | integration |

## Switch Backend Mode

```typescript
// src/environments/environment.ts
const DEV_BACKEND_MODE: BackendMode = 'mock';  // or 'local' or 'cloud'
```

## Environment Files

- Mock: `maestro/config/env-mock.yaml`
- Heroku: `maestro/config/env-heroku.yaml`

## CI/CD

```bash
# Fast validation (mock tests)
maestro test --tags mock maestro/tests/  # ~2-3 min

# Full integration (heroku tests)
maestro test --tags heroku maestro/tests/  # ~5-10 min

# All tests combined
maestro test maestro/tests/  # ~10-15 min
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Mock tests fail | Set `DEV_BACKEND_MODE = 'mock'` |
| Heroku tests timeout | Wake up: `curl https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/health` |
| adb: command not found | `brew install android-platform-tools` |

## See Also

- Full guide: [maestro/BACKEND_TESTING.md](./BACKEND_TESTING.md)
- Architecture: [docs/MAESTRO_TEST_ARCHITECTURE.md](../docs/MAESTRO_TEST_ARCHITECTURE.md)
- Setup: [docs/MAESTRO_SETUP_GUIDE.md](../docs/MAESTRO_SETUP_GUIDE.md)
