# Quick Start: Run Integration Tests

**Total Time:** 5 minutes + Docker installation

## 🚀 Super Quick Start

```bash
# 1. Install Docker (only once)
sudo pacman -S docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# 2. Log out and log back in (REQUIRED!)
# Then continue...

# 3. Verify Docker works
docker --version

# 4. Start backend services
npm run backend:start

# 5. Wait 60 seconds, then check health
sleep 60 && npm run backend:health

# 6. Run all integration tests
npm run test:backend-integration
```

## 📖 Detailed Guide

See **`docs/DOCKER_INSTALLATION_STEPS.md`** for complete instructions.

## ✅ Expected Results

**After `npm run backend:health`:**
```
✓ http://localhost:8004/health - api-gateway
✓ http://localhost:8002/health - glucoserver
✓ http://localhost:8003/health - login
✓ http://localhost:8005/health - appointments
```

**After `npm run test:backend-integration`:**
```
35 specs, 0 failures ✅
```

## 🐛 Issues?

**Can't run docker without sudo?**
→ Log out and log back in (or reboot)

**Services won't start?**
→ Wait longer: `sleep 60 && npm run backend:health`

**Tests fail?**
→ Check services are healthy first: `npm run backend:health`

## 📚 More Info

- **Installation Guide:** `docs/DOCKER_INSTALLATION_STEPS.md`
- **Integration Tests Guide:** `docs/INTEGRATION_TESTS_GUIDE.md`
- **Troubleshooting:** `docs/INTEGRATION_TESTS_GUIDE.md#troubleshooting`
