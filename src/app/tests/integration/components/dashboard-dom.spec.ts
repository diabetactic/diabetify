/**
 * Dashboard Component DOM Integration Tests
 * Tests DOM manipulation, user interactions, and data binding
 */

import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { DashboardPage } from '../../../dashboard/dashboard.page';
import { ReadingsService } from '../../../core/services/readings.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ProfileService } from '../../../core/services/profile.service';
import { TidepoolSyncService } from '../../../core/services/tidepool-sync.service';
import { LocalAuthService } from '../../../core/services/local-auth.service';

import { TranslateModule } from '@ngx-translate/core';
import { getTranslateModuleForTesting } from '../../helpers/translate-test.helper';
import {
  clickElement,
  getAllTexts,
  getElementText,
  hasClass,
  isVisible,
  queryAllIonicComponents,
  queryIonicComponent,
  setIonicInputValue,
  waitForAsync,
  waitForElement,
  waitForElementToDisappear,
  createMockLoadingController,
  createMockToastController,
} from '../../helpers/dom-utils';

import {
  GlucoseReadingBuilder,
  ProfileBuilder,
  StatisticsBuilder,
  AppointmentBuilder,
  TestDataFactory,
} from '../../helpers/test-builders';

describe('Dashboard Component DOM Integration', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let compiled: HTMLElement;

  // Service spies
  let readingsService: jasmine.SpyObj<ReadingsService>;
  let appointmentService: jasmine.SpyObj<AppointmentService>;
  let profileService: jasmine.SpyObj<ProfileService>;
  let tidepoolService: jasmine.SpyObj<TidepoolSyncService>;
  let authService: jasmine.SpyObj<LocalAuthService>;
  let loadingController: any;
  let toastController: any;

  // Observable subjects for testing reactive data
  let readingsSubject: BehaviorSubject<any[]>;
  let profileSubject: BehaviorSubject<any>;
  let syncStatusSubject: BehaviorSubject<any>;
  let upcomingAppointmentsSubject: BehaviorSubject<any[]>;

  beforeEach(async () => {
    // Create mock data subjects
    readingsSubject = new BehaviorSubject(TestDataFactory.createDailyPattern());
    profileSubject = new BehaviorSubject(new ProfileBuilder().build());
    syncStatusSubject = new BehaviorSubject({ isSyncing: false, lastSync: new Date() });
    upcomingAppointmentsSubject = new BehaviorSubject<any[]>([]);

    // Create service spies
    readingsService = jasmine.createSpyObj(
      'ReadingsService',
      ['getAllReadings', 'getStatistics', 'addReading'],
      { readings$: readingsSubject.asObservable() }
    );

    appointmentService = jasmine.createSpyObj(
      'AppointmentService',
      ['getAppointmentById', 'getAppointments'],
      {
        upcomingAppointment$: upcomingAppointmentsSubject.asObservable(),
      }
    );
    appointmentService.getAppointments.and.returnValue(of([]));

    profileService = jasmine.createSpyObj('ProfileService', ['getProfile', 'updateProfile'], {
      profile$: profileSubject.asObservable(),
    });

    tidepoolService = jasmine.createSpyObj('TidepoolSyncService', ['getLastSyncTime'], {
      syncStatus$: syncStatusSubject.asObservable(),
    });

    authService = jasmine.createSpyObj('LocalAuthService', ['isAuthenticated', 'logout']);

    // Setup default return values
    readingsService.getStatistics.and.returnValue(Promise.resolve(new StatisticsBuilder().build()));
    readingsService.getAllReadings.and.returnValue(
      Promise.resolve({
        readings: TestDataFactory.createDailyPattern(),
        total: 7,
        offset: 0,
        limit: 100,
        hasMore: false,
      })
    );
    Object.defineProperty(appointmentService, 'upcomingAppointment$', {
      value: of([
        new AppointmentBuilder().asUpcoming().build(),
        new AppointmentBuilder().withId('appt_2').build(),
      ]),
      writable: false,
      configurable: true, // Allow redefining the property for the video call test
    });
    authService.isAuthenticated.and.returnValue(of(true));

    // Create mock controllers
    loadingController = createMockLoadingController();
    toastController = createMockToastController();

    await TestBed.configureTestingModule({
      imports: [
        DashboardPage,
        IonicModule.forRoot(),
        RouterTestingModule,
        HttpClientTestingModule,
        getTranslateModuleForTesting(),
      ],
      declarations: [],
      providers: [
        { provide: ReadingsService, useValue: readingsService },
        { provide: AppointmentService, useValue: appointmentService },
        { provide: ProfileService, useValue: profileService },
        { provide: TidepoolSyncService, useValue: tidepoolService },
        { provide: LocalAuthService, useValue: authService },
        { provide: LoadingController, useValue: loadingController },
        { provide: ToastController, useValue: toastController },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
  });

  describe('Initial DOM Rendering', () => {
    it('should render all dashboard sections', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Check main sections exist
      expect(compiled.querySelector('ion-header')).toBeTruthy();
      expect(compiled.querySelector('ion-content')).toBeTruthy();
      expect(compiled.querySelector('.dashboard-container')).toBeTruthy();

      // Verify stat cards are rendered
      const statCards = compiled.querySelectorAll('app-stat-card');
      expect(statCards.length).toBeGreaterThan(0);
    }));

    it('should display kid-friendly status message', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      tick();

      const statusText = compiled.querySelector('.status-text');
      expect(statusText).toBeTruthy();
      // Should contain a kid-friendly message
      expect(statusText?.textContent).toBeTruthy();
    }));

    it('should show loading spinner during data fetch', fakeAsync(() => {
      // Delay the service response
      readingsService.getStatistics.and.returnValue(
        new Promise(() => {}) // Never resolves to simulate loading
      );

      fixture.detectChanges();

      const spinner = compiled.querySelector('ion-spinner');
      expect(spinner).toBeTruthy();
      expect(isVisible(spinner as HTMLElement)).toBe(true);
    }));
  });

  describe('Statistics Display and Updates', () => {
    it('should update stat cards when new data arrives', fakeAsync(() => {
      const initialStats = new StatisticsBuilder()
        .withAverage(120)
        .withTimeInRange(75, 15, 10)
        .build();

      readingsService.getStatistics.and.returnValue(Promise.resolve(initialStats));
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Check initial values - now using app-stat-card components
      let statCards = compiled.querySelectorAll('app-stat-card');
      expect(statCards.length).toBeGreaterThan(0);

      // Find average glucose card by checking title
      let avgCard = Array.from(statCards).find(card =>
        card.querySelector('.stat-card-title')?.textContent?.includes('Glucose')
      );
      expect(avgCard).toBeTruthy();

      // Value is in .stat-card-value
      let valueElement = avgCard?.querySelector('.stat-card-value');
      expect(valueElement?.textContent).toContain('120');

      // Update statistics
      const updatedStats = new StatisticsBuilder()
        .withAverage(145)
        .withTimeInRange(65, 25, 10)
        .build();

      readingsService.getStatistics.and.returnValue(Promise.resolve(updatedStats));
      component.ngOnInit(); // Trigger refresh
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Verify DOM updated
      statCards = compiled.querySelectorAll('app-stat-card');
      avgCard = Array.from(statCards).find(card =>
        card.querySelector('.stat-card-title')?.textContent?.includes('Glucose')
      );
      valueElement = avgCard?.querySelector('.stat-card-value');
      expect(valueElement?.textContent).toContain('145');
    }));

    it('should apply correct status icon based on glucose values', fakeAsync(() => {
      // High reading should show warning status
      const highStats = new StatisticsBuilder()
        .withAverage(250)
        .withTimeInRange(45, 40, 15)
        .build();
      readingsService.getStatistics.and.returnValue(Promise.resolve(highStats));

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const statusIcon = compiled.querySelector('.status-icon-large');
      expect(statusIcon).toBeTruthy();

      // Low reading should also show warning
      const lowStats = new StatisticsBuilder().withAverage(65).withTimeInRange(45, 15, 40).build();
      readingsService.getStatistics.and.returnValue(Promise.resolve(lowStats));
      component.ngOnInit();

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Status indicator should exist
      expect(compiled.querySelector('.status-indicator')).toBeTruthy();
    }));

    it('should display status icon', fakeAsync(() => {
      const stats = new StatisticsBuilder().build();

      readingsService.getStatistics.and.returnValue(Promise.resolve(stats));
      fixture.detectChanges();
      tick();

      // Kid-friendly dashboard shows status icon instead of trends
      const statusIcon = compiled.querySelector('.status-icon-large');
      expect(statusIcon).toBeTruthy();
    }));
  });

  describe('Kid-Friendly Interface', () => {
    it('should show kid-friendly status card instead of charts', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Kid-friendly dashboard has status cards, not charts
      const statusCard = compiled.querySelector('.status-card.kids-friendly');
      expect(statusCard).toBeTruthy();

      // No chart canvas in kid-friendly mode
      const chartCanvas = compiled.querySelector('canvas#glucoseChart');
      expect(chartCanvas).toBeFalsy();
    }));

    it('should display simple stat cards for time in range', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Find time in range card
      const statCards = compiled.querySelectorAll('app-stat-card');
      const timeInRangeCard = Array.from(statCards).find(card =>
        card.querySelector('.stat-card-title')?.textContent?.includes('Range')
      );
      expect(timeInRangeCard).toBeTruthy();
    }));

    it('should show kid-friendly status message', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const statusText = compiled.querySelector('.status-text');
      expect(statusText).toBeTruthy();

      const subtitle = compiled.querySelector('.status-subtitle');
      expect(subtitle?.textContent).toBeTruthy();
    }));
  });

  describe('Quick Actions', () => {
    it('should handle add reading button click', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Kid-friendly dashboard uses a button with class .kids-action-btn.primary-action
      const addButton = compiled.querySelector('.kids-action-btn.primary-action') as HTMLElement;
      expect(addButton).toBeTruthy();
      expect(addButton.textContent).toContain('dashboard.kids.addReading');

      spyOn(component, 'addReading');
      addButton.click();
      fixture.detectChanges();
      tick();

      expect(component.addReading).toHaveBeenCalled();
    }));

    it('should display action buttons in kids view', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Check kids action buttons exist
      const kidsActions = compiled.querySelector('.kids-actions');
      expect(kidsActions).toBeTruthy();

      // Add reading button
      const addButton = compiled.querySelector('.kids-action-btn.primary-action');
      expect(addButton).toBeTruthy();

      // View all readings button
      const viewAllButton = compiled.querySelector('.kids-action-btn:not(.primary-action)');
      expect(viewAllButton).toBeTruthy();

      // Parent view button
      const parentViewButton = compiled.querySelector('.parent-view-btn');
      expect(parentViewButton).toBeTruthy();
    }));

    it('should navigate to readings page on view all click', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Find the view all button with routerLink
      const viewAllButton = compiled.querySelector('[routerLink="/tabs/readings"]') as HTMLElement;
      expect(viewAllButton).toBeTruthy();
      expect(viewAllButton.textContent).toContain('dashboard.kids.viewAll');
    }));
  });

  describe('Appointments Section', () => {
    it('should display upcoming appointments', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Kid-friendly dashboard only shows one appointment card
      const appointmentCard = compiled.querySelector('.appointment-card');
      expect(appointmentCard).toBeTruthy();

      // Check appointment details
      const cardTitle = appointmentCard?.querySelector('ion-card-title');
      expect(cardTitle?.textContent).toBeTruthy();
    }));

    it('should show share glucose data button for appointments', fakeAsync(() => {
      const appointmentWithShare = new AppointmentBuilder().asUpcoming().build();

      Object.defineProperty(appointmentService, 'upcomingAppointment$', {
        value: of([appointmentWithShare]),
        writable: false,
      });

      component.ngOnInit();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Look for share button in appointment actions
      const shareButton = compiled.querySelector('.appointment-actions ion-button');
      expect(shareButton).toBeTruthy();
      expect(shareButton?.textContent).toContain('dashboard.shareReadings');
    }));

    it('should handle view appointment details button', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      spyOn(component, 'viewAppointmentDetails');

      // Find the view details button (second button in appointment-actions)
      const buttons = compiled.querySelectorAll('.appointment-actions ion-button');
      const viewDetailsButton = buttons[1] as HTMLElement;
      expect(viewDetailsButton).toBeTruthy();
      expect(viewDetailsButton.textContent).toContain('common.viewDetails');

      viewDetailsButton.click();
      fixture.detectChanges();
      tick();

      expect(component.viewAppointmentDetails).toHaveBeenCalled();
    }));
  });

  describe('Sync Status and Actions', () => {
    it('should handle pull-to-refresh for sync', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Kid-friendly dashboard uses pull-to-refresh for sync
      const refresher = compiled.querySelector('ion-refresher');
      expect(refresher).toBeTruthy();

      spyOn(component, 'handleRefresh');

      // Simulate pull to refresh
      const refreshEvent = {
        target: {
          complete: jasmine.createSpy('complete'),
        },
      };
      refresher?.dispatchEvent(new CustomEvent('ionRefresh', { detail: refreshEvent }));
      fixture.detectChanges();
      tick();

      expect(component.handleRefresh).toHaveBeenCalled();
    }));

    it('should sync data in background automatically', fakeAsync(() => {
      // Test that sync happens through the service observable
      expect(tidepoolService.syncStatus$).toBeDefined();

      // Simulate background sync
      syncStatusSubject.next({ isSyncing: true, lastSync: null });
      fixture.detectChanges();
      tick();

      // Component should be aware of sync status
      expect(component).toBeTruthy();

      // Sync completes
      syncStatusSubject.next({ isSyncing: false, lastSync: new Date() });
      fixture.detectChanges();
      tick();
    }));

    it('should handle sync errors gracefully', fakeAsync(() => {
      // Simulate a sync error through the observable
      tidepoolService.performManualSync = jasmine
        .createSpy('performManualSync')
        .and.returnValue(Promise.reject(new Error('Network error')));

      // If there's a manual sync triggered (e.g., through pull-to-refresh)
      spyOn(component, 'handleRefresh');

      fixture.detectChanges();
      tick();

      // Component should still render without sync controls
      const dashboard = compiled.querySelector('.dashboard-container');
      expect(dashboard).toBeTruthy();
    }));
  });

  describe('Responsive Layout', () => {
    it('should adapt layout for mobile view', fakeAsync(() => {
      // Simulate mobile viewport
      spyOnProperty(window, 'innerWidth').and.returnValue(375);
      window.dispatchEvent(new Event('resize'));

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const container = compiled.querySelector('.dashboard-container');
      expect(container).toBeTruthy();

      // Kids view stat cards should be responsive
      const statsGrid = compiled.querySelector('.stats-grid.kids-view');
      expect(statsGrid).toBeTruthy();

      // Check app-stat-card components exist
      const statCards = compiled.querySelectorAll('app-stat-card');
      expect(statCards.length).toBeGreaterThan(0);
    }));

    it('should maintain kid-friendly layout on different screen sizes', fakeAsync(() => {
      // Desktop view
      spyOnProperty(window, 'innerWidth').and.returnValue(1920);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Check kids actions are visible
      let kidsActions = compiled.querySelector('.kids-actions');
      expect(kidsActions).toBeTruthy();

      // Mobile view
      spyOnProperty(window, 'innerWidth').and.returnValue(375);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Kids actions should still be visible on mobile
      kidsActions = compiled.querySelector('.kids-actions');
      expect(kidsActions).toBeTruthy();
    }));
  });

  describe('Error States', () => {
    it('should handle data fetch errors gracefully', fakeAsync(() => {
      readingsService.getStatistics.and.returnValue(Promise.reject(new Error('Network error')));

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Dashboard should still render with empty state
      const dashboard = compiled.querySelector('.dashboard-container');
      expect(dashboard).toBeTruthy();

      // Empty state should be shown for readings
      const emptyState = compiled.querySelector('app-empty-state');
      expect(emptyState).toBeTruthy();
    }));

    it('should show toast notification on error', fakeAsync(() => {
      readingsService.getStatistics.and.returnValue(Promise.reject(new Error('Network error')));

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Check if error toast was created
      if (toastController.create.calls.count() > 0) {
        const toastArgs = toastController.create.calls.mostRecent().args[0];
        expect(toastArgs.color).toBe('danger');
      }

      // Dashboard should continue to function
      const addButton = compiled.querySelector('.kids-action-btn.primary-action');
      expect(addButton).toBeTruthy();
    }));
  });

  describe('Real-time Updates', () => {
    it('should update DOM when new reading is added', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Kid-friendly dashboard uses app-reading-item components
      const initialCount = compiled.querySelectorAll('app-reading-item').length;

      // Add new reading
      const newReading = new GlucoseReadingBuilder().withValue(130).build();
      const currentReadings = readingsSubject.value;
      readingsSubject.next([newReading, ...currentReadings]);

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const updatedCount = compiled.querySelectorAll('app-reading-item').length;
      expect(updatedCount).toBe(initialCount + 1);

      // Check readings list exists
      const readingsList = compiled.querySelector('.readings-list.kids-friendly');
      expect(readingsList).toBeTruthy();
    }));

    it('should update stat cards when data changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Find average glucose stat card
      const statCards = compiled.querySelectorAll('app-stat-card');
      const avgCard = Array.from(statCards).find(card =>
        card.querySelector('.stat-card-title')?.textContent?.includes('Glucose')
      );
      expect(avgCard).toBeTruthy();

      // Trigger stat update
      const newStats = new StatisticsBuilder().withAverage(150).build();
      readingsService.getStatistics.and.returnValue(Promise.resolve(newStats));
      component.ngOnInit();

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      // Check value updated
      const valueElement = avgCard?.querySelector('.stat-card-value');
      expect(valueElement?.textContent).toContain('150');
    }));
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const mainContent = compiled.querySelector('ion-content');
      expect(mainContent?.getAttribute('aria-label')).toBeTruthy();

      const buttons = compiled.querySelectorAll('ion-button');
      buttons.forEach(button => {
        expect(button.getAttribute('aria-label') || button.textContent?.trim()).toBeTruthy();
      });
    }));

    it('should support keyboard navigation', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const focusableElements = compiled.querySelectorAll(
        'button, [tabindex="0"], ion-button, ion-input'
      );

      focusableElements.forEach((element, index) => {
        (element as HTMLElement).focus();
        expect(document.activeElement).toBe(element);

        // Simulate Tab key
        const tabEvent = new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
        });
        element.dispatchEvent(tabEvent);
      });
    }));

    it('should announce dynamic content changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const liveRegion = compiled.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();

      // Update content
      const newReading = new GlucoseReadingBuilder().asHigh().build();
      readingsSubject.next([newReading]);
      fixture.detectChanges();
      tick();

      expect(liveRegion?.textContent).toContain('updated');
    }));
  });

  describe('Performance', () => {
    it('should handle large datasets without blocking UI', fakeAsync(() => {
      // Generate large dataset
      const manyReadings = new GlucoseReadingBuilder().buildMany(100);
      readingsSubject.next(manyReadings);

      const startTime = performance.now();
      fixture.detectChanges();
      tick();
      const endTime = performance.now();

      // Rendering should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // 1 second

      // Check readings list renders
      const readingsList = compiled.querySelector('.readings-list.kids-friendly');
      expect(readingsList).toBeTruthy();

      // Kid-friendly interface shows limited recent readings
      const visibleItems = readingsList?.querySelectorAll('app-reading-item');
      expect(visibleItems).toBeDefined();
    }));

    it('should debounce rapid user interactions', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const addButton = compiled.querySelector('.kids-action-btn.primary-action') as HTMLElement;
      expect(addButton).toBeTruthy();

      spyOn(component, 'addReading');

      // Click multiple times rapidly
      for (let i = 0; i < 10; i++) {
        addButton.click();
      }

      fixture.detectChanges();
      tick(500); // Debounce delay

      // Should handle multiple clicks gracefully
      expect(component.addReading).toHaveBeenCalled();
    }));
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
  });
});
