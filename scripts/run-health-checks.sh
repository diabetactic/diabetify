#!/bin/bash

# Health Check Script for Backend Services
# Run this before integration tests to verify all services are healthy

set -e

echo "================================================"
echo "Backend Services Health Check"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Service configuration
declare -A SERVICES
SERVICES=(
  ["api-gateway"]="8004"
  ["glucoserver"]="8002"
  ["login"]="8003"
  ["appointments"]="8005"
)

# Check if services are running
echo "Checking backend services..."
echo ""

all_healthy=true

for service in "${!SERVICES[@]}"; do
  port=${SERVICES[$service]}
  url="http://localhost:$port/health"

  echo -n "Checking $service (port $port)... "

  if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null); then
    if [ "$response" = "200" ]; then
      echo -e "${GREEN}✓ HEALTHY${NC} (HTTP $response)"
    else
      echo -e "${RED}✗ UNHEALTHY${NC} (HTTP $response)"
      all_healthy=false
    fi
  else
    echo -e "${RED}✗ NOT ACCESSIBLE${NC}"
    all_healthy=false
  fi
done

echo ""

if [ "$all_healthy" = true ]; then
  echo -e "${GREEN}================================================${NC}"
  echo -e "${GREEN}All services are healthy!${NC}"
  echo -e "${GREEN}================================================${NC}"
  echo ""
  echo "You can now run integration tests:"
  echo "  npm test -- --include='**/health-check.spec.ts'"
  echo ""
  exit 0
else
  echo -e "${RED}================================================${NC}"
  echo -e "${RED}Some services are unhealthy!${NC}"
  echo -e "${RED}================================================${NC}"
  echo ""
  echo -e "${YELLOW}Troubleshooting steps:${NC}"
  echo "1. Check if docker-compose is running:"
  echo "   cd extServicesCompose/extServices/container-managing && docker compose ps"
  echo ""
  echo "2. Start services:"
  echo "   docker compose up -d"
  echo ""
  echo "3. Check service logs:"
  echo "   docker compose logs -f"
  echo ""
  echo "4. Verify ports are not in use:"
  echo "   lsof -i :8004"
  echo "   lsof -i :8002"
  echo "   lsof -i :8003"
  echo "   lsof -i :8005"
  echo ""
  exit 1
fi
