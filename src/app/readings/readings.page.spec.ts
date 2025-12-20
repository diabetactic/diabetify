// Initialize TestBed environment for Vitest
import '../../test-setup';

import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, ModalController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { ReadingsPage } from './readings.page';
import { ReadingsPageModule } from './readings.module';
import { ReadingsService } from '@core/services/readings.service';
import { ProfileService } from '@core/services/profile.service';
import { TranslationService } from '@core/services/translation.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ReadingItemComponent } from '@shared/components/reading-item/reading-item.component';
import { Component, Input } from '@angular/core';
import { getLucideIconsForTesting } from '@core/../tests/helpers/icon-test.helper';
import { LoggerService } from '@core/services/logger.service';

class LoggerServiceStub {
  info(_context: string, _message: string, _data?: any): void {}
  warn(_context: string, _message: string, _metadata?: any): void {}
  error(_context: string, _message: string, _error?: any, _metadata?: any): void {}
  debug(_context: string, _message: string, _metadata?: any): void {}
}

class ReadingsServiceStub {
  private readingsSubject = new BehaviorSubject<any[]>([]);
  readings$ = this.readingsSubject.asObservable();

  async getAllReadings(
    limit?: number,
    offset: number = 0
  ): Promise<{
    readings: any[];
    total: number;
    hasMore: boolean;
    offset: number;
    limit: number;
  }> {
    return Promise.resolve({
      readings: [],
      total: 0,
      hasMore: false,
      offset: offset,
      limit: limit || 100,
    });
  }

  async fetchFromBackend(): Promise<{ merged: number }> {
    return Promise.resolve({ merged: 0 });
  }
}

class ProfileServiceStub {
  profile$ = of(null);
  getProfile() {
    return Promise.resolve(null);
  }
}

class TranslationServiceStub {
  instant(key: string): string {
    return key;
  }

  getCurrentLanguage(): string {
    return 'en-US';
  }
}

@Component({
  selector: 'app-icon',
  template: '',
  standalone: true,
})
class MockAppIconComponent {
  @Input() name: string = '';
  @Input() size: string = '';
  @Input() class: string = '';
}

@Component({
  selector: 'app-empty-state',
  template: '',
  standalone: true,
})
class MockEmptyStateComponent {
  @Input() illustration: string = '';
  @Input() heading: string = '';
  @Input() message: string = '';
  @Input() ctaText: string = '';
}

@Component({
  selector: 'app-reading-item',
  template: '',
  standalone: true,
})
class MockReadingItemComponent {
  @Input() reading: any;
}

describe('ReadingsPage', () => {
  let component: ReadingsPage;
  let fixture: ComponentFixture<ReadingsPage>;

  beforeEach(async () => {
    const mockModalController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: null }),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        ReadingsPageModule,
        getLucideIconsForTesting(),
      ],
      providers: [
        provideRouter([]),
        { provide: ReadingsService, useClass: ReadingsServiceStub },
        { provide: ProfileService, useClass: ProfileServiceStub },
        { provide: TranslationService, useClass: TranslationServiceStub },
        { provide: ModalController, useValue: mockModalController },
        { provide: LoggerService, useClass: LoggerServiceStub },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideModule(ReadingsPageModule, {
        remove: { imports: [AppIconComponent, EmptyStateComponent, ReadingItemComponent] },
        add: { imports: [MockAppIconComponent, MockEmptyStateComponent, MockReadingItemComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReadingsPage);
    component = fixture.componentInstance;
    // DO NOT call fixture.detectChanges() as it triggers template rendering
    // which requires Ionic's ControlValueAccessor for ion-searchbar
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
