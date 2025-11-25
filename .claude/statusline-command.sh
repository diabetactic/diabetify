
#!/bin/bash

# Read JSON input from stdin
INPUT=$(cat)
MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "Claude"')
CWD=$(echo "$INPUT" | jq -r '.workspace.current_dir // .cwd')
DIR=$(basename "$CWD")

# Replace claude-code-flow with branded name
if [ "$DIR" = "claude-code-flow" ]; then
  DIR="🌊 Claude Flow"
fi

# Get git branch
BRANCH=$(cd "$CWD" 2>/dev/null && git branch --show-current 2>/dev/null)

# Start building statusline
printf "\033[1m$MODEL\033[0m in \033[36m$DIR\033[0m"
[ -n "$BRANCH" ] && printf " on \033[33m⎇ $BRANCH\033[0m"

echo
