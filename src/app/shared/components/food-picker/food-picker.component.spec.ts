import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FoodPickerComponent } from './food-picker.component';
import { FoodService } from '@services/food.service';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('FoodPickerComponent', () => {
  let component: FoodPickerComponent;
  let fixture: ComponentFixture<FoodPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoodPickerComponent, TranslateModule.forRoot()],
      providers: [FoodService, provideNoopAnimations()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FoodPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
