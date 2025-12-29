// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ReadingsListComponent } from './readings-list.component';
import { TranslationService } from '@core/services/translation.service';

describe('ReadingsListComponent', () => {
  let component: ReadingsListComponent;
  let fixture: ComponentFixture<ReadingsListComponent>;
  let mockTranslationService: any;

  beforeEach(async () => {
    mockTranslationService = {
      instant: vi.fn((key: string) => key),
      formatTime: vi.fn((time: string) => time),
      getCurrentLanguage: vi.fn(() => 'es'),
    };

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), ReadingsListComponent],
      providers: [{ provide: TranslationService, useValue: mockTranslationService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should emit readingClicked event on onReadingClick', () => {
    fixture.detectChanges();
    spyOn(component.readingClicked, 'emit');
    const reading = {
      id: '1',
      time: '2024-01-01T00:00:00.000Z',
      value: 100,
      status: 'normal',
      unit: 'mg/dL',
    };
    component.onReadingClick(reading);
    expect(component.readingClicked.emit).toHaveBeenCalledWith(reading);
  });

  it('should emit addReading event on onAddReading', () => {
    fixture.detectChanges();
    spyOn(component.addReading, 'emit');
    component.onAddReading();
    expect(component.addReading.emit).toHaveBeenCalled();
  });

  it('should emit clearFilters event on onClearFilters', () => {
    fixture.detectChanges();
    spyOn(component.clearFilters, 'emit');
    component.onClearFilters();
    expect(component.clearFilters.emit).toHaveBeenCalled();
  });

  it('should show empty state when no readings', () => {
    component.isLoading = false;
    component.totalCount = 0;
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="readings-empty"]')).not.toBeNull();
  });

  it('should show no-results state when filtered and no readings', () => {
    component.isLoading = false;
    component.totalCount = 10;
    component.filteredCount = 0;
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-empty-state[illustration="search"]')).not.toBeNull();
  });
});
