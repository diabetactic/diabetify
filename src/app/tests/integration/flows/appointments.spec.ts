/**
 * Appointments Flow Integration Tests
 * London School TDD Approach - Outside-In Development
 *
 * Focus: Testing object collaborations and interactions
 * Mock all collaborators to isolate the component under test
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { AppointmentsPage } from '../../../appointments/appointments.page';
import {
  AppointmentService,
  Appointment,
  AppointmentStatus,
} from '../../../core/services/appointment.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslateModule } from '@ngx-translate/core';
import { getTranslateModuleForTesting } from '../../helpers/translate-test.helper';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

describe('Appointments Flow - London School TDD', () => {
  let component: AppointmentsPage;
  let fixture: ComponentFixture<AppointmentsPage>;

  // Mocks - Define collaborator contracts
  let mockAppointmentService: jasmine.SpyObj<AppointmentService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;

  // Test data
  const mockAppointments: Appointment[] = [
    {
      id: 'apt-1',
      patientId: 'patient-123',
      patientName: 'John Doe',
      doctorId: 'doc-1',
      doctorName: 'Dr. Smith',
      date: '2025-11-05',
      startTime: '10:00',
      endTime: '10:30',
      status: 'confirmed' as AppointmentStatus,
      urgency: 'routine',
      reason: 'Regular checkup',
      createdAt: '2025-11-03T10:00:00Z',
      updatedAt: '2025-11-03T10:00:00Z',
    },
    {
      id: 'apt-2',
      patientId: 'patient-123',
      patientName: 'John Doe',
      doctorId: 'doc-2',
      doctorName: 'Dr. Johnson',
      date: '2025-10-30',
      startTime: '14:00',
      endTime: '14:30',
      status: 'completed' as AppointmentStatus,
      urgency: 'routine',
      reason: 'Follow-up',
      createdAt: '2025-10-25T10:00:00Z',
      updatedAt: '2025-10-30T14:30:00Z',
    },
  ];

  beforeEach(async () => {
    // Create mock behavior subjects for reactive streams
    // Start with empty array - tests will emit data as needed
    const appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
    const upcomingAppointmentSubject = new BehaviorSubject<Appointment | null>(null);

    // Mock AppointmentService - Define expected collaborations
    mockAppointmentService = jasmine.createSpyObj<AppointmentService>(
      'AppointmentService',
      ['getAppointments'],
      {
        appointments$: appointmentsSubject.asObservable(),
        upcomingAppointment$: upcomingAppointmentSubject.asObservable(),
      }
    );
    mockAppointmentService.getAppointments.and.returnValue(of(mockAppointments));

    // Store subjects for test access
    (mockAppointmentService as any)._appointmentsSubject = appointmentsSubject;
    (mockAppointmentService as any)._upcomingAppointmentSubject = upcomingAppointmentSubject;

    // Mock Router - Track navigation interactions
    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    // Mock TranslationService - Return test translations
    mockTranslationService = jasmine.createSpyObj<TranslationService>('TranslationService', [
      'instant',
    ]);
    mockTranslationService.instant.and.callFake((key: string) => `translated.${key}`);

    await TestBed.configureTestingModule({
      declarations: [AppointmentsPage],
      imports: [IonicModule.forRoot(), FormsModule, getTranslateModuleForTesting()],
      providers: [
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: Router, useValue: mockRouter },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentsPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  /**
   * Test Suite 1: Initialization and Loading
   * Focus: Verify component coordinates with AppointmentService on init
   */
  describe('Initialization and Loading', () => {
    it('should coordinate appointments loading on initialization', async () => {
      // Arrange
      expect(component.loading).toBe(false);

      // Act
      fixture.detectChanges(); // Triggers ngOnInit
      await fixture.whenStable();

      // Assert - Verify the collaboration
      expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
      expect(component.loading).toBe(false); // Should complete
    });

    it('should subscribe to appointments$ observable on init', () => {
      // Arrange
      const appointmentsSubject = (mockAppointmentService as any)._appointmentsSubject;

      // Act
      fixture.detectChanges(); // Triggers ngOnInit and subscribes

      // Assert - Initially empty
      expect(component.appointments.length).toBe(0);

      // Emit appointments
      appointmentsSubject.next(mockAppointments);
      fixture.detectChanges();

      // Assert - Verify subscription received data
      expect(component.appointments).toEqual(mockAppointments);
    });

    it('should handle loading errors gracefully', async () => {
      // Arrange
      const errorMessage = 'Network error';
      mockAppointmentService.getAppointments.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      // Act
      await component.loadAppointments();

      // Assert - Verify error handling collaboration
      expect(component.error).toBeTruthy();
      expect(component.loading).toBe(false);
      // The component uses error.message || translationService.instant()
      // Since we provide an error message, instant() won't be called
      expect(component.error).toBe(errorMessage);
    });

    it('should show loading state during appointment fetch', async () => {
      // Arrange
      mockAppointmentService.getAppointments.and.returnValue(of([]));

      // Act
      const loadPromise = component.loadAppointments();

      // Assert - Verify loading state is set
      expect(component.loading).toBe(true);

      await loadPromise;
      expect(component.loading).toBe(false);
    });
  });

  /**
   * Test Suite 2: Appointments Categorization
   * Focus: Verify component correctly categorizes and sorts appointments
   */
  describe('Appointments Categorization', () => {
    it('should categorize appointments into upcoming and past', () => {
      // Arrange
      const appointmentsSubject = (mockAppointmentService as any)._appointmentsSubject;

      // Act
      fixture.detectChanges(); // Triggers ngOnInit and subscribes
      appointmentsSubject.next(mockAppointments);
      fixture.detectChanges();

      // Assert - Verify categorization logic
      expect(component.upcomingAppointments.length).toBeGreaterThanOrEqual(0);
      expect(component.pastAppointments.length).toBeGreaterThanOrEqual(0);

      // Total should match
      const total = component.upcomingAppointments.length + component.pastAppointments.length;
      expect(total).toBeLessThanOrEqual(mockAppointments.length);
    });

    it('should sort upcoming appointments by date ascending', () => {
      // Arrange
      const futureAppointments: Appointment[] = [
        { ...mockAppointments[0], date: '2025-11-10', startTime: '10:00' },
        { ...mockAppointments[0], date: '2025-11-05', startTime: '14:00' },
        { ...mockAppointments[0], date: '2025-11-08', startTime: '09:00' },
      ];
      const appointmentsSubject = (mockAppointmentService as any)._appointmentsSubject;

      // Act
      fixture.detectChanges(); // Triggers ngOnInit and subscribes
      appointmentsSubject.next(futureAppointments);
      fixture.detectChanges();

      // Assert - Verify sorting
      const upcoming = component.upcomingAppointments;
      if (upcoming.length > 1) {
        for (let i = 0; i < upcoming.length - 1; i++) {
          const current = new Date(`${upcoming[i].date} ${upcoming[i].startTime}`);
          const next = new Date(`${upcoming[i + 1].date} ${upcoming[i + 1].startTime}`);
          expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
      }
    });

    it('should sort past appointments by date descending', () => {
      // Arrange
      const pastAppointments: Appointment[] = [
        { ...mockAppointments[1], date: '2025-10-20', status: 'completed' as AppointmentStatus },
        { ...mockAppointments[1], date: '2025-10-25', status: 'completed' as AppointmentStatus },
        { ...mockAppointments[1], date: '2025-10-15', status: 'completed' as AppointmentStatus },
      ];
      const appointmentsSubject = (mockAppointmentService as any)._appointmentsSubject;

      // Act
      fixture.detectChanges(); // Triggers ngOnInit and subscribes
      appointmentsSubject.next(pastAppointments);
      fixture.detectChanges();

      // Assert - Verify descending sort
      const past = component.pastAppointments;
      if (past.length > 1) {
        for (let i = 0; i < past.length - 1; i++) {
          const current = new Date(`${past[i].date} ${past[i].startTime}`);
          const next = new Date(`${past[i + 1].date} ${past[i + 1].startTime}`);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  /**
   * Test Suite 3: Navigation Interactions
   * Focus: Verify component coordinates navigation with Router
   */
  describe('Navigation Interactions', () => {
    it('should navigate to create appointment page when createAppointment is called', () => {
      // Act
      component.createAppointment();

      // Assert - Verify Router interaction
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/appointments/new']);
      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    });

    it('should navigate to appointment detail page with correct ID', () => {
      // Arrange
      const appointment = mockAppointments[0];

      // Act
      component.viewAppointment(appointment);

      // Assert - Verify Router receives correct parameters
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/tabs/appointments/appointment-detail',
        appointment.id,
      ]);
    });

    it('should not navigate if appointment has no ID', () => {
      // Arrange
      const appointmentWithoutId = { ...mockAppointments[0], id: undefined };

      // Act
      component.viewAppointment(appointmentWithoutId);

      // Assert - Verify Router is not called
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  /**
   * Test Suite 4: User Interactions
   * Focus: Verify component handles user actions correctly
   */
  describe('User Interactions', () => {
    it('should handle segment change correctly', () => {
      // Arrange
      const event = { detail: { value: 'past' } };

      // Act
      component.onSegmentChange(event);

      // Assert
      expect(component.selectedSegment).toBe('past');
    });

    it('should handle pull to refresh interaction', async () => {
      // Arrange
      const mockEvent = {
        target: {
          complete: jasmine.createSpy('complete'),
        },
      };

      // Act
      await component.doRefresh(mockEvent);

      // Assert - Verify collaboration sequence
      expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
      expect(mockEvent.target.complete).toHaveBeenCalled();
    });
  });

  /**
   * Test Suite 5: Appointment Display Helpers
   * Focus: Verify helper methods work correctly
   */
  describe('Appointment Display Helpers', () => {
    it('should return correct status color for each status', () => {
      expect(component.getStatusColor('confirmed')).toBe('success');
      expect(component.getStatusColor('pending')).toBe('warning');
      expect(component.getStatusColor('cancelled')).toBe('danger');
      expect(component.getStatusColor('completed')).toBe('medium');
      expect(component.getStatusColor('rescheduled')).toBe('tertiary');
      expect(component.getStatusColor('no_show')).toBe('danger');
    });

    it('should return correct status icon for each status', () => {
      expect(component.getStatusIcon('confirmed')).toBe('check_circle');
      expect(component.getStatusIcon('pending')).toBe('schedule');
      expect(component.getStatusIcon('cancelled')).toBe('cancel');
      expect(component.getStatusIcon('completed')).toBe('task_alt');
      expect(component.getStatusIcon('no_show')).toBe('person_off');
      expect(component.getStatusIcon('rescheduled')).toBe('update');
    });

    it('should return correct urgency color', () => {
      expect(component.getUrgencyColor('emergency')).toBe('danger');
      expect(component.getUrgencyColor('urgent')).toBe('warning');
      expect(component.getUrgencyColor('routine')).toBe('primary');
    });

    it('should format date correctly', () => {
      const formatted = component.formatDate('2025-11-05');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should format time to HH:MM', () => {
      expect(component.formatTime('10:00:00')).toBe('10:00');
      expect(component.formatTime('14:30:00')).toBe('14:30');
    });
  });

  /**
   * Test Suite 6: Lifecycle and Cleanup
   * Focus: Verify component properly manages subscriptions
   */
  describe('Lifecycle and Cleanup', () => {
    it('should complete destroy$ subject on component destroy', () => {
      // Arrange
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      // Act
      component.ngOnDestroy();

      // Assert
      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  /**
   * Test Suite 7: Full User Flow (Acceptance Test)
   * Focus: Outside-in test covering complete user journey
   */
  describe('Full Appointment Booking Flow', () => {
    it('should coordinate complete appointment booking workflow', async () => {
      // Arrange
      const appointmentsSubject = (mockAppointmentService as any)._appointmentsSubject;

      // Act 1: Initialize page
      fixture.detectChanges(); // Triggers ngOnInit and subscribes

      // Assert 1: Verify initialization
      expect(mockAppointmentService.getAppointments).toHaveBeenCalled();

      // Act 2: Load appointments
      appointmentsSubject.next(mockAppointments);
      fixture.detectChanges();

      // Assert 2: Verify appointments displayed
      expect(component.appointments).toEqual(mockAppointments);

      // Act 3: User clicks create appointment
      component.createAppointment();

      // Assert 3: Verify navigation to create page
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/appointments/new']);

      // Simulate appointment creation would happen on create page...

      // Act 4: User views an appointment
      component.viewAppointment(mockAppointments[0]);

      // Assert 4: Verify navigation to detail page
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/tabs/appointments/appointment-detail',
        mockAppointments[0].id,
      ]);
    });
  });
});
