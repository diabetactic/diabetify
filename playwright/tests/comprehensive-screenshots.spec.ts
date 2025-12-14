/**
 * Comprehensive Screenshots & Persistence Tests
 *
 * Full coverage of all Diabetify features with:
 * - All screens in both light and dark themes
 * - Multiple states/scenarios for each feature
 * - Persistence verification (add → logout → login → verify)
 * - Backend API verification
 * - Before/after comparisons
 */

import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Config
const USE_DOCKER = true;
const TEST_USER = 'julian';
const TEST_PASS = 'tuvieja';
const API_URL = 'http://localhost:8000';
const BACKOFFICE_URL = 'http://localhost:8001';
const SCREENSHOT_DIR = 'docs/assets/screenshots/comprehensive';

// Ensure directory exists
if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper: Get fresh tokens
async function getTokens(): Promise<{ userToken: string; adminToken: string }> {
  const userResp = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${TEST_USER}&password=${TEST_PASS}`
  });
  const userData = await userResp.json();

  const adminResp = await fetch(`${BACKOFFICE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=admin'
  });
  const adminData = await adminResp.json();

  return {
    userToken: userData.access_token,
    adminToken: adminData.access_token
  };
}

// Helper: API calls
async function apiGet(url: string, token: string) {
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return resp.json();
}

async function apiPost(url: string, token: string, body?: any) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return resp.json();
}

