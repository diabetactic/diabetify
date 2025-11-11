/**
 * Comprehensive E2E User Journey Tests
 * Tests complete user workflows with DOM verification
 */

import { test, expect, Page } from '@playwright/test';
import { DashboardPageObject } from '../../src/app/tests/pages/dashboard.page';

// Test data
const testUser = {
  email: 'test@diabetactic.com',
  password: 'Test123!@#',
  firstName: 'John',
  lastName: 'Doe',
  profile: {
    diabetesType: 'type1',
    glucoseUnit: 'mg/dL',
    targetMin: 70,
    targetMax: 180
  }
};

const testReadings = [
  { value: 95, notes: 'Fasting', time: '08:00' },
  { value: 145, notes: 'After breakfast', time: '10:00' },
  { value: 110, notes: 'Before lunch', time: '12:00' },
  { value: 165, notes: 'After lunch', time: '14:00' },
  { value: 85, notes: 'Before dinner', time: '18:00' },
  { value: 125, notes: 'After dinner', time: '20:00' }
];

test.describe('Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated session
    await page.addInitScript(() => {
      const authData = {
        token: 'test-jwt-token',
        user: {
          id: 'test-user-id',
          email: 'test@diabetactic.com',
          firstName: 'John',
          lastName: 'Doe'
        },
        expiresAt: Date.now() + 3600000
      };
      localStorage.setItem('auth_data', JSON.stringify(authData));
      localStorage.setItem('onboarding_completed', 'true');
    });
  });

  test('New user onboarding flow with profile setup', async ({ page }) => {
    // Clear auth for onboarding test
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/');

    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/);

    // Welcome screen
    await expect(page.locator('h1')).toContainText('Welcome to Diabetify');
    await page.getByRole('button', { name: 'Get Started' }).click();

    // Registration form
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);
    await page.fill('[name="firstName"]', testUser.firstName);
    await page.fill('[name="lastName"]', testUser.lastName);

    // Validate form shows no errors
    await expect(page.locator('.error-message')).toHaveCount(0);

    await page.getByRole('button', { name: 'Create Account' }).click();

    // Profile setup
    await page.waitForURL(/\/profile-setup/);

    // Select diabetes type
    await page.selectOption('#diabetes-type', testUser.profile.diabetesType);

    // Set glucose targets
    await page.fill('#target-min', testUser.profile.targetMin.toString());
    await page.fill('#target-max', testUser.profile.targetMax.toString());

    // Select glucose unit
    await page.locator(`[value="${testUser.profile.glucoseUnit}"]`).click();

    await page.getByRole('button', { name: 'Complete Setup' }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/tabs\/dashboard/);

    // Verify welcome message
    await expect(page.locator('.greeting-text')).toContainText(testUser.firstName);
  });

  test('Daily glucose management workflow', async ({ page }) => {
    const dashboard = new DashboardPageObject(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    // Add morning fasting reading
    await dashboard.addQuickReading(testReadings[0].value, testReadings[0].notes);

    // Verify reading appears in stats
    const lastReading = await dashboard.getStatValue('last-reading');
    expect(lastReading).toContain(testReadings[0].value.toString());

    // Navigate to readings page for detailed entry
    await page.getByRole('tab', { name: /readings/i }).click();
    await expect(page).toHaveURL(/\/tabs\/readings/);

    // Add multiple readings throughout the day
    for (const reading of testReadings.slice(1)) {
      await page.getByRole('button', { name: /add reading/i }).click();

      // Fill detailed form
      await page.fill('#glucose-value', reading.value.toString());
      await page.fill('#reading-notes', reading.notes);

      // Set time
      const now = new Date();
      const [hours, minutes] = reading.time.split(':');
      now.setHours(parseInt(hours), parseInt(minutes));
      await page.fill('#reading-datetime', now.toISOString().slice(0, 16));

      // Select meal tag if applicable
      if (reading.notes.includes('After')) {
        await page.selectOption('#meal-tag', 'post-meal');
        await page.fill('#time-after-meal', '2'); // 2 hours after meal
      } else if (reading.notes.includes('Before')) {
        await page.selectOption('#meal-tag', 'pre-meal');
      }

      await page.getByRole('button', { name: /save/i }).click();

      // Verify reading appears in list
      await expect(page.locator('.reading-item').first()).toContainText(reading.value.toString());
    }

    // Return to dashboard to check updated stats
    await page.getByRole('tab', { name: /dashboard/i }).click();
    await dashboard.waitForLoad();

    // Verify statistics updated
    const stats = await dashboard.getAllStats();
    expect(parseInt(stats.total)).toBeGreaterThanOrEqual(testReadings.length);

    // Check if in target range
    const isInRange = await dashboard.isInTargetRange();
    expect(isInRange).toBeDefined();
  });

  test('Appointment and video consultation flow', async ({ page }) => {
    const dashboard = new DashboardPageObject(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    // Check for appointments
    const hasAppointments = await dashboard.hasAppointments();

    if (hasAppointments) {
      // Navigate to appointments
      await dashboard.goToAppointments();

      // View appointment details
      const appointmentCard = page.locator('.appointment-card').first();
      await appointmentCard.click();

      // Check appointment details page
      await expect(page.locator('h1')).toContainText('Appointment Details');

      // Check for video call availability
      const videoButton = page.locator('.video-call-button');
      const isVideoAvailable = await videoButton.isVisible();

      if (isVideoAvailable) {
        // Prepare for call
        await page.getByRole('button', { name: /prepare for call/i }).click();

        // Check pre-call checklist
        await expect(page.locator('.pre-call-checklist')).toBeVisible();

        // Complete checklist items
        const checklistItems = page.locator('.checklist-item input[type="checkbox"]');
        const count = await checklistItems.count();

        for (let i = 0; i < count; i++) {
          await checklistItems.nth(i).check();
        }

        // Join call button should be enabled
        const joinButton = page.getByRole('button', { name: /join video call/i });
        await expect(joinButton).toBeEnabled();
      }
    }

    // Schedule new appointment
    await page.getByRole('button', { name: /schedule appointment/i }).click();

    // Fill appointment form
    await page.selectOption('#appointment-type', 'follow-up');
    await page.selectOption('#provider', 'Dr. Smith');

    // Select date (next week)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    await page.fill('#appointment-date', nextWeek.toISOString().slice(0, 10));

    // Select time slot
    await page.locator('[data-time="10:00"]').click();

    // Add notes
    await page.fill('#appointment-notes', 'Regular check-up, discuss recent readings');

    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify appointment created
    await expect(page.locator('.success-toast')).toContainText('Appointment scheduled');
  });

  test('Data export and sharing workflow', async ({ page }) => {
    const dashboard = new DashboardPageObject(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    // Export data in different formats
    await dashboard.exportData('csv');

    // Verify download started
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('.csv');

    // Test PDF export
    await dashboard.exportData('pdf');
    const pdfDownload = await page.waitForEvent('download');
    expect(pdfDownload.suggestedFilename()).toContain('.pdf');

    // Share glucose data
    await dashboard.shareData();

    // Check share dialog
    const shareDialog = page.locator('.share-dialog');
    await expect(shareDialog).toBeVisible();

    // Select sharing options
    await page.locator('[data-share="healthcare-provider"]').check();
    await page.locator('[data-share="family-member"]').check();

    // Set sharing duration
    await page.selectOption('#share-duration', '7days');

    // Generate share link
    await page.getByRole('button', { name: /generate link/i }).click();

    // Copy link
    const shareLink = await page.locator('.share-link-input').inputValue();
    expect(shareLink).toContain('https://');

    await page.getByRole('button', { name: /copy link/i }).click();
    await expect(page.locator('.success-message')).toContainText('Link copied');
  });

  test('Settings and preferences management', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');

    // Test theme switching
    const themeToggle = page.locator('#theme-toggle');
    await themeToggle.click();

    // Verify dark mode applied
    await expect(page.locator('body')).toHaveClass(/dark/);

    // Change glucose units
    await page.locator('[data-setting="glucose-unit"]').click();
    await page.selectOption('#glucose-unit-select', 'mmol/L');

    // Verify conversion message
    await expect(page.locator('.info-message')).toContainText('Values will be converted');

    // Update notification preferences
    await page.locator('[data-setting="notifications"]').click();

    // Enable reminder notifications
    await page.locator('#reminder-notifications').check();
    await page.selectOption('#reminder-frequency', 'every-4-hours');

    // Set quiet hours
    await page.locator('#quiet-hours-enabled').check();
    await page.fill('#quiet-start', '22:00');
    await page.fill('#quiet-end', '07:00');

    // Save settings
    await page.getByRole('button', { name: /save preferences/i }).click();
    await expect(page.locator('.success-toast')).toContainText('Settings saved');

    // Test data privacy settings
    await page.locator('[data-setting="privacy"]').click();

    // Review data sharing
    await expect(page.locator('.data-sharing-list')).toBeVisible();

    // Revoke specific access
    const revokeButtons = page.locator('.revoke-access-button');
    if (await revokeButtons.count() > 0) {
      await revokeButtons.first().click();
      await page.getByRole('button', { name: /confirm revoke/i }).click();
      await expect(page.locator('.success-message')).toContainText('Access revoked');
    }

    // Export personal data
    await page.getByRole('button', { name: /export my data/i }).click();
    const dataExport = await page.waitForEvent('download');
    expect(dataExport.suggestedFilename()).toContain('personal-data');
  });

  test('Sync with external devices and services', async ({ page }) => {
    const dashboard = new DashboardPageObject(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    // Initiate sync
    await dashboard.syncData();

    // Navigate to sync settings
    await page.goto('/settings/sync');

    // Connect new device
    await page.getByRole('button', { name: /add device/i }).click();

    // Select device type
    await page.selectOption('#device-type', 'cgm');
    await page.selectOption('#device-brand', 'dexcom');
    await page.selectOption('#device-model', 'g6');

    // Enter device credentials
    await page.fill('#device-username', 'cgm_user');
    await page.fill('#device-password', 'cgm_pass');

    // Test connection
    await page.getByRole('button', { name: /test connection/i }).click();

    // Wait for connection test
    await expect(page.locator('.connection-status')).toContainText(/success|connected/i, {
      timeout: 10000
    });

    // Save device
    await page.getByRole('button', { name: /save device/i }).click();

    // Verify device appears in list
    await expect(page.locator('.connected-devices')).toContainText('Dexcom G6');

    // Configure auto-sync
    await page.locator('#auto-sync-enabled').check();
    await page.selectOption('#sync-interval', '15min');

    // Set up Tidepool integration
    await page.locator('[data-service="tidepool"]').click();

    if (!(await page.locator('.tidepool-connected').isVisible())) {
      await page.fill('#tidepool-email', 'user@tidepool.org');
      await page.fill('#tidepool-password', 'tidepool_pass');
      await page.getByRole('button', { name: /connect tidepool/i }).click();

      await expect(page.locator('.success-message')).toContainText('Tidepool connected');
    }

    // Trigger manual sync
    await page.getByRole('button', { name: /sync now/i }).click();

    // Monitor sync progress
    await expect(page.locator('.sync-progress')).toBeVisible();
    await expect(page.locator('.sync-status')).toContainText(/completed|synced/i, {
      timeout: 15000
    });
  });

  test('Error recovery and offline functionality', async ({ page, context }) => {
    const dashboard = new DashboardPageObject(page);
    await dashboard.goto();
    await dashboard.waitForLoad();

    // Test offline mode
    await context.setOffline(true);

    // Try to add reading while offline
    await dashboard.addQuickReading(120, 'Offline test');

    // Should show offline indicator
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.offline-message')).toContainText('Working offline');

    // Reading should be saved locally
    await page.getByRole('tab', { name: /readings/i }).click();
    await expect(page.locator('.reading-item').first()).toContainText('120');
    await expect(page.locator('.sync-pending')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Auto-sync should trigger
    await expect(page.locator('.sync-in-progress')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.sync-complete')).toBeVisible({ timeout: 10000 });

    // Test error handling
    await page.route('**/api/readings', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    // Try operation that will fail
    await dashboard.addQuickReading(130, 'Error test');

    // Should show error message
    await expect(page.locator('.error-toast')).toBeVisible();
    await expect(page.locator('.error-toast')).toContainText('Failed to save');

    // Retry button should be available
    const retryButton = page.locator('[data-action="retry"]');
    await expect(retryButton).toBeVisible();

    // Clear route override
    await page.unroute('**/api/readings');

    // Retry should succeed
    await retryButton.click();
    await expect(page.locator('.success-toast')).toContainText('Reading saved');
  });

  test('Accessibility navigation with keyboard only', async ({ page }) => {
    await page.goto('/tabs/dashboard');

    // Start with focus on first interactive element
    await page.keyboard.press('Tab');

    // Navigate through main nav tabs
    for (const tab of ['Dashboard', 'Readings', 'Appointments', 'Profile']) {
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused).toBeDefined();
      await page.keyboard.press('Tab');
    }

    // Use arrow keys in tab bar
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/tabs\/readings/);

    // Navigate back with keyboard
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/tabs\/dashboard/);

    // Access quick actions with keyboard
    await page.keyboard.press('Tab'); // Focus on first action
    await page.keyboard.press('Enter'); // Activate add reading

    // Form should be accessible
    await expect(page.locator('.quick-entry-form')).toBeVisible();

    // Tab through form fields
    await page.keyboard.press('Tab'); // Focus glucose input
    await page.keyboard.type('110');

    await page.keyboard.press('Tab'); // Focus notes
    await page.keyboard.type('Keyboard test');

    await page.keyboard.press('Tab'); // Focus save button
    await page.keyboard.press('Enter'); // Submit

    // Verify submission
    await expect(page.locator('.success-toast')).toBeVisible();

    // Test escape key to close dialogs
    await page.keyboard.press('Escape');
    await expect(page.locator('.quick-entry-form')).not.toBeVisible();
  });

  test('Performance monitoring during heavy usage', async ({ page }) => {
    const dashboard = new DashboardPageObject(page);

    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.performanceMetrics.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      });
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    });

    await dashboard.goto();
    await dashboard.waitForLoad();

    // Perform intensive operations
    const operations = [];

    // Add multiple readings rapidly
    for (let i = 0; i < 10; i++) {
      operations.push(dashboard.addQuickReading(100 + i * 5, `Perf test ${i}`));
    }

    await Promise.all(operations);

    // Change time ranges multiple times
    for (const range of ['7d', '30d', '24h']) {
      await dashboard.selectTimeRange(range as any);
    }

    // Get performance metrics
    const metrics = await page.evaluate(() => window.performanceMetrics);

    // Verify acceptable performance
    const longTasks = metrics.filter(m => m.duration > 50);
    expect(longTasks.length).toBeLessThan(5); // No more than 5 long tasks

    // Check memory usage
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB

    // Verify no memory leaks after navigation
    await page.goto('/tabs/readings');
    await page.goto('/tabs/dashboard');

    const memoryAfterNav = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory should not grow significantly
    expect(memoryAfterNav).toBeLessThan(memoryUsage * 1.2);
  });
});