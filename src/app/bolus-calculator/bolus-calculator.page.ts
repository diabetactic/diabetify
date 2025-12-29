import { Component, inject, signal, ChangeDetectorRef, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavController, ModalController } from '@ionic/angular';
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
import { MockDataService, BolusCalculation, MockReading } from '@services/mock-data.service';
import { BolusSafetyService, SafetyWarning } from '@services/bolus-safety.service';
import { FoodService } from '@services/food.service';
import { FoodPickerResult, SelectedFood } from '@models/food.model';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { FoodPickerComponent } from '@shared/components/food-picker/food-picker.component';
import { ConfirmationModalComponent } from '@shared/components/confirmation-modal/confirmation-modal.component';
import { LoggerService } from '@services/logger.service';

@Component({
  selector: 'app-bolus-calculator',
  templateUrl: './bolus-calculator.page.html',
  styleUrls: ['./bolus-calculator.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    AppIconComponent,
    FoodPickerComponent,
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
export class BolusCalculatorPage implements OnInit {
  private translate = inject(TranslateService);
  private foodService = inject(FoodService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private logger = inject(LoggerService);
  private bolusSafetyService = inject(BolusSafetyService);
  private modalCtrl = inject(ModalController);

  calculatorForm: FormGroup;
  calculating = false;
  result: BolusCalculation | null = null;
  isModalOpen = false;
  warnings: SafetyWarning[] = [];
  recentReadings: MockReading[] = [];

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

  ngOnInit(): void {
    this.getRecentReadings();
  }

  getRecentReadings(): void {
    const since = new Date();
    since.setHours(since.getHours() - 4);
    this.mockData
      .getReadings(since)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(readings => {
        this.recentReadings = readings;
      });
  }

  /**
   * Handle ion-input changes to ensure form values are synced immediately.
   * This fixes the issue where the button needs multiple presses on mobile.
   */
  onInputChange(field: string, event: CustomEvent): void {
    const value = event.detail.value;
    this.calculatorForm.patchValue({ [field]: value });
    this.calculatorForm.get(field)?.markAsTouched();
    this.cdr.detectChanges();
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
    this.result = null;
    this.warnings = [];
    const { currentGlucose, carbGrams } = this.calculatorForm.value;

    try {
      const calculation = await firstValueFrom(
        this.mockData.calculateBolus({
          currentGlucose: parseFloat(currentGlucose),
          carbGrams: parseFloat(carbGrams),
        })
      );

      this.warnings = this.bolusSafetyService.checkSafetyGuardrails(
        calculation,
        this.recentReadings
      );

      this.bolusSafetyService.logAuditEvent('Bolus Calculation', {
        calculation,
        warnings: this.warnings,
      });

      if (this.warnings.length > 0) {
        await this.presentConfirmationModal(calculation);
      } else {
        this.result = calculation;
      }
    } catch (error) {
      this.logger.error('BolusCalculator', 'Error calculating bolus', error);
    } finally {
      this.calculating = false;
    }
  }

  resetCalculator() {
    this.calculatorForm.reset();
    this.result = null;
    this.selectedFoods.set([]);
    this.warnings = [];
  }

  async presentConfirmationModal(calculation: BolusCalculation) {
    this.isModalOpen = true;
    const message = this.warnings.map(w => w.message).join('<br><br>');
    const modal = await this.modalCtrl.create({
      component: ConfirmationModalComponent,
      componentProps: {
        title: 'Warning',
        message: message,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        icon: 'alert-circle-outline',
        color: 'warning',
        calculation,
      },
      backdropDismiss: false,
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirmed') {
      this.result = calculation;
      this.bolusSafetyService.logAuditEvent('Bolus Override', {
        reason: this.warnings[0].type,
        calculation,
      });
    } else {
      this.result = null;
    }
    this.isModalOpen = false;
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
    return Boolean(field?.invalid && (field?.dirty || field?.touched));
  }
}