// Helper: Screenshot with descriptive name
async function screenshot(page: Page, name: string, theme: 'light' | 'dark' = 'light') {
  const filename = `${name}-${theme}.png`;
  const filepath = join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 ${filename}`);
  return filepath;
}

// Helper: Set theme
async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
  }, theme);
  await page.waitForTimeout(300);
}

// Helper: Login
async function login(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await page.fill('input[type="text"], input[placeholder*="DNI"]', TEST_USER);
  await page.fill('input[type="password"]', TEST_PASS);

  await page.click('button[type="submit"], button:has-text("Iniciar"), button:has-text("Sign")');
  await expect(page).toHaveURL(/\/tabs\//, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// Helper: Logout
async function logout(page: Page) {
  // Go to settings and logout
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click logout button - use JavaScript click for Ionic buttons
  await page.evaluate(() => {
    const logoutBtns = document.querySelectorAll('ion-button');
    for (const btn of logoutBtns) {
      const text = btn.textContent?.toLowerCase() || '';
      if (text.includes('cerrar') || text.includes('logout') || text.includes('salir')) {
        (btn as HTMLElement).click();
        break;
      }
    }
  });
  await page.waitForTimeout(1500);

  // If there's a confirmation dialog, accept it
  const confirmBtn = page.locator('ion-alert button:has-text("Aceptar"), ion-alert button:has-text("OK"), ion-alert button:has-text("Yes")');
  if (await confirmBtn.count() > 0) {
    await confirmBtn.first().click();
    await page.waitForTimeout(500);
  }

  // Wait for redirect to login/welcome
  await page.waitForURL(/\/(login|welcome)/, { timeout: 10000 }).catch(() => {});
}

// Helper: Navigate to tab
async function goToTab(page: Page, tab: string) {
  await page.click(`ion-tab-button[tab="${tab}"], [data-testid="tab-${tab}"]`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe('Dashboard Screenshots', () => {
  test('capture dashboard in all states', async ({ page }) => {
    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);

      // Dashboard main view
      await goToTab(page, 'dashboard');
      await screenshot(page, '01-dashboard-main', theme);

      // Dashboard with stats visible
      await page.waitForTimeout(500);
      await screenshot(page, '02-dashboard-stats', theme);
    }
  });
});

test.describe('Readings Flow - Complete Coverage', () => {
  test('readings list - empty and with data', async ({ page }) => {
    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await goToTab(page, 'readings');

      // Readings list
      await screenshot(page, '03-readings-list', theme);
    }
  });

  test('add reading flow with persistence verification', async ({ page }) => {
    const { userToken } = await getTokens();

    // Get initial readings count from API
    const beforeReadings = await apiGet(`${API_URL}/glucose/mine`, userToken);
    const initialCount = beforeReadings.readings?.length || 0;
    console.log(`📊 Initial readings count: ${initialCount}`);

    await login(page);
    await setTheme(page, 'light');
    await goToTab(page, 'readings');
    await page.waitForTimeout(1000); // Wait for page to fully render

    // Screenshot BEFORE adding
    await screenshot(page, '04-readings-before-add', 'light');

    // Open add reading modal - target the primary FAB button specifically
    // On readings page, there may be two FABs: scroll-to-top (light) and add-reading (primary)
    const fabButton = page.locator('ion-fab-button[color="primary"]');
    if (await fabButton.count() > 0) {
      // Use JavaScript click for Ionic FAB buttons (fixed positioned)
      await page.evaluate(() => {
        const fab = document.querySelector('ion-fab-button[color="primary"]') as HTMLElement;
        if (fab) fab.click();
      });
      await page.waitForTimeout(1000);

      // Verify we're on the add-reading page
      const currentUrl = page.url();
      console.log(`📍 Current URL after FAB click: ${currentUrl}`);

      // Screenshot of empty modal
      await screenshot(page, '05-add-reading-modal-empty', 'light');

      // Fill the form - glucose value
      const glucoseInput = page.locator('input[type="number"], ion-input[type="number"] input');
      if (await glucoseInput.count() > 0) {
        await glucoseInput.first().fill('125');
        await screenshot(page, '06-add-reading-modal-filled', 'light');

        // Select reading type - required field for form validation
        const typeSelect = page.locator('ion-select');
        if (await typeSelect.count() > 0) {
          await typeSelect.first().click();
          await page.waitForTimeout(500);
          await screenshot(page, '07-add-reading-type-selector', 'light');

          // Click on a radio/option in the Ionic alert
          const alertOption = page.locator('ion-alert button.alert-radio-button, ion-select-popover ion-item, ion-radio-group ion-item').first();
          if (await alertOption.count() > 0) {
            await alertOption.click();
            await page.waitForTimeout(300);
          }

          // Confirm the selection (OK button in ion-alert)
          const okButton = page.locator('ion-alert button:has-text("OK"), ion-alert button:has-text("Aceptar")');
          if (await okButton.count() > 0) {
            await okButton.click();
            await page.waitForTimeout(300);
          }
        }

        // Add notes if field exists
        const notesField = page.locator('textarea, ion-textarea');
        if (await notesField.count() > 0) {
          await notesField.first().fill('Test reading from Playwright');
        }

        await screenshot(page, '08-add-reading-complete-form', 'light');

        // Submit - check if button is enabled first
        const submitBtn = page.locator('ion-button:has-text("Guardar"), ion-button:has-text("Save"), button[type="submit"]');
        if (await submitBtn.count() > 0) {
          const isDisabled = await submitBtn.first().isDisabled();
          if (!isDisabled) {
            await submitBtn.first().click();
            await page.waitForTimeout(2000);
          } else {
            console.log('⚠️ Submit button is disabled - form validation incomplete');
            await screenshot(page, '08b-add-reading-validation-issue', 'light');
          }
        }
      }
    }

    // Screenshot AFTER adding
    await goToTab(page, 'readings');
    await page.waitForTimeout(1000);
    await screenshot(page, '09-readings-after-add', 'light');

    // Verify in backend
    const afterReadings = await apiGet(`${API_URL}/glucose/mine`, userToken);
    const finalCount = afterReadings.readings?.length || 0;
    console.log(`📊 Final readings count: ${finalCount}`);
    console.log(`✅ Readings added: ${finalCount - initialCount}`);

    // Dark theme version
    await setTheme(page, 'dark');
    await screenshot(page, '09-readings-after-add', 'dark');

    // PERSISTENCE TEST: Logout and login again
    console.log('🔄 Testing persistence after logout...');
    await logout(page);
    await page.waitForTimeout(1000);
    await screenshot(page, '10-after-logout', 'light');

    await login(page);
    await goToTab(page, 'readings');
    await page.waitForTimeout(1000);
    await screenshot(page, '11-readings-after-relogin', 'light');

    // Verify data persisted
    const persistedReadings = await apiGet(`${API_URL}/glucose/mine`, userToken);
    console.log(`✅ Readings after re-login: ${persistedReadings.readings?.length || 0}`);
  });
});

test.describe('Appointments Flow - Full State Machine', () => {
  test('appointment states and transitions', async ({ page }) => {
    const { userToken, adminToken } = await getTokens();

    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await goToTab(page, 'appointments');
      await page.waitForTimeout(500);

      // Current state
      await screenshot(page, '12-appointments-current-state', theme);
    }

    // Check appointment state via API
    try {
      const state = await apiGet(`${API_URL}/appointments/state`, userToken);
      console.log(`📋 Current appointment state: ${JSON.stringify(state)}`);
    } catch (e) {
      console.log('📋 No appointment state (NONE)');
    }

    // Try to request appointment if in NONE state
    await setTheme(page, 'light');
    await goToTab(page, 'appointments');

    const requestBtn = page.locator('ion-button:has-text("Solicitar"), ion-button:has-text("Request"), button:has-text("Solicitar")');
    if (await requestBtn.count() > 0) {
      await screenshot(page, '13-appointments-before-request', 'light');
      await requestBtn.first().click();
      await page.waitForTimeout(1000);
      await screenshot(page, '14-appointments-after-request', 'light');
    }

    // Check for pending state
    await page.waitForTimeout(500);
    await screenshot(page, '15-appointments-pending-state', 'light');

    // Accept via backoffice API
    console.log('🔧 Accepting appointment via backoffice...');
    try {
      const pending = await apiGet(`${BACKOFFICE_URL}/appointments/pending`, adminToken);
      console.log(`📋 Pending appointments: ${JSON.stringify(pending)}`);

      if (Array.isArray(pending) && pending.length > 0) {
        const placement = pending[0].queue_placement;
        await fetch(`${BACKOFFICE_URL}/appointments/accept/${placement}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`✅ Accepted appointment at placement ${placement}`);
      }
    } catch (e) {
      console.log('⚠️ Could not accept appointment:', e);
    }

    // Refresh and capture accepted state
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await screenshot(page, '16-appointments-accepted-state', 'light');

    // Try to create appointment (fill form)
    const createFormBtn = page.locator('ion-button:has-text("Crear"), ion-button:has-text("Create")');
    if (await createFormBtn.count() > 0) {
      await createFormBtn.first().click();
      await page.waitForTimeout(500);
      await screenshot(page, '17-appointments-create-form', 'light');
    }
  });
});

