# Health Check Quick Reference

## 🚀 Quick Commands

```bash
# Run health check tests (fastest)
npm run test:health:script

# Run health check tests (Karma)
npm run test:health

# Run with watch mode
npm run test:health:watch

# Manual curl checks
npm run backend:health
```

## 📊 Service Endpoints

| Service | Port | URL |
|---------|------|-----|
| api-gateway | 8004 | http://localhost:8004/health |
| glucoserver | 8002 | http://localhost:8002/health |
| login | 8003 | http://localhost:8003/health |
| appointments | 8005 | http://localhost:8005/health |

## ✅ Test Cases

1. Individual service health (4 tests)
2. Overall system health (parallel)
3. Docker compose verification
4. Port accessibility
5. Health endpoint validation

**Total**: 8 test cases

## 🔧 Troubleshooting

### Services not running?
```bash
cd extServices/container-managing
make build
```

### Check logs
```bash
cd extServices/container-managing
make logs
```

### Port conflicts?
```bash
lsof -i :8004 :8002 :8003 :8005
```

### Manual health check
```bash
curl http://localhost:8004/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8005/health
```

## 📝 Files

- **Test Suite**: `src/app/tests/integration/backend/health-check.spec.ts`
- **Documentation**: `docs/HEALTH_CHECK_TESTS.md`
- **Shell Script**: `scripts/run-health-checks.sh`
- **Implementation**: `docs/HEALTH_CHECK_IMPLEMENTATION.md`

## 🎯 Typical Workflow

```bash
# 1. Start backend
cd extServices/container-managing && make build

# 2. Wait 30 seconds
sleep 30

# 3. Health check
npm run test:health

# 4. Integration tests (if healthy)
npm run test:backend-integration
```

## 💾 Memory Context

**Namespace**: `integration-tests`

**Keys**:
- `service-ports`: Service port configuration
- `health-check-config`: Complete test setup

## ⚡ One-Liner for CI/CD

```bash
npm run test:health && npm run test:backend-integration
```
