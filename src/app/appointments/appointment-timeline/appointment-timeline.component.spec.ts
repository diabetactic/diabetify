import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AppointmentTimelineComponent } from './appointment-timeline.component';
import { SimpleChange } from '@angular/core';

describe('AppointmentTimelineComponent', () => {
  let component: AppointmentTimelineComponent;
  let fixture: ComponentFixture<AppointmentTimelineComponent>;

  const mockAppointment: any = {
    status: 'ACCEPTED',
    timestamps: {
      created_at: '2023-10-27T10:00:00Z', // PENDING maps to created_at
      accepted_at: '2023-10-27T12:30:00Z', // ACCEPTED maps to accepted_at
    },
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), AppointmentTimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentTimelineComponent);
    component = fixture.componentInstance;
    component.appointment = mockAppointment;

    // Trigger ngOnChanges to initialize state
    component.ngOnChanges({
      appointment: new SimpleChange(null, mockAppointment, true),
    });

    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set the current status on changes', () => {
    expect(component.currentStatus).toBe('ACCEPTED');
    expect(component.steps).toEqual(['PENDING', 'ACCEPTED', 'CREATED']);
  });

  it('should correctly determine if a step is active', () => {
    expect(component.isStepActive('PENDING')).toBe(true);
    expect(component.isStepActive('ACCEPTED')).toBe(true);
    expect(component.isStepActive('CREATED')).toBe(false);
  });

  it('should handle DENIED status branching', () => {
    const deniedAppt: any = { status: 'DENIED', timestamps: {} };
    component.appointment = deniedAppt;
    component.ngOnChanges({
      appointment: new SimpleChange(mockAppointment, deniedAppt, false),
    });

    expect(component.currentStatus).toBe('DENIED');
    expect(component.steps).toEqual(['PENDING', 'DENIED']);
    expect(component.isStepActive('PENDING')).toBe(true);
    expect(component.isStepActive('DENIED')).toBe(true);
  });

  it('should return the correct timestamp for a step', () => {
    const pendingTimestamp = new Date('2023-10-27T10:00:00Z').toLocaleString();
    expect(component.getTimestamp('PENDING')).toBe(pendingTimestamp);
  });

  it('should return null for a step without a timestamp', () => {
    expect(component.getTimestamp('CREATED')).toBeNull();
  });

  it('should calculate the progress percentage correctly', () => {
    // Steps: PENDING (0), ACCEPTED (1), CREATED (2). Total 2 segments.
    // Current: ACCEPTED (index 1).
    // Progress: 1/2 * 100 = 50%
    expect(component.progressPercentage).toBe(50);
  });

  it('should handle an unknown status gracefully', () => {
    const unknownAppt: any = { status: 'Unknown' };
    component.appointment = unknownAppt;
    component.ngOnChanges({
      appointment: new SimpleChange(mockAppointment, unknownAppt, false),
    });

    expect(component.currentStatus).toBe('NONE');
    expect(component.progressPercentage).toBe(0);
  });

  it('should handle COMPLETED status', () => {
    const completedAppt: any = { status: 'COMPLETED', timestamps: {} };
    component.appointment = completedAppt;
    component.ngOnChanges({
      appointment: new SimpleChange(mockAppointment, completedAppt, false),
    });

    expect(component.currentStatus).toBe('COMPLETED');
    expect(component.steps).toEqual(['PENDING', 'ACCEPTED', 'CREATED', 'COMPLETED']);
    expect(component.progressPercentage).toBe(100);
  });
});
