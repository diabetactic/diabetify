#!/bin/bash
# Create a new user via the backoffice API (admin)
# This creates a user directly with blocked=false (active)
# Usage: ./create-user-admin.sh [dni] [name] [surname] [email] [password]

BACKOFFICE_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"

# Generate unique values if not provided
TIMESTAMP=$(date +%s)
DNI="${1:-TEST$TIMESTAMP}"
NAME="${2:-Test}"
SURNAME="${3:-User}"
EMAIL="${4:-testuser$TIMESTAMP@test.com}"
PASSWORD="${5:-Test123!}"

echo -e "\033[1;34m========================================\033[0m"
echo -e "\033[1;34m  Creating User via Admin API\033[0m"
echo -e "\033[1;34m========================================\033[0m"
echo ""
echo -e "\033[1;33mDNI:\033[0m        $DNI"
echo -e "\033[1;33mName:\033[0m       $NAME $SURNAME"
echo -e "\033[1;33mEmail:\033[0m      $EMAIL"
echo -e "\033[1;33mPassword:\033[0m   $PASSWORD"
echo -e "\033[1;33mBlocked:\033[0m    false (active)"
echo ""

echo -e "\033[1;34m[1/2] Logging in as admin...\033[0m"
TOKEN=$(curl -s -X POST "$BACKOFFICE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "\033[1;31mFailed to login as admin\033[0m"
  exit 1
fi

echo -e "\033[1;34m[2/2] Creating user...\033[0m"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKOFFICE_URL/users/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dni": "'"$DNI"'",
    "name": "'"$NAME"'",
    "surname": "'"$SURNAME"'",
    "email": "'"$EMAIL"'",
    "password": "'"$PASSWORD"'",
    "blocked": false,
    "hospital_account": "hospital_test",
    "tidepool": null
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
  echo -e "\033[1;32m✓ User created successfully!\033[0m"
  echo ""
  echo -e "\033[1;33mResponse:\033[0m"
  echo "$BODY" | jq '.'
  echo ""
  echo -e "\033[1;36m========================================\033[0m"
  echo -e "\033[1;36m  Login Credentials (ACTIVE)\033[0m"
  echo -e "\033[1;36m========================================\033[0m"
  echo -e "\033[1;32mDNI/Email: $DNI or $EMAIL\033[0m"
  echo -e "\033[1;32mPassword:  $PASSWORD\033[0m"
  echo -e "\033[1;36m========================================\033[0m"
else
  echo -e "\033[1;31m✗ Failed to create user (HTTP $HTTP_CODE)\033[0m"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
