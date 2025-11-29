#!/bin/bash
# List all users from the backoffice API
# Usage: ./list-users.sh

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

echo -e "\033[1;34m[2/2] Fetching users...\033[0m"
echo ""

RESPONSE=$(curl -s "$BACKOFFICE_URL/users/" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESPONSE" | jq -r '
  "┌────────┬──────────────────────┬──────────────────────────────┬─────────┐",
  "│ ID     │ Name                 │ Email                        │ Blocked │",
  "├────────┼──────────────────────┼──────────────────────────────┼─────────┤",
  (.[] | "│ \(.user_id | tostring | .[0:6] | . + " " * (6 - length)) │ \(.name + " " + .surname | .[0:20] | . + " " * (20 - length)) │ \(.email | .[0:28] | . + " " * (28 - length)) │ \(if .blocked then "  ✗   " else "  ✓   " end) │"),
  "└────────┴──────────────────────┴──────────────────────────────┴─────────┘"
' 2>/dev/null || echo "$RESPONSE" | jq '.'

echo ""
echo -e "\033[1;33mLegend: ✓ = Active, ✗ = Blocked\033[0m"
