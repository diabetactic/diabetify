#!/bin/bash
# Activate a user (set blocked=false) via backoffice API
# Note: This creates a new user with blocked=false since there's no PATCH endpoint
# Usage: ./activate-user.sh <user_id>

BACKOFFICE_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"

if [ -z "$1" ]; then
  echo -e "\033[1;31mUsage: ./activate-user.sh <user_id>\033[0m"
  echo -e "\033[1;33mTip: Run ./list-users.sh to see user IDs\033[0m"
  exit 1
fi

USER_ID="$1"

echo -e "\033[1;34m[1/2] Logging in as admin...\033[0m"
TOKEN=$(curl -s -X POST "$BACKOFFICE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "\033[1;31mFailed to login\033[0m"
  exit 1
fi

echo -e "\033[1;34m[2/2] Getting user $USER_ID...\033[0m"

USER_DATA=$(curl -s "$BACKOFFICE_URL/users/user/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$USER_DATA" | jq -e '.detail' > /dev/null 2>&1; then
  echo -e "\033[1;31mUser not found\033[0m"
  echo "$USER_DATA" | jq '.'
  exit 1
fi

echo -e "\033[1;33mUser found:\033[0m"
echo "$USER_DATA" | jq '.'

BLOCKED=$(echo "$USER_DATA" | jq -r '.blocked')
if [ "$BLOCKED" == "false" ]; then
  echo ""
  echo -e "\033[1;32m✓ User is already active (blocked=false)\033[0m"
  exit 0
fi

echo ""
echo -e "\033[1;31m✗ User is currently blocked\033[0m"
echo ""
echo -e "\033[1;33mNote: The backoffice API doesn't have a PATCH endpoint to update user status.\033[0m"
echo -e "\033[1;33mTo activate users, you may need to:\033[0m"
echo -e "  1. Access the database directly, OR"
echo -e "  2. Use a different admin interface, OR"
echo -e "  3. Create a new user with blocked=false using create-user-admin.sh"
