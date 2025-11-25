import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';

import { ReadingsPage } from './readings.page';
import { ReadingsService } from '../core/services/readings.service';
import { ProfileService } from '../core/services/profile.service';
import { TranslationService } from '../core/services/translation.service';
import { ReadingsPageModule } from './readings.module';

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
}

class ProfileServiceStub {
  profile$ = of(null);
}

class TranslationServiceStub {
  instant(key: string): string {
    return key;
  }

  getCurrentLanguage(): string {
    return 'en-US';
  }
}

describe('ReadingsPage', () => {
  let component: ReadingsPage;
  let fixture: ComponentFixture<ReadingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        RouterTestingModule,
        ReadingsPageModule,
      ],
      providers: [
        { provide: ReadingsService, useClass: ReadingsServiceStub },
        { provide: ProfileService, useClass: ProfileServiceStub },
        { provide: TranslationService, useClass: TranslationServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
