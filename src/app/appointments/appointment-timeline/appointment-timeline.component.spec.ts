import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { AppointmentTimelineComponent } from './appointment-timeline.component';

describe('AppointmentTimelineComponent', () => {
  let component: AppointmentTimelineComponent;
  let fixture: ComponentFixture<AppointmentTimelineComponent>;

  const mockAppointment = {
    status: 'ACCEPTED',
    timestamps: {
      PENDING: '2023-10-27T10:00:00Z',
      ACCEPTED: '2023-10-27T12:30:00Z',
    },
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), AppointmentTimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentTimelineComponent);
    component = fixture.componentInstance;
    component.appointment = mockAppointment;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set the current status on init', () => {
    component.ngOnInit();
    expect(component.currentStatus).toBe('ACCEPTED');
  });

  it('should correctly determine if a state is active', () => {
    component.currentStatus = 'ACCEPTED';
    expect(component.isStateActive('NONE')).toBe(true);
    expect(component.isStateActive('PENDING')).toBe(true);
    expect(component.isStateActive('ACCEPTED')).toBe(true);
    expect(component.isStateActive('CREATED')).toBe(false);
    expect(component.isStateActive('DENIED')).toBe(false);
  });

  it('should return the correct timestamp for a state', () => {
    const pendingTimestamp = new Date('2023-10-27T10:00:00Z').toLocaleString();
    expect(component.getTimestamp('PENDING')).toBe(pendingTimestamp);
  });

  it('should return null for a state without a timestamp', () => {
    expect(component.getTimestamp('CREATED')).toBeNull();
  });

  it('should calculate the progress percentage correctly', () => {
    component.currentStatus = 'ACCEPTED';
    expect(component.progressPercentage).toBe(50);
  });

  it('should handle an unknown status gracefully', () => {
    component.currentStatus = 'Unknown';
    expect(component.progressPercentage).toBe(0);
  });
});
