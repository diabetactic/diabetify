import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AppointmentsPage } from './appointments.page';
import { AppointmentService } from '@services/appointment.service';
import { TranslationService } from '@services/translation.service';
import { LoggerService } from '@services/logger.service';
import { EnvironmentConfigService } from '@core/config/environment-config.service';
import { AppointmentQueueStateResponse } from '@models/appointment.model';
import { Network } from '@capacitor/network';

// Mock Network plugin
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true }),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
}));

describe('AppointmentsPage', () => {
  let component: AppointmentsPage;
  let fixture: ComponentFixture<AppointmentsPage>;
  let appointmentService: any;
  let router: any;
  let translationService: any;
  let loggerService: any;
  let toastController: any;
  let envConfig: any;

  beforeEach(async () => {
    appointmentService = {
      appointments$: of([]),
      getAppointments: vi.fn().mockReturnValue(of([])),
      getQueueState: vi.fn().mockReturnValue(of({ state: 'NONE' })),
      checkQueueOpen: vi.fn().mockReturnValue(of(true)),
      getQueuePosition: vi.fn().mockReturnValue(of(0)),
      requestAppointment: vi.fn().mockReturnValue(of({ success: true, state: 'PENDING' })),
    };

    router = {
      navigate: vi.fn(),
    };

    translationService = {
      instant: vi.fn(key => key),
    };

    loggerService = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    toastController = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() }),
    };

    envConfig = {
      isMockMode: false,
    };

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), AppointmentsPage],
      providers: [
        { provide: AppointmentService, useValue: appointmentService },
        { provide: Router, useValue: router },
        { provide: TranslationService, useValue: translationService },
        { provide: LoggerService, useValue: loggerService },
        { provide: ToastController, useValue: toastController },
        { provide: EnvironmentConfigService, useValue: envConfig },
        { provide: TranslateService, useValue: translationService }, // Needed for pipe
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Offline Behavior', () => {
    it('should disable appointment request when offline', async () => {
      component.isOnline = false;
      // Force queue state to NONE to normally allow request
      component.queueState = { state: 'NONE' };

      expect(component.canRequestAppointment).toBeFalsy();
    });

    it('should show toast if requesting while offline', async () => {
      component.isOnline = false;
      await component.onRequestAppointment();

      expect(appointmentService.requestAppointment).not.toHaveBeenCalled();
      expect(toastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'warning',
        })
      );
    });

    it('should enable appointment request when online and queue state is NONE', () => {
      component.isOnline = true;
      component.queueState = { state: 'NONE' };

      expect(component.canRequestAppointment).toBeTruthy();
    });
  });

  describe('Appointment Display Logic', () => {
    it('should not show current appointment if state is PENDING', () => {
      component.appointments = [{ appointment_id: 123 } as any];
      component.queueState = { state: 'PENDING' };

      expect(component.currentAppointment).toBeNull();
    });

    it('should not show current appointment if state is ACCEPTED', () => {
      component.appointments = [{ appointment_id: 123 } as any];
      component.queueState = { state: 'ACCEPTED' };

      expect(component.currentAppointment).toBeNull();
    });

    it('should show current appointment ONLY if state is CREATED', () => {
      const mockAppt = { appointment_id: 123 } as any;
      component.appointments = [mockAppt];
      component.queueState = { state: 'CREATED' };

      expect(component.currentAppointment).toEqual(mockAppt);
    });

    it('should show all appointments as past if state is PENDING', () => {
      const mockAppt1 = { appointment_id: 123 } as any;
      const mockAppt2 = { appointment_id: 122 } as any;
      component.appointments = [mockAppt1, mockAppt2];
      component.queueState = { state: 'PENDING' };

      // Since currentAppointment is null, everything is past
      expect(component.pastAppointments.length).toBe(2);
      expect(component.pastAppointments[0]).toEqual(mockAppt1);
    });

    it('should exclude current appointment from past appointments if state is CREATED', () => {
      const mockAppt1 = { appointment_id: 123 } as any;
      const mockAppt2 = { appointment_id: 122 } as any;
      component.appointments = [mockAppt1, mockAppt2];
      component.queueState = { state: 'CREATED' };

      expect(component.pastAppointments.length).toBe(1);
      expect(component.pastAppointments[0]).toEqual(mockAppt2);
    });
  });
});
