// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { FoodPickerComponent } from './food-picker.component';
import { TranslationService } from '@core/services/translation.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('FoodPickerComponent', () => {
  let component: FoodPickerComponent;
  let fixture: ComponentFixture<FoodPickerComponent>;
  let mockTranslationService: any;

  beforeEach(async () => {
    mockTranslationService = {
      instant: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FoodPickerComponent],
      providers: [
        { provide: TranslationService, useValue: mockTranslationService },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoodPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
