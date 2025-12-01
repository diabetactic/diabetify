#!/bin/bash
# Android build helper script
# Automatically sets JAVA_HOME and ANDROID_HOME

set -e  # Exit on error

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Set environment
JAVA_HOME=$(mise where java)
export JAVA_HOME
export ANDROID_HOME=/home/julito/Android/Sdk

# Run gradle command
cd "$PROJECT_ROOT/android"
./gradlew "$@"
