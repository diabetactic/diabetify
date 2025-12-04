import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { AppointmentDetailPage } from './appointment-detail.page';
import { AppointmentService } from '../../core/services/appointment.service';
import { AppointmentDetailPageModule } from './appointment-detail.module';
import { getLucideIconsForTesting } from '../../tests/helpers/icon-test.helper';

describe('AppointmentDetailPage', () => {
  let component: AppointmentDetailPage;
  let fixture: ComponentFixture<AppointmentDetailPage>;
  let appointmentServiceSpy: jasmine.SpyObj<AppointmentService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AppointmentService', ['getAppointment']);

    TestBed.configureTestingModule({
      imports: [AppointmentDetailPageModule, TranslateModule.forRoot(), getLucideIconsForTesting()],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AppointmentService, useValue: spy },
        TranslateService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (_key: string) => 'test-id',
              },
            },
            params: of({ id: 'test-id' }),
          },
        },
      ],
    });

    appointmentServiceSpy = TestBed.inject(
      AppointmentService
    ) as jasmine.SpyObj<AppointmentService>;
    // Mock the getAppointment to return an error (since we don't have a real appointment)
    appointmentServiceSpy.getAppointment.and.returnValue(
      throwError(() => new Error('Appointment not found'))
    );

    fixture = TestBed.createComponent(AppointmentDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
