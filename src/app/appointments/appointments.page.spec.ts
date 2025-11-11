import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppointmentsPage } from './appointments.page';
import { AppointmentService } from '../core/services/appointment.service';
import { of } from 'rxjs';

describe('AppointmentsPage', () => {
  let component: AppointmentsPage;
  let fixture: ComponentFixture<AppointmentsPage>;
  let appointmentServiceSpy: jasmine.SpyObj<AppointmentService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj(
      'AppointmentService',
      ['getAppointments', 'shareGlucoseData'],
      {
        appointments$: of([]),
        upcomingAppointment$: of(null),
      }
    );

    await TestBed.configureTestingModule({
      declarations: [AppointmentsPage],
      imports: [FormsModule, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AppointmentService, useValue: spy },
        TranslateService,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    appointmentServiceSpy = TestBed.inject(
      AppointmentService
    ) as jasmine.SpyObj<AppointmentService>;
    appointmentServiceSpy.getAppointments.and.returnValue(of([]));

    fixture = TestBed.createComponent(AppointmentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
