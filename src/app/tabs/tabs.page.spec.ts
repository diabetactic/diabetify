import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastController, IonicModule } from '@ionic/angular';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { TabsPage } from './tabs.page';
import { AppointmentService } from '@services/appointment.service';
import { TranslationService } from '@services/translation.service';
import { ROUTES, ROUTE_SEGMENTS } from '@core/constants';
import { AppointmentQueueStateResponse } from '@models/appointment.model';
import { environment } from '@env/environment';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;
  let mockRouter: any;
  let mockAppointmentService: any;
  let mockToastController: any;
  let mockTranslationService: any;
  let navigationEventsSubject: Subject<any>;

  const createNavigationEndEvent = (url: string) => new NavigationEnd(1, url, url);

  beforeEach(async () => {
    navigationEventsSubject = new Subject();

    mockRouter = {
      events: navigationEventsSubject.asObservable(),
      url: '/tabs/dashboard',
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockAppointmentService = {
      getQueueState: vi.fn(),
    };

    mockToastController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockTranslationService = {
      instant: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [TabsPage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: ToastController, useValue: mockToastController },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should be a standalone component', () => {
      const componentMetadata = (TabsPage as any).ɵcmp;
      expect(componentMetadata.standalone).toBe(true);
    });

    it('should use OnPush change detection strategy', () => {
      const componentMetadata = (TabsPage as any).ɵcmp;
      expect(
        componentMetadata.changeDetection === 0 || componentMetadata.changeDetection === undefined
      ).toBe(true);
    });

    it('should have correct selector', () => {
      const componentMetadata = (TabsPage as any).ɵcmp;
      expect(componentMetadata.selectors[0][0]).toBe('app-tabs');
    });

    it('should initialize with default fab icon', () => {
      expect(component.fabIcon).toBe('medkit-outline');
    });

    it('should initialize with empty fab label', () => {
      expect(component.fabLabel).toBe('');
    });

    it('should set showStatusBadges from environment', () => {
      expect(component.showStatusBadges).toBe(environment.features?.showStatusBadges ?? false);
    });
  });

  describe('ngOnInit - Mock Mode', () => {
    beforeEach(() => {
      vi.spyOn(environment, 'backendMode', 'get').mockReturnValue('mock');
    });

    it('should set queue state to NONE in mock mode', () => {
      component.ngOnInit();

      expect(component['queueState']).toEqual({ state: 'NONE' });
      expect(mockAppointmentService.getQueueState).not.toHaveBeenCalled();
    });

    it('should update FAB context based on current URL', () => {
      mockRouter.url = '/tabs/dashboard';
      component.ngOnInit();

      expect(component.fabIcon).toBe('medkit-outline');
      expect(mockTranslationService.instant).toHaveBeenCalledWith('addReading.title');
    });

    it('should subscribe to navigation events', () => {
      component.ngOnInit();

      navigationEventsSubject.next(createNavigationEndEvent('/tabs/appointments'));

      expect(component.fabIcon).toBe('calendar-outline');
      expect(mockTranslationService.instant).toHaveBeenCalledWith('appointments.create.title');
    });
  });

  describe('ngOnInit - Production Mode', () => {
    it('should load queue state when getQueueState is successful', () => {
      const mockQueueState: AppointmentQueueStateResponse = { state: 'ACCEPTED' };
      mockAppointmentService.getQueueState.mockReturnValue(new BehaviorSubject(mockQueueState));

      component['isMockMode'] = false as any;
      component.ngOnInit();

      expect(mockAppointmentService.getQueueState).toHaveBeenCalled();
      expect(component['queueState']).toEqual(mockQueueState);
    });
    it('should handle queue state error gracefully', () => {
      const errorSubject = new Subject<AppointmentQueueStateResponse>();
      mockAppointmentService.getQueueState.mockReturnValue(errorSubject.asObservable());

      component['isMockMode'] = false as any;
      component.ngOnInit();
      errorSubject.error(new Error('Network error'));

      expect(component['queueState']).toEqual({ state: 'NONE' });
    });
  });

  describe('ngOnDestroy', () => {
    it('should clean up subscriptions', () => {
      component.ngOnInit();
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('FAB Context Updates', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update FAB to appointments context when navigating to appointments', () => {
      navigationEventsSubject.next(createNavigationEndEvent('/tabs/appointments'));

      expect(component.fabIcon).toBe('calendar-outline');
      expect(mockTranslationService.instant).toHaveBeenCalledWith('appointments.create.title');
    });

    it('should update FAB to readings context when navigating to dashboard', () => {
      component.fabIcon = 'calendar-outline';

      navigationEventsSubject.next(createNavigationEndEvent('/tabs/dashboard'));

      expect(component.fabIcon).toBe('medkit-outline');
      expect(mockTranslationService.instant).toHaveBeenCalledWith('addReading.title');
    });

    it('should update FAB to readings context when navigating to readings', () => {
      navigationEventsSubject.next(createNavigationEndEvent('/tabs/readings'));

      expect(component.fabIcon).toBe('medkit-outline');
      expect(mockTranslationService.instant).toHaveBeenCalledWith('addReading.title');
    });

    it('should update FAB to readings context when navigating to profile', () => {
      navigationEventsSubject.next(createNavigationEndEvent('/tabs/profile'));

      expect(component.fabIcon).toBe('medkit-outline');
      expect(mockTranslationService.instant).toHaveBeenCalledWith('addReading.title');
    });
  });

  describe('navigateToAddReading - Dashboard/Readings Context', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should navigate to add reading when on dashboard', () => {
      mockRouter.url = '/tabs/dashboard';

      component.navigateToAddReading();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.ADD_READING]);
    });

    it('should navigate to add reading when on readings tab', () => {
      mockRouter.url = '/tabs/readings';

      component.navigateToAddReading();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.ADD_READING]);
    });

    it('should navigate to add reading when on profile tab', () => {
      mockRouter.url = '/tabs/profile';

      component.navigateToAddReading();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.ADD_READING]);
    });
  });

  describe('navigateToAddReading - Appointments Context', () => {
    beforeEach(() => {
      component.ngOnInit();
      mockRouter.url = `/tabs/${ROUTE_SEGMENTS.APPOINTMENTS}`;
    });

    it('should navigate to create appointment when queue state is ACCEPTED', () => {
      component['queueState'] = { state: 'ACCEPTED' };

      component.navigateToAddReading();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.APPOINTMENTS_CREATE]);
      expect(mockToastController.create).not.toHaveBeenCalled();
    });

    it('should show toast and not navigate when queue state is NONE', async () => {
      component['queueState'] = { state: 'NONE' };

      component.navigateToAddReading();
      await fixture.whenStable();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockToastController.create).toHaveBeenCalled();
      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'appointments.errors.cannotCreate'
      );
    });

    it('should show specific toast when queue state is CREATED', async () => {
      component['queueState'] = { state: 'CREATED' };

      component.navigateToAddReading();
      await fixture.whenStable();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'appointments.errors.alreadyHasAppointment'
      );
    });

    it('should show specific toast when queue state is PENDING', async () => {
      component['queueState'] = { state: 'PENDING', position: 1 };

      component.navigateToAddReading();
      await fixture.whenStable();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'appointments.errors.pendingRequest'
      );
    });

    it('should show specific toast when queue state is BLOCKED', async () => {
      component['queueState'] = { state: 'BLOCKED', reason: 'Too many cancellations' };

      component.navigateToAddReading();
      await fixture.whenStable();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(mockTranslationService.instant).toHaveBeenCalledWith('appointments.errors.blocked');
    });

    it('should configure toast correctly', async () => {
      component['queueState'] = { state: 'NONE' };

      component.navigateToAddReading();
      await fixture.whenStable();

      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'appointments.errors.cannotCreate',
        duration: 3000,
        position: 'bottom',
        color: 'warning',
        buttons: [
          {
            text: 'common.close',
            role: 'cancel',
          },
        ],
      });
    });

    it('should present toast after creating it', async () => {
      const presentSpy = vi.fn().mockResolvedValue(undefined);
      mockToastController.create.mockResolvedValue({ present: presentSpy });
      component['queueState'] = { state: 'NONE' };

      component.navigateToAddReading();
      await fixture.whenStable();

      expect(presentSpy).toHaveBeenCalled();
    });
  });

  describe('canCreateAppointment Getter', () => {
    it('should return true when queue state is ACCEPTED', () => {
      component['queueState'] = { state: 'ACCEPTED' };

      expect(component['canCreateAppointment']).toBe(true);
    });

    it('should return false when queue state is NONE', () => {
      component['queueState'] = { state: 'NONE' };

      expect(component['canCreateAppointment']).toBe(false);
    });

    it('should return false when queue state is PENDING', () => {
      component['queueState'] = { state: 'PENDING', position: 1 };

      expect(component['canCreateAppointment']).toBe(false);
    });

    it('should return false when queue state is CREATED', () => {
      component['queueState'] = { state: 'CREATED' };

      expect(component['canCreateAppointment']).toBe(false);
    });

    it('should return false when queue state is BLOCKED', () => {
      component['queueState'] = { state: 'BLOCKED', reason: 'Test' };

      expect(component['canCreateAppointment']).toBe(false);
    });

    it('should return false when queue state is null', () => {
      component['queueState'] = null;

      expect(component['canCreateAppointment']).toBe(false);
    });
  });
});
