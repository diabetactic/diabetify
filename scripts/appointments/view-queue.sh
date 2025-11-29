#!/bin/bash
# View the current appointment queue
# Usage: ./view-queue.sh [pending|accepted|created|all]

BACKOFFICE_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"
FILTER="${1:-all}"

echo -e "\033[1;34m[1/2] Logging in as admin...\033[0m"
TOKEN=$(curl -s -X POST "$BACKOFFICE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "\033[1;31mFailed to login\033[0m"
  exit 1
fi

echo -e "\033[1;34m[2/2] Fetching queue ($FILTER)...\033[0m"

case "$FILTER" in
  pending)
    ENDPOINT="/appointments/pending"
    ;;
  accepted)
    ENDPOINT="/appointments/accepted"
    ;;
  created)
    ENDPOINT="/appointments/created"
    ;;
  *)
    ENDPOINT="/appointments/queue"
    ;;
esac

RESPONSE=$(curl -s -X GET "$BACKOFFICE_URL$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN")

echo -e "\033[1;33m--- Queue ($FILTER) ---\033[0m"
echo "$RESPONSE" | jq '.'

COUNT=$(echo "$RESPONSE" | jq 'length')
echo -e "\033[1;32mTotal: $COUNT entries\033[0m"
