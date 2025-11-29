#!/bin/bash
# Clear the entire appointment queue
# Usage: ./clear-queue.sh

BACKOFFICE_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"

echo -e "\033[1;34m[1/2] Logging in as admin...\033[0m"
TOKEN=$(curl -s -X POST "$BACKOFFICE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "\033[1;31mFailed to login\033[0m"
  exit 1
fi

echo -e "\033[1;34m[2/2] Clearing queue...\033[0m"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BACKOFFICE_URL/appointments" \
  -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" == "204" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "\033[1;32mQueue cleared successfully!\033[0m"
else
  echo -e "\033[1;31mFailed to clear queue (HTTP $HTTP_CODE)\033[0m"
  exit 1
fi