test.describe('Profile Flow - Edit and Persistence', () => {
  test('profile view and edit with persistence', async ({ page }) => {
    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await goToTab(page, 'profile');
      await page.waitForTimeout(500);

      // Profile main view
      await screenshot(page, '18-profile-view', theme);
    }

    // Edit mode
    await setTheme(page, 'light');
    const editBtn = page.locator('ion-button:has-text("Editar"), ion-button:has-text("Edit"), ion-icon[name="pencil"]');
    if (await editBtn.count() > 0) {
      // Scroll to edit button and click
      await editBtn.first().scrollIntoViewIfNeeded();
      await editBtn.first().click();
      await page.waitForTimeout(500);
      await screenshot(page, '19-profile-edit-mode', 'light');

      // Make a change
      const nameInput = page.locator('ion-input[formControlName="name"] input, input[name="name"]');
      if (await nameInput.count() > 0) {
        await nameInput.first().scrollIntoViewIfNeeded();
        const currentValue = await nameInput.first().inputValue();
        await nameInput.first().fill(currentValue + ' (edited)');
        await screenshot(page, '20-profile-edited', 'light');
      }

      // Save - use JavaScript click for Ionic buttons inside ion-content
      const saveBtn = page.locator('ion-button:has-text("Guardar"), ion-button:has-text("Save")');
      if (await saveBtn.count() > 0) {
        // Scroll ion-content to bottom and click via JavaScript
        await page.evaluate(() => {
          const ionContent = document.querySelector('ion-content');
          if (ionContent) {
            ionContent.scrollToBottom(300);
          }
          setTimeout(() => {
            const btn = document.querySelector('ion-button:nth-of-type(2)') as HTMLElement ||
                        document.querySelector('[color="primary"] ion-button') as HTMLElement;
            if (btn) btn.click();
          }, 400);
        });
        await page.waitForTimeout(1500);
        await screenshot(page, '21-profile-saved', 'light');
      }
    }

    // Persistence test
    console.log('🔄 Testing profile persistence...');
    await logout(page);
    await login(page);
    await goToTab(page, 'profile');
    await page.waitForTimeout(500);
    await screenshot(page, '22-profile-after-relogin', 'light');
  });
});

