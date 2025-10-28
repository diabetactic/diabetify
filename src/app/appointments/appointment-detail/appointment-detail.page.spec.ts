import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppointmentDetailPage } from './appointment-detail.page';

describe('AppointmentDetailPage', () => {
  let component: AppointmentDetailPage;
  let fixture: ComponentFixture<AppointmentDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AppointmentDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
