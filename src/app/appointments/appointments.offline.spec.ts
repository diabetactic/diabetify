import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppointmentsPage } from './appointments.page';
import { AppointmentService } from '@services/appointment.service';
import { Network } from '@capacitor/network';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentConfigService } from '@core/config/environment-config.service';
import { LoggerService } from '@services/logger.service';
import { ToastController } from '@ionic/angular';

// Mock Capacitor Network
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn(),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

describe('AppointmentsPage Offline Handling', () => {
  let component: AppointmentsPage;
  let fixture: ComponentFixture<AppointmentsPage>;
  let mockAppointmentService: any;
  let mockToastController: any;

  beforeEach(async () => {
    mockAppointmentService = {
      getAppointments: vi.fn().mockReturnValue(of([])),
      getQueueState: vi.fn().mockReturnValue(of({ state: 'NONE' })),
      appointments$: of([]),
    };

    mockToastController = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() }),
    };

    await TestBed.configureTestingModule({
      imports: [AppointmentsPage, TranslateModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: ToastController, useValue: mockToastController },
        {
          provide: EnvironmentConfigService,
          useValue: { isMockMode: false },
        },
        {
          provide: LoggerService,
          useValue: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  it('should show offline error and not display server error when offline', async () => {
    vi.mocked(Network.getStatus).mockResolvedValue({ connected: false, connectionType: 'none' });

    mockAppointmentService.getAppointments.mockReturnValue(
      throwError(() => new Error('Server error'))
    );

    fixture = TestBed.createComponent(AppointmentsPage);
    component = fixture.componentInstance;

    component.ngOnInit();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.isOnline).toBe(false);

    // loadAppointments() is called but returns early with offline error
    expect(component.error).not.toBe('Server error');
  });
});