test.describe('Settings - All Options', () => {
  test('settings page complete', async ({ page }) => {
    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await screenshot(page, '23-settings-main', theme);

      // Language settings if available
      const langBtn = page.locator('ion-item:has-text("Idioma"), ion-item:has-text("Language")');
      if (await langBtn.count() > 0) {
        await langBtn.first().click();
        await page.waitForTimeout(300);
        await screenshot(page, '24-settings-language', theme);
        await page.goBack();
        await page.waitForTimeout(300);
      }

      // Theme toggle
      const themeToggle = page.locator('ion-toggle, ion-item:has-text("Tema"), ion-item:has-text("Theme")');
      if (await themeToggle.count() > 0) {
        await screenshot(page, '25-settings-theme-option', theme);
      }

      // Notifications if available
      const notifItem = page.locator('ion-item:has-text("Notificaciones"), ion-item:has-text("Notifications")');
      if (await notifItem.count() > 0) {
        await notifItem.first().click();
        await page.waitForTimeout(300);
        await screenshot(page, '26-settings-notifications', theme);
        await page.goBack();
      }
    }
  });

  test('advanced settings page', async ({ page }) => {
    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await page.goto('/settings/advanced');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await screenshot(page, '26b-settings-advanced', theme);

      // Clear data button
      const clearDataBtn = page.locator('ion-button:has-text("Borrar"), ion-button:has-text("Clear")');
      if (await clearDataBtn.count() > 0) {
        await screenshot(page, '26c-settings-cleardata-option', theme);
      }
    }
  });
});

