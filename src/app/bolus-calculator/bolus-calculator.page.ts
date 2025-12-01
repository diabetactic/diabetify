import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MockDataService, BolusCalculation } from '../core/services/mock-data.service';
import { FoodService } from '../core/services/food.service';
import { FoodPickerResult, SelectedFood } from '../core/models/food.model';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';
import { FoodPickerComponent } from '../shared/components/food-picker/food-picker.component';

@Component({
  selector: 'app-bolus-calculator',
  templateUrl: './bolus-calculator.page.html',
  styleUrls: ['./bolus-calculator.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    AppIconComponent,
    FoodPickerComponent,
    // Ionic standalone components
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonInput,
    IonSpinner,
  ],
})
export class BolusCalculatorPage {
  private translate = inject(TranslateService);
  private foodService = inject(FoodService);

  calculatorForm: FormGroup;
  calculating = false;
  result: BolusCalculation | null = null;

  /** Food picker modal state */
  showFoodPicker = signal(false);

  /** Selected foods from food picker */
  selectedFoods = signal<SelectedFood[]>([]);

  constructor(
    private fb: FormBuilder,
    private mockData: MockDataService,
    private navCtrl: NavController
  ) {
    this.calculatorForm = this.fb.group({
      currentGlucose: ['', [Validators.required, Validators.min(40), Validators.max(600)]],
      carbGrams: ['', [Validators.required, Validators.min(0), Validators.max(300)]],
    });
  }

  /** Open the food picker modal */
  openFoodPicker(): void {
    this.foodService.clearSelection();
    this.showFoodPicker.set(true);
  }

  /** Close food picker without applying */
  onFoodPickerClosed(): void {
    this.showFoodPicker.set(false);
  }

  /** Apply selected foods from picker */
  onFoodPickerConfirmed(result: FoodPickerResult): void {
    this.showFoodPicker.set(false);
    this.selectedFoods.set(result.selectedFoods);

    // Update the carbs field with total from food picker
    if (result.totalCarbs > 0) {
      this.calculatorForm.patchValue({
        carbGrams: Math.round(result.totalCarbs),
      });
      this.calculatorForm.get('carbGrams')?.markAsTouched();
    }
  }

  /** Clear selected foods */
  clearSelectedFoods(): void {
    this.selectedFoods.set([]);
    this.calculatorForm.patchValue({ carbGrams: '' });
  }

  async calculateBolus() {
    if (!this.calculatorForm.valid) {
      return;
    }

    this.calculating = true;
    const { currentGlucose, carbGrams } = this.calculatorForm.value;

    try {
      this.mockData
        .calculateBolus({
          currentGlucose: parseFloat(currentGlucose),
          carbGrams: parseFloat(carbGrams),
        })
        .subscribe({
          next: result => {
            this.result = result;
            this.calculating = false;
          },
          error: error => {
            console.error('Error calculating bolus:', error);
            this.calculating = false;
          },
        });
    } catch (error) {
      console.error('Error calculating bolus:', error);
      this.calculating = false;
    }
  }

  resetCalculator() {
    this.calculatorForm.reset();
    this.result = null;
    this.selectedFoods.set([]);
  }

  goBack() {
    this.navCtrl.navigateBack('/tabs/dashboard');
  }

  get glucoseError(): string {
    const control = this.calculatorForm.get('currentGlucose');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return this.translate.instant('bolusCalculator.errors.glucoseRequired');
      }
      if (control.errors['min'] || control.errors['max']) {
        return this.translate.instant('bolusCalculator.errors.glucoseRange');
      }
    }
    return '';
  }

  get carbsError(): string {
    const control = this.calculatorForm.get('carbGrams');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) {
        return this.translate.instant('bolusCalculator.errors.carbsRequired');
      }
      if (control.errors['min'] || control.errors['max']) {
        return this.translate.instant('bolusCalculator.errors.carbsRange');
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.calculatorForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }
}
