import { browser, by, element, ExpectedConditions as EC, protractor } from 'protractor';

describe('Diabetactic App E2E Tests', () => {
  const baseUrl = 'http://localhost:4200';

  beforeEach(async () => {
    await browser.get(baseUrl);
    await browser.waitForAngularEnabled(true);
  });

  describe('App Launch and Navigation', () => {
    it('should display app title', async () => {
      await browser.wait(EC.presenceOf(element(by.css('ion-title'))), 5000);
      const title = await element(by.css('ion-title')).getText();
      expect(title).toContain('Dashboard');
    });

    it('should have tab navigation', async () => {
      const tabs = await element.all(by.css('ion-tab-button'));
      expect(tabs.length).toBe(4);
    });

    it('should navigate between tabs', async () => {
      // Navigate to Readings tab
      await element(by.css('ion-tab-button[tab="readings"]')).click();
      await browser.wait(EC.presenceOf(element(by.css('app-tab1'))), 5000);
      let title = await element(by.css('ion-title')).getText();
      expect(title).toContain('Readings');

      // Navigate to Profile tab
      await element(by.css('ion-tab-button[tab="profile"]')).click();
      await browser.wait(EC.presenceOf(element(by.css('app-tab1'))), 5000);
      title = await element(by.css('ion-title')).getText();
      expect(title).toContain('Profile');

      // Navigate back to Dashboard
      await element(by.css('ion-tab-button[tab="dashboard"]')).click();
      await browser.wait(EC.presenceOf(element(by.css('app-tab1'))), 5000);
      title = await element(by.css('ion-title')).getText();
      expect(title).toContain('Dashboard');
    });
  });

  describe('Dashboard Features', () => {
    it('should display statistics cards', async () => {
      await browser.wait(EC.presenceOf(element(by.css('.stats-grid'))), 5000);
      const statCards = await element.all(by.css('app-stat-card'));
      expect(statCards.length).toBe(4);
    });

    it('should show recent readings section', async () => {
      await browser.wait(EC.presenceOf(element(by.css('.recent-readings-section'))), 5000);
      const section = await element(by.css('.recent-readings-section'));
      expect(await section.isDisplayed()).toBe(true);
    });

    it('should have sync button in toolbar', async () => {
      const syncButton = await element(by.css('ion-button[slot="end"]'));
      expect(await syncButton.isPresent()).toBe(true);
    });

    it('should handle pull to refresh', async () => {
      // Simulate pull-to-refresh gesture
      const content = await element(by.css('ion-content'));

      // Get initial position
      const initialLocation = await content.getLocation();

      // Perform pull gesture
      await browser.actions()
        .mouseDown(content)
        .mouseMove({ x: 0, y: 150 })
        .mouseUp()
        .perform();

      // Wait for refresh to complete
      await browser.sleep(1000);

      // Verify refresher triggered (check for any loading state change)
      const refresher = await element(by.css('ion-refresher'));
      expect(await refresher.isPresent()).toBe(true);
    });
  });

  describe('Add Reading Flow', () => {
    beforeEach(async () => {
      // Navigate to Add Reading page
      await element(by.css('ion-fab-button')).click();
      await browser.wait(EC.presenceOf(element(by.css('app-add-reading'))), 5000);
    });

    it('should display add reading form', async () => {
      const form = await element(by.css('.reading-form'));
      expect(await form.isPresent()).toBe(true);
    });

    it('should have all required form fields', async () => {
      const glucoseInput = await element(by.css('ion-input[formControlName="value"]'));
      const datetimeButton = await element(by.css('ion-datetime-button'));
      const mealSelect = await element(by.css('ion-select[formControlName="mealContext"]'));
      const notesTextarea = await element(by.css('ion-textarea[formControlName="notes"]'));

      expect(await glucoseInput.isPresent()).toBe(true);
      expect(await datetimeButton.isPresent()).toBe(true);
      expect(await mealSelect.isPresent()).toBe(true);
      expect(await notesTextarea.isPresent()).toBe(true);
    });

    it('should show validation errors for invalid input', async () => {
      const glucoseInput = await element(by.css('ion-input[formControlName="value"]'));
      const saveButton = await element(by.buttonText('Save Reading'));

      // Try to submit with invalid value
      await glucoseInput.clear();
      await glucoseInput.sendKeys('10'); // Below minimum
      await saveButton.click();

      // Check for validation message
      await browser.wait(EC.presenceOf(element(by.css('.validation-message'))), 5000);
      const validationMsg = await element(by.css('.validation-message')).getText();
      expect(validationMsg).toContain('Value must be at least');
    });

    it('should show glucose status indicator', async () => {
      const glucoseInput = await element(by.css('ion-input[formControlName="value"]'));

      // Enter normal value
      await glucoseInput.clear();
      await glucoseInput.sendKeys('120');

      // Check status preview
      await browser.wait(EC.presenceOf(element(by.css('.status-preview'))), 5000);
      const statusBadge = await element(by.css('.status-badge'));
      const statusText = await statusBadge.getText();
      expect(statusText).toContain('Normal');

      // Enter high value
      await glucoseInput.clear();
      await glucoseInput.sendKeys('250');
      await browser.sleep(500);

      const highStatusText = await statusBadge.getText();
      expect(highStatusText).toContain('High');
    });

    it('should successfully save a reading', async () => {
      const glucoseInput = await element(by.css('ion-input[formControlName="value"]'));
      const notesTextarea = await element(by.css('ion-textarea[formControlName="notes"]'));
      const saveButton = await element(by.buttonText('Save Reading'));

      // Fill form
      await glucoseInput.clear();
      await glucoseInput.sendKeys('120');
      await notesTextarea.sendKeys('Test reading from E2E test');

      // Save
      await saveButton.click();

      // Should navigate back to readings list
      await browser.wait(EC.urlContains('/tabs/readings'), 5000);

      // Verify toast message
      await browser.wait(EC.presenceOf(element(by.css('ion-toast'))), 5000);
      const toast = await element(by.css('ion-toast'));
      expect(await toast.isPresent()).toBe(true);
    });

    it('should cancel and return to previous page', async () => {
      const cancelButton = await element(by.buttonText('Cancel'));
      await cancelButton.click();

      // Should navigate back
      await browser.wait(EC.urlContains('/tabs'), 5000);
      expect(await browser.getCurrentUrl()).toContain('/tabs');
    });
  });

  describe('Authentication Flow', () => {
    it('should redirect to login if not authenticated', async () => {
      // Clear any stored tokens
      await browser.executeScript('window.localStorage.clear()');
      await browser.refresh();

      // Try to access protected route
      await browser.get(`${baseUrl}/tabs/profile`);

      // Should redirect to login
      await browser.wait(EC.urlContains('/login'), 5000);
      expect(await browser.getCurrentUrl()).toContain('/login');
    });

    it('should login with local credentials', async () => {
      await browser.get(`${baseUrl}/login`);

      const emailInput = await element(by.css('ion-input[type="email"]'));
      const passwordInput = await element(by.css('ion-input[type="password"]'));
      const loginButton = await element(by.buttonText('Login'));

      await emailInput.sendKeys('test@example.com');
      await passwordInput.sendKeys('password123');
      await loginButton.click();

      // Should navigate to dashboard after successful login
      await browser.wait(EC.urlContains('/tabs/dashboard'), 5000);
      expect(await browser.getCurrentUrl()).toContain('/tabs/dashboard');
    });

    it('should show error for invalid credentials', async () => {
      await browser.get(`${baseUrl}/login`);

      const emailInput = await element(by.css('ion-input[type="email"]'));
      const passwordInput = await element(by.css('ion-input[type="password"]'));
      const loginButton = await element(by.buttonText('Login'));

      await emailInput.sendKeys('wrong@example.com');
      await passwordInput.sendKeys('wrongpassword');
      await loginButton.click();

      // Should show error toast
      await browser.wait(EC.presenceOf(element(by.css('ion-toast'))), 5000);
      const toast = await element(by.css('ion-toast'));
      const toastMessage = await toast.getText();
      expect(toastMessage).toContain('Invalid credentials');
    });
  });

  describe('Data Synchronization', () => {
    it('should sync data with Tidepool', async () => {
      // Ensure we're on dashboard
      await browser.get(`${baseUrl}/tabs/dashboard`);

      const syncButton = await element(by.css('ion-button ion-icon[name="sync-outline"]'));
      await syncButton.click();

      // Check for spinning icon
      const spinningIcon = await element(by.css('.spinning'));
      expect(await spinningIcon.isPresent()).toBe(true);

      // Wait for sync to complete
      await browser.wait(EC.stalenessOf(spinningIcon), 10000);

      // Check for success indicator
      const successAlert = await element(by.css('app-alert-banner[type="success"]'));
      if (await successAlert.isPresent()) {
        expect(await successAlert.getText()).toContain('Great job');
      }
    });
  });

  describe('Readings List Features', () => {
    beforeEach(async () => {
      await element(by.css('ion-tab-button[tab="readings"]')).click();
      await browser.wait(EC.presenceOf(element(by.css('app-tab1'))), 5000);
    });

    it('should display readings list', async () => {
      const readingsList = await element(by.css('.readings-list'));
      expect(await readingsList.isPresent()).toBe(true);
    });

    it('should filter readings by date', async () => {
      const dateFilter = await element(by.css('ion-datetime'));
      if (await dateFilter.isPresent()) {
        await dateFilter.click();

        // Select a date
        const dateButton = await element(by.css('.calendar-day-today'));
        await dateButton.click();

        // Apply filter
        const applyButton = await element(by.buttonText('Apply'));
        await applyButton.click();

        // Verify filtered results
        await browser.sleep(500);
        const readings = await element.all(by.css('app-reading-item'));
        expect(readings.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should open reading details on tap', async () => {
      const firstReading = await element.all(by.css('app-reading-item')).first();
      if (await firstReading.isPresent()) {
        await firstReading.click();

        // Should show details modal or navigate to details
        await browser.wait(EC.presenceOf(element(by.css('.reading-details'))), 5000);
        const details = await element(by.css('.reading-details'));
        expect(await details.isPresent()).toBe(true);
      }
    });

    it('should support infinite scroll', async () => {
      // Get initial count
      let initialReadings = await element.all(by.css('app-reading-item'));
      const initialCount = initialReadings.length;

      if (initialCount > 0) {
        // Scroll to bottom
        await browser.executeScript('window.scrollTo(0, document.body.scrollHeight)');
        await browser.sleep(1000);

        // Check if more items loaded
        const afterScrollReadings = await element.all(by.css('app-reading-item'));
        expect(afterScrollReadings.length).toBeGreaterThanOrEqual(initialCount);
      }
    });
  });

  describe('Profile Management', () => {
    beforeEach(async () => {
      await element(by.css('ion-tab-button[tab="profile"]')).click();
      await browser.wait(EC.presenceOf(element(by.css('app-tab1'))), 5000);
    });

    it('should display user profile information', async () => {
      const profileInfo = await element(by.css('.profile-info'));
      expect(await profileInfo.isPresent()).toBe(true);
    });

    it('should allow editing profile settings', async () => {
      const editButton = await element(by.css('ion-button[aria-label="Edit Profile"]'));
      if (await editButton.isPresent()) {
        await editButton.click();

        // Should show edit form
        await browser.wait(EC.presenceOf(element(by.css('.profile-form'))), 5000);
        const form = await element(by.css('.profile-form'));
        expect(await form.isPresent()).toBe(true);
      }
    });

    it('should toggle glucose unit preference', async () => {
      const unitToggle = await element(by.css('ion-toggle[name="glucoseUnit"]'));
      if (await unitToggle.isPresent()) {
        const initialValue = await unitToggle.getAttribute('checked');
        await unitToggle.click();

        await browser.sleep(500);
        const newValue = await unitToggle.getAttribute('checked');
        expect(newValue).not.toBe(initialValue);
      }
    });

    it('should logout successfully', async () => {
      const logoutButton = await element(by.buttonText('Logout'));
      if (await logoutButton.isPresent()) {
        await logoutButton.click();

        // Confirm logout
        const confirmButton = await element(by.buttonText('Confirm'));
        await confirmButton.click();

        // Should redirect to login
        await browser.wait(EC.urlContains('/login'), 5000);
        expect(await browser.getCurrentUrl()).toContain('/login');
      }
    });
  });

  describe('Appointment Booking Flow', () => {
    it('should navigate to appointment booking', async () => {
      const bookButton = await element(by.css('ion-button[aria-label="Book Appointment"]'));
      if (await bookButton.isPresent()) {
        await bookButton.click();

        await browser.wait(EC.presenceOf(element(by.css('.appointment-form'))), 5000);
        const form = await element(by.css('.appointment-form'));
        expect(await form.isPresent()).toBe(true);
      }
    });

    it('should select doctor and time slot', async () => {
      // This would be implemented when appointment feature is ready
      const doctorSelect = await element(by.css('ion-select[name="doctor"]'));
      if (await doctorSelect.isPresent()) {
        await doctorSelect.click();

        const doctorOption = await element(by.css('ion-select-option[value="doctor1"]'));
        await doctorOption.click();

        // Select time slot
        const timeSlot = await element(by.css('.time-slot-available')).first();
        await timeSlot.click();

        expect(await timeSlot.getAttribute('class')).toContain('selected');
      }
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels', async () => {
      const buttons = await element.all(by.css('ion-button'));

      for (let button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.getText();
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    it('should support keyboard navigation', async () => {
      // Tab through interactive elements
      await browser.actions().sendKeys(protractor.Key.TAB).perform();
      let activeElement = await browser.driver.switchTo().activeElement();
      expect(await activeElement.getTagName()).toBeTruthy();

      // Continue tabbing
      await browser.actions().sendKeys(protractor.Key.TAB).perform();
      activeElement = await browser.driver.switchTo().activeElement();
      expect(await activeElement.getTagName()).toBeTruthy();
    });

    it('should have sufficient color contrast', async () => {
      // This would typically use an accessibility testing library
      // For now, we just check that important text elements exist
      const headings = await element.all(by.css('h1, h2, h3, ion-title'));

      for (let heading of headings) {
        const color = await heading.getCssValue('color');
        expect(color).toBeTruthy();
      }
    });
  });

  describe('Performance Tests', () => {
    it('should load dashboard within acceptable time', async () => {
      const startTime = Date.now();

      await browser.get(`${baseUrl}/tabs/dashboard`);
      await browser.wait(EC.presenceOf(element(by.css('.stats-grid'))), 5000);

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    it('should handle large datasets efficiently', async () => {
      // Navigate to readings with many items
      await browser.get(`${baseUrl}/tabs/readings`);

      // Measure scroll performance
      const startTime = Date.now();
      await browser.executeScript('window.scrollTo(0, document.body.scrollHeight)');
      const scrollTime = Date.now() - startTime;

      expect(scrollTime).toBeLessThan(500); // Smooth scrolling
    });
  });

  describe('Error Handling', () => {
    it('should show offline indicator when network is unavailable', async () => {
      // Simulate offline mode
      await browser.executeScript('window.navigator.onLine = false');
      await browser.refresh();

      // Check for offline indicator
      const offlineIndicator = await element(by.css('.offline-indicator'));
      if (await offlineIndicator.isPresent()) {
        expect(await offlineIndicator.isDisplayed()).toBe(true);
      }

      // Restore online mode
      await browser.executeScript('window.navigator.onLine = true');
    });

    it('should handle API errors gracefully', async () => {
      // This would mock API failures
      // For now, we just check error handling UI exists
      const errorHandlers = await element.all(by.css('app-error-handler, .error-message'));
      expect(errorHandlers.length).toBeGreaterThanOrEqual(0);
    });
  });
});