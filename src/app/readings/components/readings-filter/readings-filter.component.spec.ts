// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { vi } from 'vitest';
import { ReadingsFilterComponent } from './readings-filter.component';

describe('ReadingsFilterComponent', () => {
  let component: ReadingsFilterComponent;
  let fixture: ComponentFixture<ReadingsFilterComponent>;
  const mockDate = new Date('2024-01-01T12:00:00.000Z');

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), ReadingsFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close event on closeModal', () => {
    spyOn(component.closeFilter, 'emit');
    component.closeModal();
    expect(component.closeFilter.emit).toHaveBeenCalled();
  });

  it('should emit apply event on applyFilters', () => {
    spyOn(component.apply, 'emit');
    component.applyFilters();
    expect(component.apply.emit).toHaveBeenCalledWith(component.filters);
  });

  it('should emit clear event on clearFilters', () => {
    spyOn(component.clear, 'emit');
    component.clearFilters();
    expect(component.clear.emit).toHaveBeenCalled();
  });

  it('should set filters to all time', () => {
    component.setFilterAllTime();
    expect(component.filters.startDate).toBeUndefined();
    expect(component.filters.endDate).toBeUndefined();
  });

  it('should set filters to last 24 hours', () => {
    component.setFilterLast24Hours();
    expect(component.filters.startDate).toEqual(new Date(mockDate.getTime() - 24 * 60 * 60 * 1000));
    expect(component.filters.endDate).toEqual(mockDate);
  });

  it('should set filters to last 7 days', () => {
    component.setFilterLast7Days();
    expect(component.filters.startDate).toEqual(
      new Date(mockDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
    expect(component.filters.endDate).toEqual(mockDate);
  });

  it('should set filters to last 30 days', () => {
    component.setFilterLast30Days();
    expect(component.filters.startDate).toEqual(
      new Date(mockDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    );
    expect(component.filters.endDate).toEqual(mockDate);
  });
});
