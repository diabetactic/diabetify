# Docker Installation Guide for EndeavourOS

**Quick 5-Minute Setup for Integration Tests**

## 📋 What You Need

You're on **EndeavourOS** (Arch-based), so we'll use `pacman` to install Docker.

## 🚀 Step-by-Step Installation

### Step 1: Install Docker and Docker Compose

Open a terminal and run:

```bash
sudo pacman -S docker docker-compose
```

**Expected output:**
```
resolving dependencies...
looking for conflicting packages...

Packages (X) docker-XX.X.X docker-compose-X.X.X

Total Installed Size: ~XXX MiB

:: Proceed with installation? [Y/n]
```

Press **Y** and Enter.

### Step 2: Start Docker Service

```bash
sudo systemctl start docker
```

### Step 3: Enable Docker to Start on Boot (Optional but Recommended)

```bash
sudo systemctl enable docker
```

### Step 4: Add Your User to the Docker Group

This lets you run Docker without `sudo`:

```bash
sudo usermod -aG docker $USER
```

### Step 5: Apply Group Changes

**IMPORTANT:** You must log out and log back in (or reboot) for the group changes to take effect.

```bash
# Option 1: Reboot
sudo reboot

# Option 2: Log out and log back in
# (Use your desktop environment's logout option)
```

### Step 6: Verify Installation (After Logging Back In)

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version

# Test Docker with hello-world
docker run --rm hello-world
```

**Expected output:**
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

## ✅ Quick Verification Checklist

After installation and relogging:

- [ ] `docker --version` shows version (without sudo)
- [ ] `docker compose version` shows version (without sudo)
- [ ] `docker run --rm hello-world` works (without sudo)
- [ ] User is in docker group: `groups | grep docker` shows "docker"

## 🎯 Next Steps: Run Integration Tests

Once Docker is installed and you've logged back in:

### 1. Navigate to Project Directory

```bash
cd /home/julito/TPP/diabetactic-extServices-20251103-061913/diabetactic
```

### 2. Start Backend Services

```bash
npm run backend:start
```

**What happens:**
- Starts 4 backend services (api-gateway, login, appointments, glucoserver)
- Starts 3 PostgreSQL databases
- Starts monitoring tools (Dozzle, LazyDocker)

**Wait 30-60 seconds** for services to initialize.

### 3. Verify Services Are Running

```bash
npm run backend:health
```

**Expected output:**
```
✓ http://localhost:8004/health - api-gateway
✓ http://localhost:8002/health - glucoserver
✓ http://localhost:8003/health - login
✓ http://localhost:8005/health - appointments
```

### 4. Run Integration Tests

```bash
npm run test:backend-integration
```

**Expected output:**
```
Backend Integration Tests
  Health Checks (8 tests)
    ✓ should have api-gateway healthy
    ✓ should have glucoserver healthy
    ...

  Authentication (19 tests)
    ✓ should login with test user
    ✓ should fetch user profile
    ...

  Appointments (8 tests)
    ✓ should create appointment
    ✓ should fetch appointments
    ...

35 specs, 0 failures ✅
```

### 5. View Service Logs (Optional)

```bash
npm run backend:logs
```

Then open http://localhost:9999 in your browser to see real-time logs.

### 6. Stop Services When Done

```bash
npm run backend:stop
```

## 🐛 Troubleshooting

### "Permission denied" when running docker

**Problem:** You haven't logged out and back in after adding yourself to docker group.

**Solution:**
```bash
# Log out and log back in, or reboot
sudo reboot
```

### "Cannot connect to the Docker daemon"

**Problem:** Docker service not running.

**Solution:**
```bash
sudo systemctl start docker
sudo systemctl status docker
```

### Services won't start

**Problem:** Port conflicts or previous containers running.

**Solution:**
```bash
# Stop any running containers
docker ps -a
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# Try again
npm run backend:start
```

### Tests fail with "Connection refused"

**Problem:** Services not fully initialized yet.

**Solution:**
```bash
# Wait longer for services to start (60+ seconds)
sleep 60
npm run backend:health

# Then run tests
npm run test:backend-integration
```

## 📊 What Gets Installed

| Package | Purpose | Size |
|---------|---------|------|
| docker | Docker engine | ~100 MB |
| docker-compose | Multi-container orchestration | ~50 MB |

**Total:** ~150 MB

## 🔒 Security Notes

- Docker requires root privileges (hence `sudo`)
- Adding user to docker group gives near-root access
- Only run trusted containers
- This setup is for local development/testing

## 📚 Additional Resources

- **Docker Arch Wiki:** https://wiki.archlinux.org/title/Docker
- **Docker Docs:** https://docs.docker.com/
- **Project Integration Tests Guide:** `docs/INTEGRATION_TESTS_GUIDE.md`

## 💡 Quick Command Reference

```bash
# Docker Management
docker ps                    # List running containers
docker ps -a                # List all containers
docker images               # List images
docker system prune -a      # Clean up everything

# Backend Services (from project root)
npm run backend:start       # Start all services
npm run backend:stop        # Stop all services
npm run backend:logs        # View logs in browser
npm run backend:health      # Check service health

# Integration Tests
npm run test:backend-integration           # Run all tests (watch mode)
npm run test:backend-integration:headless  # Run all tests (CI mode)
npm test -- --include='**/health-check.spec.ts'     # Run health checks only
npm test -- --include='**/auth-backend.spec.ts'     # Run auth tests only
npm test -- --include='**/appointments-backend.spec.ts'  # Run appointments tests only
```

---

**Ready to start?** Run the commands above and you'll have everything working in ~5 minutes!
