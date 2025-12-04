#!/bin/bash

BACKOFFICE_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
USER_ID="1000"
ADMIN_USER="admin"
ADMIN_PASS="admin"

echo "=== 1. Getting token ==="
TOKEN_RESPONSE=$(curl -s -X POST "$BACKOFFICE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS")
TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
echo "Token: ${TOKEN:0:20}..."

echo -e "\n=== 2. Getting pending appointments ==="
PENDING=$(curl -s -X GET "$BACKOFFICE_URL/appointments/pending" \
  -H "Authorization: Bearer $TOKEN")
echo "$PENDING" | jq '.'

echo -e "\n=== 3. Finding user $USER_ID appointment ==="
PLACEMENT=$(echo "$PENDING" | jq -r ".[] | select(.user_id == $USER_ID or .user_id == \"$USER_ID\") | .queue_placement")
echo "Found placement: $PLACEMENT"

if [ -n "$PLACEMENT" ] && [ "$PLACEMENT" != "null" ]; then
  echo -e "\n=== 4. Accepting appointment at placement $PLACEMENT ==="
  ACCEPT_RESPONSE=$(curl -s -X PUT "$BACKOFFICE_URL/appointments/accept/$PLACEMENT" \
    -H "Authorization: Bearer $TOKEN")
  echo "$ACCEPT_RESPONSE" | jq '.'
  
  echo -e "\n=== 5. Checking pending again (should be empty for user) ==="
  PENDING_AFTER=$(curl -s -X GET "$BACKOFFICE_URL/appointments/pending" \
    -H "Authorization: Bearer $TOKEN")
  echo "$PENDING_AFTER" | jq ".[] | select(.user_id == $USER_ID or .user_id == \"$USER_ID\")"
  
  echo -e "\n=== 6. Getting accepted appointments ==="
  ACCEPTED=$(curl -s -X GET "$BACKOFFICE_URL/appointments/accepted" \
    -H "Authorization: Bearer $TOKEN")
  echo "$ACCEPTED" | jq ".[] | select(.user_id == $USER_ID or .user_id == \"$USER_ID\")"
else
  echo "No pending appointment found for user $USER_ID"
fi