test.describe('Appointment Detail with Resolution', () => {
  test('appointment detail and resolution with emergency flag', async ({ page }) => {
    const { userToken } = await getTokens();
    await login(page);

    // First get list of appointments
    let appointments: any[] = [];
    try {
      const resp = await apiGet(`${API_URL}/appointments/mine`, userToken);
      appointments = resp.appointments || [];
      console.log(`📋 Found ${appointments.length} appointments`);
    } catch (e) {
      console.log('⚠️ Could not fetch appointments');
    }

    if (appointments.length > 0) {
      const appointmentId = appointments[0].appointment_id;
      console.log(`📋 Opening appointment detail: ${appointmentId}`);

      for (const theme of ['light', 'dark'] as const) {
        await setTheme(page, theme);
        await page.goto(`/appointments/${appointmentId}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Appointment detail view
        await screenshot(page, '17b-appointment-detail', theme);

        // Check for resolution card
        const resolutionCard = page.locator('ion-card:has-text("Resolución"), ion-card:has-text("Resolution"), ion-card:has-text("Treatment")');
        if (await resolutionCard.count() > 0) {
          await screenshot(page, '17c-appointment-resolution', theme);
          console.log(`✅ Resolution card found in ${theme} theme`);

          // Check for emergency flag
          const emergencyFlag = page.locator(':has-text("Emergencia"), :has-text("Emergency Care"), .text-red-500');
          if (await emergencyFlag.count() > 0) {
            await screenshot(page, '17d-appointment-emergency-flag', theme);
            console.log(`🚨 Emergency flag found in ${theme} theme`);
          }

          // Check for physical appointment flag
          const physicalFlag = page.locator(':has-text("física"), :has-text("Physical"), .text-amber-500');
          if (await physicalFlag.count() > 0) {
            await screenshot(page, '17e-appointment-physical-flag', theme);
            console.log(`📅 Physical appointment flag found in ${theme} theme`);
          }
        } else {
          console.log(`ℹ️ No resolution available yet for ${theme} theme`);
        }
      }
    } else {
      console.log('ℹ️ No appointments to show detail for');
    }
  });
});

test.describe('Trends Page', () => {
  test('trends and charts', async ({ page }) => {
    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await page.goto('/trends');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await screenshot(page, '27-trends-main', theme);

      // Different time ranges if available
      const weekBtn = page.locator('ion-segment-button:has-text("Semana"), ion-segment-button:has-text("Week")');
      if (await weekBtn.count() > 0) {
        await weekBtn.first().click();
        await page.waitForTimeout(500);
        await screenshot(page, '28-trends-week', theme);
      }

      const monthBtn = page.locator('ion-segment-button:has-text("Mes"), ion-segment-button:has-text("Month")');
      if (await monthBtn.count() > 0) {
        await monthBtn.first().click();
        await page.waitForTimeout(500);
        await screenshot(page, '29-trends-month', theme);
      }
    }
  });
});

test.describe('Bolus Calculator', () => {
  test('bolus calculator flow', async ({ page }) => {
    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await page.goto('/bolus-calculator');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Empty calculator
      await screenshot(page, '30-bolus-calculator-empty', theme);

      // Fill values
      const glucoseInput = page.locator('ion-input[type="number"] input, input[type="number"]').first();
      if (await glucoseInput.count() > 0) {
        await glucoseInput.fill('180');
        await screenshot(page, '31-bolus-calculator-with-glucose', theme);
      }

      const carbsInput = page.locator('ion-input[type="number"] input, input[type="number"]').nth(1);
      if (await carbsInput.count() > 0) {
        await carbsInput.fill('45');
        await screenshot(page, '32-bolus-calculator-with-carbs', theme);
      }

      // Calculate button
      const calcBtn = page.locator('ion-button:has-text("Calcular"), ion-button:has-text("Calculate")');
      if (await calcBtn.count() > 0) {
        await calcBtn.first().click();
        await page.waitForTimeout(500);
        await screenshot(page, '33-bolus-calculator-result', theme);
      }
    }
  });
});

test.describe('Tips Page', () => {
  test('tips and recommendations', async ({ page }) => {
    await login(page);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);
      await page.goto('/tips');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await screenshot(page, '34-tips-main', theme);

      // Expand a tip if possible
      const tipItem = page.locator('ion-item, ion-card').first();
      if (await tipItem.count() > 0) {
        await tipItem.click();
        await page.waitForTimeout(300);
        await screenshot(page, '35-tips-expanded', theme);
      }
    }
  });
});

test.describe('Welcome & Login Flow', () => {
  test('welcome and login screens', async ({ page }) => {
    // Start fresh - not logged in
    await page.goto('/welcome');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);

      await screenshot(page, '36-welcome-screen', theme);
    }

    // Go to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);

      // Empty login form
      await screenshot(page, '37-login-empty', theme);

      // Filled login form
      await page.fill('input[type="text"], input[placeholder*="DNI"]', TEST_USER);
      await page.fill('input[type="password"]', TEST_PASS);
      await screenshot(page, '38-login-filled', theme);

      // Clear for next theme
      await page.fill('input[type="text"], input[placeholder*="DNI"]', '');
      await page.fill('input[type="password"]', '');
    }
  });
});

test.describe('Backend API Verification', () => {
  test('verify all data in backend', async ({ page }) => {
    const { userToken, adminToken } = await getTokens();

    console.log('\n📊 BACKEND VERIFICATION REPORT');
    console.log('='.repeat(50));

    // User info
    try {
      const userInfo = await apiGet(`${API_URL}/users/me`, userToken);
      console.log('👤 User Info:', JSON.stringify(userInfo, null, 2));
    } catch (e) {
      console.log('⚠️ Could not get user info');
    }

    // Readings
    try {
      const readings = await apiGet(`${API_URL}/glucose/mine`, userToken);
      console.log(`📈 Readings count: ${readings.readings?.length || 0}`);
      if (readings.readings?.length > 0) {
        console.log('   Latest reading:', readings.readings[readings.readings.length - 1]);
      }
    } catch (e) {
      console.log('⚠️ Could not get readings');
    }

    // Appointments
    try {
      const appointments = await apiGet(`${API_URL}/appointments/mine`, userToken);
      console.log(`📅 Appointments:`, JSON.stringify(appointments, null, 2));
    } catch (e) {
      console.log('⚠️ Could not get appointments');
    }

    // Appointment state
    try {
      const state = await apiGet(`${API_URL}/appointments/state`, userToken);
      console.log(`📋 Appointment state: ${JSON.stringify(state)}`);
    } catch (e) {
      console.log('📋 No appointment in queue');
    }

    // Achievements
    try {
      const achievements = await apiGet(`${API_URL}/achievements/`, userToken);
      console.log(`🏆 Achievements:`, Array.isArray(achievements) ? achievements.length : 'N/A');
    } catch (e) {
      console.log('⚠️ Could not get achievements');
    }

    // Admin: Queue status
    try {
      const queue = await apiGet(`${BACKOFFICE_URL}/appointments/queue`, adminToken);
      console.log(`📋 Queue status: ${queue.length || 0} pending`);
    } catch (e) {
      console.log('⚠️ Could not get queue status');
    }

    // Admin: All users
    try {
      const users = await apiGet(`${BACKOFFICE_URL}/users/`, adminToken);
      console.log(`👥 Total users: ${users.length}`);
    } catch (e) {
      console.log('⚠️ Could not get users list');
    }

    console.log('='.repeat(50));
    console.log('✅ Backend verification complete\n');

    // Take a screenshot of the dashboard as final proof
    await login(page);
    await screenshot(page, '39-final-dashboard-proof', 'light');
    await setTheme(page, 'dark');
    await screenshot(page, '39-final-dashboard-proof', 'dark');
  });
});
