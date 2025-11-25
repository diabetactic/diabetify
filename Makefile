.PHONY: help check-app test-ui test-ui-fast rebuild deploy rebuild-deploy restart launch stop screenshot logs logs-tail clear-data apk-info device-info

# Makefile for Diabetactic quick testing
# Usage: make <command>
#   make check-app          - Check device/APK/app status
#   make rebuild-deploy     - Rebuild APK and install
#   make test-ui-fast       - Quick UI test with screenshots
#   make restart            - Restart the app
#   etc...

PROJECT_DIR := /home/julito/TPP/diabetify-extServices-20251103-061913/diabetify
SCRIPTS_DIR := $(PROJECT_DIR)/scripts
ANDROID_DIR := $(PROJECT_DIR)/android
APP_ID := io.diabetify.app
JAVA_HOME := /home/julito/.local/share/mise/installs/java/25.0.1
ANDROID_HOME := $(HOME)/Android/Sdk

# Color codes
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m

help:
	@echo "$(BLUE)=== DIABETACTIC MAKEFILE ===$(NC)"
	@echo ""
	@echo "$(BLUE)STATE & DIAGNOSTICS:$(NC)"
	@echo "  make check-app        Check app state (device, APK, running)"
	@echo "  make apk-info         Show APK details"
	@echo "  make device-info      Show device details"
	@echo "  make logs             Show recent error logs"
	@echo ""
	@echo "$(BLUE)APP CONTROL:$(NC)"
	@echo "  make launch           Launch the app"
	@echo "  make stop             Stop the app"
	@echo "  make restart          Stop and restart the app"
	@echo "  make clear-data       Clear app cache"
	@echo ""
	@echo "$(BLUE)BUILD & DEPLOY:$(NC)"
	@echo "  make rebuild          Rebuild Android APK"
	@echo "  make deploy           Install APK to device"
	@echo "  make rebuild-deploy   Rebuild and install, then restart"
	@echo ""
	@echo "$(BLUE)SCREENSHOTS & TESTING:$(NC)"
	@echo "  make screenshot-home  Take home screen screenshot"
	@echo "  make test-ui-fast     Quick tab navigation with screenshots"
	@echo "  make test-ui          Full UI test"
	@echo "  make logs-tail        Follow app logs (Ctrl+C to stop)"
	@echo ""

# ============================================================================
# STATE CHECKING
# ============================================================================

check-app:
	@$(SCRIPTS_DIR)/check-state.sh

apk-info:
	@echo "$(BLUE)=== APK INFORMATION ===$(NC)"
	@if [ -f "$(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk" ]; then \
		echo "Size: $$(du -h $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk | cut -f1)"; \
		echo "Built: $$(stat -c %y $(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk | cut -d' ' -f1-2)"; \
	else \
		echo "$(RED)APK not built yet$(NC)"; \
	fi

device-info:
	@echo "$(BLUE)=== DEVICE INFORMATION ===$(NC)"
	@echo "Device: $$(adb shell getprop ro.product.model)"
	@echo "Android: $$(adb shell getprop ro.build.version.release)"
	@echo "API Level: $$(adb shell getprop ro.build.version.sdk)"

# ============================================================================
# APP CONTROL
# ============================================================================

launch:
	@echo "$(BLUE)Launching app...$(NC)"
	@adb shell am start -n "$(APP_ID)/.MainActivity"
	@sleep 3
	@echo "$(GREEN)✓ App launched$(NC)"

stop:
	@echo "$(BLUE)Stopping app...$(NC)"
	@adb shell am force-stop "$(APP_ID)"
	@sleep 1
	@echo "$(GREEN)✓ App stopped$(NC)"

restart: stop
	@sleep 2
	@$(MAKE) launch

clear-data:
	@echo "$(YELLOW)⚠ Clearing app data...$(NC)"
	@adb shell pm clear "$(APP_ID)"
	@sleep 2
	@echo "$(GREEN)✓ App data cleared$(NC)"

# ============================================================================
# BUILD & DEPLOY
# ============================================================================

rebuild:
	@echo "$(BLUE)=== REBUILDING APK ===$(NC)"
	@cd $(ANDROID_DIR) && \
	JAVA_HOME=$(JAVA_HOME) ANDROID_HOME=$(ANDROID_HOME) ./gradlew assembleDebug --no-daemon && \
	echo "$(GREEN)✓ Build successful$(NC)"

deploy:
	@echo "$(BLUE)=== INSTALLING APK ===$(NC)"
	@if [ -f "$(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk" ]; then \
		adb install -r "$(ANDROID_DIR)/app/build/outputs/apk/debug/app-debug.apk" && \
		echo "$(GREEN)✓ APK installed$(NC)"; \
	else \
		echo "$(RED)✗ APK not found. Run 'make rebuild' first$(NC)"; \
		exit 1; \
	fi

rebuild-deploy: rebuild deploy restart

# ============================================================================
# SCREENSHOTS & TESTING
# ============================================================================

screenshot-home:
	@echo "$(BLUE)Taking screenshot...$(NC)"
	@adb shell screencap -p /sdcard/temp.png && \
	adb pull /sdcard/temp.png /tmp/screenshot-home.png > /dev/null 2>&1 && \
	echo "$(GREEN)✓ Saved to: /tmp/screenshot-home.png$(NC)"

screenshot-readings:
	@echo "$(BLUE)Taking readings screenshot...$(NC)"
	@adb shell screencap -p /sdcard/temp.png && \
	adb pull /sdcard/temp.png /tmp/screenshot-readings.png > /dev/null 2>&1 && \
	echo "$(GREEN)✓ Saved to: /tmp/screenshot-readings.png$(NC)"

test-ui-fast:
	@echo "$(BLUE)=== QUICK UI TEST ===$(NC)"
	@$(MAKE) restart
	@echo "$(BLUE)Capturing screenshots...$(NC)"
	@mkdir -p /tmp/ui-test-fast
	@adb shell screencap -p /sdcard/temp.png && adb pull /sdcard/temp.png /tmp/ui-test-fast/01-home.png > /dev/null 2>&1
	@echo "$(GREEN)✓ Screenshots saved to /tmp/ui-test-fast/$(NC)"

test-ui:
	@$(SCRIPTS_DIR)/quick-ui-test.sh

# ============================================================================
# LOGGING & DEBUGGING
# ============================================================================

logs:
	@echo "$(BLUE)=== RECENT APP ERRORS ===$(NC)"
	@adb logcat -d | grep -iE "error|crash|exception|native http|cors" | tail -20

logs-tail:
	@echo "$(BLUE)Following app logs (Ctrl+C to stop)...$(NC)"
	@adb logcat | grep -E "Capacitor|Native HTTP|Angular|Ionic|diabetify|error|Exception" --line-buffered

# ============================================================================
# DEFAULT
# ============================================================================

.DEFAULT_GOAL := help

# Print goal when running make
.PHONY: $(MAKECMDGOALS)
