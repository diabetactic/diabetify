# Diabetactic Local Docker Setup - Files Created

This document lists all files created for the local Docker-based testing environment.

## Created: 2025-12-07

## Summary

A complete Docker-based local development environment that replicates Heroku production for Diabetactic backend testing. Includes all 5 backend services, PostgreSQL databases, and convenient user management scripts.

## Files Created

### Docker Configuration

1. **docker-compose.local.yml** (5.0KB)
   - Orchestrates all 5 backend services
   - 3 PostgreSQL databases (users, glucoserver, appointments)
   - API Gateway on port 8000
   - API Gateway Backoffice on port 8001
   - Test utilities container
   - Healthchecks and service dependencies configured

2. **Dockerfile.test-utils** (438B)
   - Python 3.10 slim image
   - Installs curl, postgresql-client, requests library
   - Mounts user management scripts

### Shell Scripts (All Executable)

3. **start.sh** (1.6KB)
   - Starts all Docker services
   - Waits for health checks
   - Displays service URLs and helpful commands

4. **stop.sh** (397B)
   - Stops all Docker services gracefully
   - Shows command to remove volumes

5. **reset-db.sh** (1.5KB)
   - Stops services
   - Removes all database volumes
   - Restarts with fresh databases
   - Includes safety confirmation prompt

6. **create-user.sh** (1.2KB)
   - Creates test users via test-utils container
   - Supports DNI, password, name, surname, email
   - Auto-generates email if not provided

7. **delete-user.sh** (682B)
   - Deletes (blocks) users by DNI
   - Uses test-utils container

8. **list-users.sh** (486B)
   - Lists all users in the system
   - Shows DNI, name, email

9. **get-user.sh** (664B)
   - Retrieves detailed user information by DNI
   - Shows user ID, blocked status, hospital account

10. **logs.sh** (458B)
    - View logs from all services or specific service
    - Supports follow mode (-f)

### User Management Library

11. **test-utils/user_manager.py** (8.8KB)
    - Python library for user management
    - Functions:
      - create_user() - Create new test user
      - delete_user() - Block user by DNI
      - get_user() - Get user info by DNI
      - list_users() - List all users
      - update_hospital_account() - Update account status
    - CLI interface for all functions
    - Error handling and validation
    - Colorized console output

### Documentation

12. **README.md** (8.7KB) - Updated
    - Comprehensive setup guide
    - Quick start instructions
    - User management documentation
    - Service URLs and Docker compose reference
    - Troubleshooting guide
    - Advanced usage examples
    - Development workflow
    - Comparison with Heroku

## Usage Examples

### Quick Start

```bash
# 1. Start backend
cd /home/julito/TPP/diabetactic/diabetify/docker
./start.sh

# 2. Create test user
./create-user.sh 1000 tuvieja

# 3. Start frontend with local backend
cd /home/julito/TPP/diabetactic/diabetify
ENV=local npm start

# 4. Test at http://localhost:8100
# Login: DNI=1000, Password=tuvieja
```

### User Management

```bash
# Create users
./create-user.sh 1000 tuvieja
./create-user.sh 1001 password123 John Doe john@example.com

# List all users
./list-users.sh

# Get user details
./get-user.sh 1000

# Delete user
./delete-user.sh 1000
```

## Service URLs

- **API Gateway**: http://localhost:8000
- **API Gateway Docs**: http://localhost:8000/docs
- **Backoffice API**: http://localhost:8001
- **Backoffice Docs**: http://localhost:8001/docs

## Integration with Frontend

No code changes required! The app already supports local mode via environment variable:

```bash
ENV=local npm start      # Use local Docker backend
ENV=cloud npm start      # Use Heroku (default)
ENV=mock npm start       # Use in-memory mock
```

The app automatically uses the correct URL:

- **Web**: http://localhost:8000 (via proxy)
- **Android**: http://10.0.2.2:8000 (emulator)
- **iOS**: http://localhost:8000

## Benefits

1. **No Heroku Dependency** - Work offline
2. **Fast Iteration** - No network latency
3. **Resettable Data** - Fresh database with one command
4. **Easy User Management** - CLI scripts
5. **Full Observability** - Direct access to logs and databases
6. **Free** - No Heroku costs
7. **Hot Reload** - Backend code changes reflect immediately

## Next Steps

1. Test the setup:

   ```bash
   cd /home/julito/TPP/diabetactic/diabetify/docker
   ./start.sh
   ./create-user.sh 1000 tuvieja
   ```

2. Start frontend:

   ```bash
   cd /home/julito/TPP/diabetactic/diabetify
   ENV=local npm start
   ```

3. Access http://localhost:8100 and login with DNI: 1000, Password: tuvieja

---

**Created**: 2025-12-07
**Status**: Production Ready
