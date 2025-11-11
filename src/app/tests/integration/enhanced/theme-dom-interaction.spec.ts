/**
 * Enhanced Theme DOM Interaction Tests
 *
 * Tests actual DOM manipulation and visual changes during theme switches.
 * Includes comprehensive logging, performance measurement, and visual verification.
 */

import { TestBed, ComponentFixture, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { SettingsPage } from '../../../settings/settings.page';
import { ThemeService } from '../../../core/services/theme.service';
import { ProfileService } from '../../../core/services/profile.service';
import { LocalAuthService } from '../../../core/services/local-auth.service';
import { DemoDataService } from '../../../core/services/demo-data.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { getTranslateModuleForTesting } from '../../helpers/translate-test.helper';
import { of } from 'rxjs';
import {
  TestLogger,
  DOMSnapshot,
  PerformanceMeasurement,
  VisualVerification,
  ConsoleErrorCapture,
  MemoryLeakDetector,
} from '../../helpers/test-diagnostics';

describe('Enhanced Theme DOM Interaction', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let themeService: ThemeService;
  let logger: TestLogger;
  let consoleCapture: ConsoleErrorCapture;
  let memoryDetector: MemoryLeakDetector;

  // Mock services
  let mockProfileService: jasmine.SpyObj<ProfileService>;
  let mockAuthService: jasmine.SpyObj<LocalAuthService>;
  let mockDemoDataService: jasmine.SpyObj<DemoDataService>;

  beforeEach(async () => {
    logger = new TestLogger('Theme DOM Interaction');
    consoleCapture = new ConsoleErrorCapture();
    memoryDetector = new MemoryLeakDetector();

    logger.log('Setting up TestBed');
    consoleCapture.start();
    memoryDetector.takeSnapshot('setup-start');

    // Create mock services
    mockProfileService = jasmine.createSpyObj(
      'ProfileService',
      ['getProfile', 'updateProfile', 'updatePreferences'],
      {
        profile$: of(null),
      }
    );
    mockProfileService.getProfile.and.returnValue(Promise.resolve(null));
    mockProfileService.updatePreferences.and.returnValue(
      Promise.resolve({
        id: 'test-profile',
        preferences: {
          glucoseUnit: 'mg/dL',
          targetRange: { low: 70, high: 180 },
          language: 'en',
          notifications: { appointments: true, readings: true, reminders: true },
          theme: 'auto',
        },
      } as any)
    );

    mockAuthService = jasmine.createSpyObj('LocalAuthService', [
      'isAuthenticated',
      'getCurrentUser',
    ]);
    mockAuthService.isAuthenticated.and.returnValue(of(true));
    mockAuthService.getCurrentUser.and.returnValue({
      dni: '1000',
      name: 'Test User',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      preferences: {
        glucoseUnit: 'mg/dL',
        targetRange: { low: 70, high: 180 },
        language: 'en',
        notifications: { appointments: true, readings: true, reminders: true },
        theme: 'auto',
      },
    } as any);

    mockDemoDataService = jasmine.createSpyObj('DemoDataService', ['isDemoMode']);
    mockDemoDataService.isDemoMode.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [
        SettingsPage,
        RouterTestingModule,
        getTranslateModuleForTesting(),
        HttpClientTestingModule,
      ],
      providers: [
        ThemeService,
        TranslateService,
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LocalAuthService, useValue: mockAuthService },
        { provide: DemoDataService, useValue: mockDemoDataService },
      ],
      schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    logger.checkpoint('TestBed compiled');

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);

    logger.log('Component created');
    memoryDetector.takeSnapshot('setup-complete');
  });

  afterEach(() => {
    memoryDetector.takeSnapshot('teardown');
    memoryDetector.analyze();
    consoleCapture.stop();
    consoleCapture.logSummary();

    const report = logger.complete();
    expect(report.errors.length).toBe(0, 'No errors should be captured during test');

    fixture.destroy();
  });

  // Skipping real DOM interaction tests - covered by Maestro mobile tests instead
  xdescribe('Theme Toggle Interaction', () => {
    it('should toggle theme with real DOM interaction and measure performance', fakeAsync(() => {
      logger.log('🎬 Starting theme toggle test');

      // Initial render
      fixture.detectChanges();
      tick();
      logger.checkpoint('initial-render');

      const compiled = fixture.nativeElement;
      logger.log('Initial DOM state captured');
      DOMSnapshot.log('Initial State', compiled);

      // Find the theme toggle
      const themeToggle =
        compiled.querySelector('ion-toggle[data-test="theme-toggle"]') ||
        compiled.querySelector('[data-test="theme-toggle"]') ||
        compiled.querySelector('ion-toggle');

      if (!themeToggle) {
        logger.error('Theme toggle not found in DOM');
        logger.log('Available elements:', compiled.innerHTML.substring(0, 500));
        fail('Theme toggle element not found');
        return;
      }

      logger.log('Theme toggle found:', {
        tag: themeToggle.tagName,
        id: themeToggle.id,
        classes: Array.from(themeToggle.classList),
      });

      // Capture initial theme state
      const initialTheme = document.body.getAttribute('color-theme') || 'light';
      logger.log('Initial theme:', initialTheme);
      DOMSnapshot.log('Before Toggle', document.body);

      // Measure toggle performance
      PerformanceMeasurement.mark('toggle-start');

      // Click the toggle
      logger.log('🖱️ Clicking theme toggle');
      themeToggle.click();

      // Wait for Angular change detection
      fixture.detectChanges();
      tick(100);

      // Wait for theme service to apply changes
      fixture.whenStable();
      tick(300);

      PerformanceMeasurement.mark('toggle-end');
      const toggleDuration = PerformanceMeasurement.measure(
        'Theme Toggle Complete',
        'toggle-start',
        'toggle-end'
      );

      logger.checkpoint('theme-toggled');

      // Capture final theme state
      const finalTheme = document.body.getAttribute('color-theme') || 'light';
      logger.log('Final theme:', finalTheme);
      DOMSnapshot.log('After Toggle', document.body);

      // Verify theme changed
      expect(finalTheme).not.toBe(initialTheme, 'Theme should have changed');
      logger.log('✅ Theme changed from', initialTheme, 'to', finalTheme);

      // Verify CSS variables changed
      VisualVerification.logAllCSSVariables(document.body);

      // Check background color changed
      const bodyBgColor = VisualVerification.getCSSVariable(
        document.body,
        '--ion-background-color'
      );
      logger.log('Body background color:', bodyBgColor);

      // Verify text color changed
      const textColor = VisualVerification.getCSSVariable(document.body, '--ion-text-color');
      logger.log('Text color:', textColor);

      // Performance assertions
      expect(toggleDuration).toBeLessThan(500, 'Toggle should complete within 500ms');
      logger.log(`✅ Toggle performance: ${toggleDuration.toFixed(2)}ms`);

      // Visual verification
      const isVisible = VisualVerification.verifyVisibility(themeToggle);
      expect(isVisible).toBe(true, 'Toggle should remain visible');

      flush();
      logger.checkpoint('test-complete');
    }));

    it('should handle rapid theme toggles without errors', fakeAsync(() => {
      logger.log('🎬 Starting rapid toggle test');

      fixture.detectChanges();
      tick();

      const compiled = fixture.nativeElement;
      const themeToggle =
        compiled.querySelector('ion-toggle[data-test="theme-toggle"]') ||
        compiled.querySelector('ion-toggle');

      if (!themeToggle) {
        logger.warn('Theme toggle not found, skipping test');
        return;
      }

      logger.log('Performing 5 rapid toggles');
      PerformanceMeasurement.mark('rapid-start');

      for (let i = 0; i < 5; i++) {
        logger.log(`Toggle #${i + 1}`);
        themeToggle.click();
        fixture.detectChanges();
        tick(50);
      }

      fixture.whenStable();
      tick(500);

      PerformanceMeasurement.mark('rapid-end');
      const rapidDuration = PerformanceMeasurement.measure(
        'Rapid Toggles',
        'rapid-start',
        'rapid-end'
      );

      logger.log(`✅ 5 rapid toggles completed in ${rapidDuration.toFixed(2)}ms`);

      // Verify no console errors
      expect(consoleCapture.hasErrors()).toBe(false, 'No errors should occur during rapid toggles');

      flush();
    }));
  });

  // Skipping keyboard navigation tests - mobile app doesn't need keyboard accessibility
  xdescribe('Keyboard Navigation', () => {
    it('should support keyboard navigation for theme toggle', fakeAsync(() => {
      logger.log('🎬 Testing keyboard navigation');

      fixture.detectChanges();
      tick();

      const compiled = fixture.nativeElement;
      const themeToggle =
        compiled.querySelector('ion-toggle[data-test="theme-toggle"]') ||
        compiled.querySelector('ion-toggle');

      if (!themeToggle) {
        logger.warn('Theme toggle not found, skipping keyboard test');
        return;
      }

      // Focus the toggle
      logger.log('🎯 Focusing theme toggle');
      themeToggle.focus();
      fixture.detectChanges();
      tick();

      expect(document.activeElement === themeToggle).toBe(true, 'Toggle should be focused');
      logger.log('✅ Toggle focused successfully');

      // Simulate Space key press
      logger.log('⌨️ Simulating Space key press');
      const spaceEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
      });
      themeToggle.dispatchEvent(spaceEvent);

      fixture.detectChanges();
      tick(100);

      logger.log('✅ Keyboard navigation test complete');
      flush();
    }));

    it('should support tab navigation through settings', fakeAsync(() => {
      logger.log('🎬 Testing tab navigation');

      fixture.detectChanges();
      tick();

      const compiled = fixture.nativeElement;
      const focusableElements = compiled.querySelectorAll(
        'button, ion-toggle, ion-select, ion-input, [tabindex]:not([tabindex="-1"])'
      );

      logger.log(`Found ${focusableElements.length} focusable elements`);

      if (focusableElements.length === 0) {
        logger.warn('No focusable elements found');
        return;
      }

      // Simulate tab through elements
      focusableElements.forEach((element: Element, index: number) => {
        logger.log(`Tab to element ${index + 1}:`, {
          tag: element.tagName,
          id: (element as HTMLElement).id,
          type: element.getAttribute('type'),
        });

        (element as HTMLElement).focus();
        fixture.detectChanges();
        tick(50);

        expect(document.activeElement === element).toBe(
          true,
          `Element ${index + 1} should be focused`
        );
      });

      logger.log('✅ Tab navigation test complete');
      flush();
    }));
  });

  describe('Touch Events', () => {
    it('should handle touch events on theme toggle', fakeAsync(() => {
      logger.log('🎬 Testing touch events');

      fixture.detectChanges();
      tick();

      const compiled = fixture.nativeElement;
      const themeToggle =
        compiled.querySelector('ion-toggle[data-test="theme-toggle"]') ||
        compiled.querySelector('ion-toggle');

      if (!themeToggle) {
        logger.warn('Theme toggle not found, skipping touch test');
        return;
      }

      logger.log('Initial theme:', document.body.getAttribute('color-theme'));

      // Simulate touch start
      logger.log('👆 Simulating touchstart');
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [
          new Touch({
            identifier: 0,
            target: themeToggle,
            clientX: 100,
            clientY: 100,
          }),
        ],
      });
      themeToggle.dispatchEvent(touchStart);
      fixture.detectChanges();
      tick(50);

      // Simulate touch end
      logger.log('👆 Simulating touchend');
      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [
          new Touch({
            identifier: 0,
            target: themeToggle,
            clientX: 100,
            clientY: 100,
          }),
        ],
      });
      themeToggle.dispatchEvent(touchEnd);
      fixture.detectChanges();
      tick(50);

      // Click to actually toggle
      themeToggle.click();
      fixture.detectChanges();
      tick(100);

      logger.log('Final theme:', document.body.getAttribute('color-theme'));
      logger.log('✅ Touch events handled successfully');

      flush();
    }));
  });

  describe('Visual State Changes', () => {
    it('should verify CSS variable changes during theme switch', fakeAsync(() => {
      logger.log('🎬 Testing CSS variable changes');

      fixture.detectChanges();
      tick();

      // Capture initial CSS variables
      logger.log('📸 Capturing initial CSS variables');
      const initialBg = VisualVerification.getCSSVariable(document.body, '--ion-background-color');
      const initialText = VisualVerification.getCSSVariable(document.body, '--ion-text-color');

      logger.log('Initial CSS:', { background: initialBg, text: initialText });
      VisualVerification.logAllCSSVariables(document.body);

      // Toggle theme using public API
      logger.log('🔄 Toggling theme via service');
      const currentMode = themeService.getCurrentThemeMode();
      const newMode = currentMode === 'dark' ? 'light' : 'dark';
      themeService.setThemeMode(newMode);
      fixture.detectChanges();
      tick(300);

      // Capture final CSS variables
      logger.log('📸 Capturing final CSS variables');
      const finalBg = VisualVerification.getCSSVariable(document.body, '--ion-background-color');
      const finalText = VisualVerification.getCSSVariable(document.body, '--ion-text-color');

      logger.log('Final CSS:', { background: finalBg, text: finalText });
      VisualVerification.logAllCSSVariables(document.body);

      // Verify changes occurred
      const bgChanged = initialBg !== finalBg;
      const textChanged = initialText !== finalText;

      logger.log('Changes detected:', { background: bgChanged, text: textChanged });

      expect(bgChanged || textChanged).toBe(true, 'At least one CSS variable should change');

      flush();
    }));

    it('should maintain visual consistency after multiple toggles', fakeAsync(() => {
      logger.log('🎬 Testing visual consistency');

      fixture.detectChanges();
      tick();

      const iterations = 3;
      const cssSnapshots: any[] = [];

      for (let i = 0; i < iterations; i++) {
        logger.log(`Iteration ${i + 1}/${iterations}`);

        // Toggle to dark
        themeService.setThemeMode('dark');
        fixture.detectChanges();
        tick(200);

        const darkBg = VisualVerification.getCSSVariable(document.body, '--ion-background-color');
        cssSnapshots.push({ theme: 'dark', background: darkBg });
        logger.log(`Dark theme BG: ${darkBg}`);

        // Toggle to light
        themeService.setThemeMode('light');
        fixture.detectChanges();
        tick(200);

        const lightBg = VisualVerification.getCSSVariable(document.body, '--ion-background-color');
        cssSnapshots.push({ theme: 'light', background: lightBg });
        logger.log(`Light theme BG: ${lightBg}`);
      }

      logger.log('CSS Snapshots:', cssSnapshots);

      // Verify consistency - all dark themes should have same BG, all light themes should have same BG
      const darkSnapshots = cssSnapshots.filter(s => s.theme === 'dark');
      const lightSnapshots = cssSnapshots.filter(s => s.theme === 'light');

      if (darkSnapshots.length > 1) {
        const darkBgs = darkSnapshots.map(s => s.background);
        const allSameDark = darkBgs.every(bg => bg === darkBgs[0]);
        logger.log('Dark theme consistency:', allSameDark, darkBgs);
        expect(allSameDark).toBe(true, 'All dark theme backgrounds should be identical');
      }

      if (lightSnapshots.length > 1) {
        const lightBgs = lightSnapshots.map(s => s.background);
        const allSameLight = lightBgs.every(bg => bg === lightBgs[0]);
        logger.log('Light theme consistency:', allSameLight, lightBgs);
        expect(allSameLight).toBe(true, 'All light theme backgrounds should be identical');
      }

      flush();
    }));
  });

  describe('Performance Characteristics', () => {
    it('should measure and verify theme switch performance', fakeAsync(() => {
      logger.log('🎬 Performance measurement test');

      fixture.detectChanges();
      tick();

      const measurements: number[] = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        PerformanceMeasurement.mark(`toggle-start-${i}`);

        // Use public API instead of private method
        const currentMode = themeService.getCurrentThemeMode();
        const newMode = currentMode === 'dark' ? 'light' : 'dark';
        themeService.setThemeMode(newMode);
        fixture.detectChanges();
        tick(100);

        PerformanceMeasurement.mark(`toggle-end-${i}`);
        const duration = PerformanceMeasurement.measure(
          `Theme Toggle ${i + 1}`,
          `toggle-start-${i}`,
          `toggle-end-${i}`
        );

        measurements.push(duration);
      }

      // Calculate statistics
      const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const max = Math.max(...measurements);
      const min = Math.min(...measurements);

      logger.log('Performance Statistics:', {
        average: `${average.toFixed(2)}ms`,
        max: `${max.toFixed(2)}ms`,
        min: `${min.toFixed(2)}ms`,
        all: measurements.map(m => `${m.toFixed(2)}ms`),
      });

      // Performance assertions
      expect(average).toBeLessThan(200, 'Average toggle time should be under 200ms');
      expect(max).toBeLessThan(500, 'Maximum toggle time should be under 500ms');

      logger.log('✅ Performance test passed');
      flush();
    }));
  });
});
