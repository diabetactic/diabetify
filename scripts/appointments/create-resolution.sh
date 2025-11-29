#!/bin/bash
# Create a resolution for an appointment (admin action)
# Usage: ./create-resolution.sh <appointment_id>

BACKOFFICE_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"

if [ -z "$1" ]; then
  echo -e "\033[1;31mUsage: ./create-resolution.sh <appointment_id>\033[0m"
  echo -e "\033[1;33mTip: Run ./view-appointments.sh to see appointment IDs\033[0m"
  exit 1
fi

APPOINTMENT_ID="$1"

echo -e "\033[1;34m[1/2] Logging in as admin...\033[0m"
TOKEN=$(curl -s -X POST "$BACKOFFICE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "\033[1;31mFailed to login\033[0m"
  exit 1
fi

echo -e "\033[1;34m[2/2] Creating resolution for appointment $APPOINTMENT_ID...\033[0m"

# Sample resolution data - adjust as needed
RESOLUTION_DATA='{
  "appointment_id": '"$APPOINTMENT_ID"',
  "change_basal_type": "Lantus",
  "change_basal_dose": 18.0,
  "change_basal_time": "22:00:00",
  "change_fast_type": "Humalog",
  "change_ratio": 10.0,
  "change_sensitivity": 45.0,
  "emergency_care": false,
  "needed_physical_appointment": false,
  "glucose_scale": [
    ["<70", 0],
    ["70-120", 0],
    ["120-180", 1],
    ["180-250", 2],
    [">250", 3]
  ]
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKOFFICE_URL/appointments/$APPOINTMENT_ID/resolution" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$RESOLUTION_DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "\033[1;32mResolution created successfully!\033[0m"
  echo "$BODY" | jq '.'
else
  echo -e "\033[1;31mFailed to create resolution (HTTP $HTTP_CODE)\033[0m"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
