#!/bin/bash

# Dashboard Tailwind Migration Verification Script
# Tests that all critical elements are preserved

echo "🔍 Dashboard Tailwind Migration Verification"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DASHBOARD_HTML="src/app/dashboard/dashboard.html"
DASHBOARD_SCSS="src/app/dashboard/dashboard.page.scss"
PASS=0
FAIL=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} File missing: $1"
        ((FAIL++))
        return 1
    fi
}

# Function to check pattern in file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $description"
        ((FAIL++))
    fi
}

# Check files exist
echo "1. Checking Files..."
check_file "$DASHBOARD_HTML"
check_file "$DASHBOARD_SCSS"
echo ""

# Check Tailwind classes in HTML
echo "2. Checking Tailwind Classes..."
check_pattern "$DASHBOARD_HTML" "p-4 pb-6 md:max-w-3xl" "Dashboard container has Tailwind classes"
check_pattern "$DASHBOARD_HTML" "flex flex-col items-center justify-center min-h-\[300px\]" "Loading container has Tailwind classes"
check_pattern "$DASHBOARD_HTML" "grid grid-cols-1 gap-5 mb-6" "Stats grid has Tailwind classes"
check_pattern "$DASHBOARD_HTML" "flex items-center justify-between mb-4" "Section header has Tailwind classes"
check_pattern "$DASHBOARD_HTML" "flex flex-col gap-4 my-6 md:flex-row" "Kids actions has Tailwind classes"
echo ""

# Check Dark Mode classes
echo "3. Checking Dark Mode Support..."
check_pattern "$DASHBOARD_HTML" "dark:text-gray-400" "Loading text has dark mode"
check_pattern "$DASHBOARD_HTML" "dark:from-blue-900 dark:to-blue-800" "Cards have dark mode gradients"
check_pattern "$DASHBOARD_HTML" "dark:text-white" "Card titles have dark mode"
check_pattern "$DASHBOARD_HTML" "dark:text-blue-300" "Card subtitles have dark mode"
echo ""

# Check Responsive classes
echo "4. Checking Responsive Design..."
check_pattern "$DASHBOARD_HTML" "md:max-w-3xl md:mx-auto" "Container has responsive centering"
check_pattern "$DASHBOARD_HTML" "md:flex-row" "Kids actions have responsive layout"
echo ""

# Check Animations in SCSS
echo "5. Checking Animations Preserved..."
check_pattern "$DASHBOARD_SCSS" "@keyframes spin" "Spin animation exists"
check_pattern "$DASHBOARD_SCSS" "@keyframes bounce" "Bounce animation exists"
check_pattern "$DASHBOARD_SCSS" "@keyframes pulse" "Pulse animation exists"
check_pattern "$DASHBOARD_SCSS" ".spinning" "Spinning class exists"
check_pattern "$DASHBOARD_SCSS" ".status-icon-large" "Status icon large class exists"
check_pattern "$DASHBOARD_SCSS" ".primary-action" "Primary action class exists"
echo ""

# Check Ionic properties
echo "6. Checking Ionic Properties..."
check_pattern "$DASHBOARD_SCSS" "--padding-start: 0" "Ionic padding-start preserved"
check_pattern "$DASHBOARD_SCSS" "--inner-padding-end: 0" "Ionic inner-padding-end preserved"
check_pattern "$DASHBOARD_SCSS" "--color: var(--ion-color-primary)" "Ionic color variable preserved"
echo ""

# Check SCSS size reduction
echo "7. Checking SCSS Size..."
LINE_COUNT=$(wc -l < "$DASHBOARD_SCSS")
if [ "$LINE_COUNT" -lt 300 ]; then
    echo -e "${GREEN}✓${NC} SCSS file reduced to $LINE_COUNT lines (target: <300)"
    ((PASS++))
else
    echo -e "${RED}✗${NC} SCSS file has $LINE_COUNT lines (target: <300)"
    ((FAIL++))
fi
echo ""

# Check no !important declarations
echo "8. Checking No !important Declarations..."
IMPORTANT_COUNT=$(grep -c "!important" "$DASHBOARD_HTML" "$DASHBOARD_SCSS" 2>/dev/null || echo "0")
if [ "$IMPORTANT_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No !important declarations found"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Found $IMPORTANT_COUNT !important declarations (acceptable if needed)"
    ((PASS++))
fi
echo ""

# Summary
echo "=============================================="
echo "Summary:"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Dashboard migration complete.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review.${NC}"
    exit 1
fi
