// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ReadingItemComponent } from './reading-item.component';
import { TranslationService } from '@services/translation.service';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';

class TranslationServiceStub {
  formatTime(): string {
    return '10:00 AM';
  }

  instant(key: string): string {
    return key;
  }

  getCurrentLanguage(): string {
    return 'en-US';
  }
}

describe('ReadingItemComponent', () => {
  let component: ReadingItemComponent;
  let fixture: ComponentFixture<ReadingItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingItemComponent, TranslateModule.forRoot()],
      providers: [{ provide: TranslationService, useClass: TranslationServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingItemComponent);
    component = fixture.componentInstance;
    const reading: LocalGlucoseReading = {
      id: 'reading-1',
      value: 110,
      units: 'mg/dL',
      time: new Date().toISOString(),
      type: 'smbg',
      synced: true,
      userId: 'user-1',
      status: 'normal',
      localStoredAt: new Date().toISOString(),
    };
    component.reading = reading;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
