#!/bin/bash
# Create a new test user via the API gateway
# Usage: ./create-user.sh [email] [password] [firstName] [lastName]

API_URL="https://dt-api-gateway-3dead350d8fa.herokuapp.com"

# Default values for testing
EMAIL="${1:-testuser$(date +%s)@test.com}"
PASSWORD="${2:-Test123!}"
FIRST_NAME="${3:-Test}"
LAST_NAME="${4:-User}"

echo -e "\033[1;34m========================================\033[0m"
echo -e "\033[1;34m  Creating New User\033[0m"
echo -e "\033[1;34m========================================\033[0m"
echo ""
echo -e "\033[1;33mEmail:\033[0m      $EMAIL"
echo -e "\033[1;33mPassword:\033[0m   $PASSWORD"
echo -e "\033[1;33mName:\033[0m       $FIRST_NAME $LAST_NAME"
echo ""

echo -e "\033[1;34mSending registration request...\033[0m"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$EMAIL"'",
    "password": "'"$PASSWORD"'",
    "firstName": "'"$FIRST_NAME"'",
    "lastName": "'"$LAST_NAME"'",
    "role": "patient"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "\033[1;32m✓ User created successfully!\033[0m"
  echo ""
  echo -e "\033[1;33mResponse:\033[0m"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo -e "\033[1;36m========================================\033[0m"
  echo -e "\033[1;36m  Login Credentials\033[0m"
  echo -e "\033[1;36m========================================\033[0m"
  echo -e "\033[1;32mEmail:    $EMAIL\033[0m"
  echo -e "\033[1;32mPassword: $PASSWORD\033[0m"
  echo -e "\033[1;36m========================================\033[0m"
  echo ""
  echo -e "\033[1;33mNote: New users may need admin activation before they can use the app.\033[0m"
else
  echo -e "\033[1;31m✗ Failed to create user (HTTP $HTTP_CODE)\033[0m"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
