#!/bin/bash

BACKOFFICE_URL="https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com"
ADMIN_USER="admin"
ADMIN_PASS="admin"

echo "=== Getting token ==="
TOKEN=$(curl -s -X POST "$BACKOFFICE_URL/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER&password=$ADMIN_PASS" | jq -r '.access_token')

echo -e "\n=== ALL pending appointments ==="
curl -s -X GET "$BACKOFFICE_URL/appointments/pending" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== Resetting Queue (Clear + Open) ==="
curl -s -X POST "$BACKOFFICE_URL/appointments/queue/open" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n=== Verifying clear ==="
curl -s -X GET "$BACKOFFICE_URL/appointments/pending" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
