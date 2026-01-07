#!/bin/bash
set -eo pipefail

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Configuration ---
MERGE_BRANCH="merge-all"
BASE_BRANCH="master"
TEST_COMMAND="pnpm test"

# --- Script ---
# Check for input branches
if [ "$#" -eq 0 ]; then
  echo -e "${RED}Usage: $0 <branch1> <branch2> ...${NC}"
  exit 1
fi

BRANCHES_TO_MERGE=("$@")
MERGED_BRANCHES=()
FAILED_BRANCHES=()

# Store the original branch
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "Currently on branch ${GREEN}${ORIGINAL_BRANCH}${NC}. The script will create and switch to the '${MERGE_BRANCH}' branch."

# Check if merge-all branch exists
if git show-ref --verify --quiet "refs/heads/$MERGE_BRANCH"; then
  echo -e "${YELLOW}Branch '$MERGE_BRANCH' already exists.${NC}"
  read -p "Do you want to delete and recreate it? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout "$BASE_BRANCH"
    git branch -D "$MERGE_BRANCH"
  else
    echo -e "${RED}Aborting.${NC}"
    exit 1
  fi
fi

echo -e "Switching to ${GREEN}${BASE_BRANCH}${NC} and creating the ${GREEN}${MERGE_BRANCH}${NC} branch..."
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"
git checkout -b "$MERGE_BRANCH"

echo -e "\nStarting merge process..."

for BRANCH in "${BRANCHES_TO_MERGE[@]}"; do
  echo -e "\n--- Merging branch: ${GREEN}${BRANCH}${NC} ---"

  # Fetch and merge
  git fetch origin "$BRANCH"
  if git merge "origin/$BRANCH" --no-edit; then
    echo -e "${GREEN}Successfully merged '${BRANCH}'.${NC}"

    echo -e "Running tests..."
    if ${TEST_COMMAND}; then
      echo -e "${GREEN}Tests passed for '${BRANCH}'.${NC}"
      MERGED_BRANCHES+=("$BRANCH")
    else
      echo -e "${RED}Tests failed after merging '${BRANCH}'.${NC}"
      echo -e "${YELLOW}The script will now stop. Please resolve the test failures in the '${MERGE_BRANCH}' branch.${NC}"
      exit 1
    fi
  else
    echo -e "${RED}Merge conflict detected for branch '${BRANCH}'.${NC}"
    echo -e "${YELLOW}Please resolve the conflicts in a separate terminal, then commit the changes.${NC}"
    echo -e "${YELLOW}After resolving, you can either re-run this script with the remaining branches or merge them manually.${NC}"
    exit 1
  fi
done

echo -e "\n--- ${GREEN}Merge Process Complete${NC} ---"
echo -e "Successfully merged branches:"
for BRANCH in "${MERGED_BRANCHES[@]}"; do
  echo -e "- ${GREEN}${BRANCH}${NC}"
done

echo -e "\n${GREEN}The '${MERGE_BRANCH}' branch is ready.${NC}"
echo -e "To create the pull request, run:"
echo -e "  git push origin ${MERGE_BRANCH}"
