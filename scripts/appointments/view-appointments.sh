#!/bin/bash
# View all appointments (admin view with all details)
# Usage: ./view-appointments.sh [user_id]

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

echo -e "\033[1;34m[2/2] Fetching appointments...\033[0m"

if [ -n "$1" ]; then
  # Get appointments for specific user
  ENDPOINT="/appointments/user/$1"
  echo -e "\033[1;33m--- Appointments for user $1 ---\033[0m"
else
  # Get all appointments
  ENDPOINT="/appointments"
  echo -e "\033[1;33m--- All Appointments ---\033[0m"
fi

RESPONSE=$(curl -s -X GET "$BACKOFFICE_URL$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESPONSE" | jq '.'

COUNT=$(echo "$RESPONSE" | jq 'if type == "array" then length else 1 end')
echo -e "\033[1;32mTotal: $COUNT appointment(s)\033[0m"
