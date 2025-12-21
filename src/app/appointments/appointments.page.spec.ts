// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppointmentsPage } from './appointments.page';
import { AppointmentService } from '@core/services/appointment.service';
import { of } from 'rxjs';
import { getLucideIconsForTesting } from '@core/../tests/helpers/icon-test.helper';

// Mock AppointmentService with Vitest
const mockAppointmentService = {
  appointments$: of([]),
  upcomingAppointment$: of(null),
  getAppointments: vi.fn().mockReturnValue(of([])),
  shareGlucoseData: vi.fn(),
  getQueueState: vi.fn().mockReturnValue(of({ state: 'NONE', position: null })),
  checkQueueOpen: vi.fn().mockReturnValue(of(true)),
  getQueuePosition: vi.fn().mockReturnValue(of(null)),
  requestAppointment: vi.fn().mockReturnValue(of({ state: 'PENDING', position: 1 })),
};

describe('AppointmentsPage', () => {
  let component: AppointmentsPage;
  let fixture: ComponentFixture<AppointmentsPage>;

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [
        AppointmentsPage,
        FormsModule,
        TranslateModule.forRoot(),
        getLucideIconsForTesting(),
      ],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AppointmentService, useValue: mockAppointmentService },
        TranslateService,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
