#!/bin/bash
# Accept the next pending appointment in queue
# Usage: ./accept-next.sh [queue_placement]

BACKOFFICE_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"

echo -e "\033[1;34m[1/3] Logging in as admin...\033[0m"
TOKEN=$(curl -s -X POST "$BACKOFFICE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "\033[1;31mFailed to login\033[0m"
  exit 1
fi

# If queue_placement provided, use it; otherwise find the first pending
if [ -n "$1" ]; then
  QUEUE_PLACEMENT="$1"
else
  echo -e "\033[1;34m[2/3] Finding next pending appointment...\033[0m"
  PENDING=$(curl -s -X GET "$BACKOFFICE_URL/appointments/pending" \
    -H "Authorization: Bearer $TOKEN")

  QUEUE_PLACEMENT=$(echo "$PENDING" | jq -r '.[0].queue_placement // empty')

  if [ -z "$QUEUE_PLACEMENT" ]; then
    echo -e "\033[1;33mNo pending appointments in queue\033[0m"
    exit 0
  fi

  USER_ID=$(echo "$PENDING" | jq -r '.[0].user_id // "unknown"')
  echo -e "\033[1;36mFound pending: queue_placement=$QUEUE_PLACEMENT, user_id=$USER_ID\033[0m"
fi

echo -e "\033[1;34m[3/3] Accepting appointment (placement: $QUEUE_PLACEMENT)...\033[0m"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BACKOFFICE_URL/appointments/accept/$QUEUE_PLACEMENT" \
  -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "\033[1;32mAppointment ACCEPTED!\033[0m"
else
  echo -e "\033[1;31mFailed to accept (HTTP $HTTP_CODE)\033[0m"
  exit 1
fi
