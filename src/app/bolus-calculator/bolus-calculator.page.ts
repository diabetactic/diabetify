import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  ChangeDetectorRef,
  DestroyRef,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavController, ModalController, ToastController } from '@ionic/angular/standalone';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MockDataService, BolusCalculation } from '@services/mock-data.service';
import { BolusSafetyService, SafetyWarning } from '@services/bolus-safety.service';
import { FoodService } from '@services/food.service';
import { FoodPickerResult, SelectedFood } from '@models/food.model';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { FoodPickerComponent } from '@shared/components/food-picker/food-picker.component';
import { ConfirmationModalComponent } from '@shared/components/confirmation-modal/confirmation-modal.component';
import { LoggerService } from '@services/logger.service';
import { EnvironmentConfigService } from '@core/config/environment-config.service';

@Component({
  selector: 'app-bolus-calculator',
  templateUrl: './bolus-calculator.page.html',
  styleUrls: ['./bolus-calculator.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
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
  private toastCtrl = inject(ToastController);
  private envConfig = inject(EnvironmentConfigService);

  calculatorForm: FormGroup;
  calculating = false;
  result: BolusCalculation | null = null;
  isModalOpen = false;
  warnings: SafetyWarning[] = [];

  showFoodPicker = signal(false);
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
    this.calculatorForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());
  }

  /**
   * Handle ion-input changes to ensure form values are synced immediately.
   * This fixes the issue where the button needs multiple presses on mobile.
   */
  onInputChange(field: string, event: CustomEvent): void {
    const value = event.detail.value;
    this.calculatorForm.patchValue({ [field]: value });
    this.calculatorForm.get(field)?.markAsTouched();
    this.cdr.markForCheck();
  }

  /** Open the food picker modal */
  openFoodPicker(): void {
    this.foodService.clearSelection();
    this.showFoodPicker.set(true);
    this.cdr.detectChanges();
  }

  /** Close food picker without applying */
  onFoodPickerClosed(): void {
    this.showFoodPicker.set(false);
    this.cdr.detectChanges();
  }

  /** Apply selected foods from picker */
  onFoodPickerConfirmed(result: FoodPickerResult): void {
    this.showFoodPicker.set(false);
    this.selectedFoods.set(result.selectedFoods);

    // Update the carbs field with total from food picker
    // Even if it's 0 (e.g. selected 0-carb foods), we should update to reflect the selection
    // But if nothing was selected at all, we preserve any manual entry as per unit tests
    if (result.totalCarbs > 0 || result.selectedFoods.length > 0) {
      this.calculatorForm.patchValue({
        carbGrams: Math.round(result.totalCarbs),
      });
      this.calculatorForm.get('carbGrams')?.markAsTouched();
    }
    this.cdr.detectChanges();
  }

  /** Clear selected foods */
  clearSelectedFoods(): void {
    this.selectedFoods.set([]);
    this.calculatorForm.patchValue({ carbGrams: '' });
    this.cdr.detectChanges();
  }

  async calculateBolus() {
    if (!this.calculatorForm.valid) {
      this.calculatorForm.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.calculating = true;
    this.result = null;
    this.warnings = [];
    this.cdr.detectChanges(); // Force UI update to show loading state

    const { currentGlucose, carbGrams } = this.calculatorForm.value;

    try {
      const calculation = await firstValueFrom(
        this.mockData.calculateBolus({
          currentGlucose: parseFloat(currentGlucose),
          carbGrams: parseFloat(carbGrams),
        })
      );

      this.warnings = this.bolusSafetyService.checkSafetyGuardrails(calculation);

      this.bolusSafetyService.logAuditEvent('Bolus Calculation', {
        calculation,
        warnings: this.warnings,
      });

      const blockOnWarnings = !this.envConfig.isMockMode;
      if (this.warnings.length > 0 && blockOnWarnings) {
        // In non-mock backends, require explicit confirmation before displaying the result.
        await this.presentConfirmationModal(calculation);
      } else {
        // In mock mode (used by E2E/visual tests), show the result immediately and render warnings inline.
        this.result = calculation;
      }
    } catch (error) {
      this.logger.error('BolusCalculator', 'Error calculating bolus', error);
      this.result = null;
      await this.showErrorToast();
    } finally {
      this.calculating = false;
      this.cdr.detectChanges();
    }
  }

  resetCalculator() {
    this.calculatorForm.reset({ currentGlucose: '', carbGrams: '' });
    this.result = null;
    this.selectedFoods.set([]);
    this.warnings = [];
    this.cdr.detectChanges();
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

    const { role } = await modal.onWillDismiss();

    if (role === 'confirmed') {
      this.result = calculation;
      this.bolusSafetyService.logAuditEvent('Bolus Override', {
        reason: this.warnings.map(w => w.type).join(', '),
        warningCount: this.warnings.length,
        calculation,
      });
    } else {
      this.result = null;
    }
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  async goBack(): Promise<void> {
    const modal = await this.modalCtrl.getTop();
    if (modal) {
      await modal.dismiss();
    } else {
      this.navCtrl.navigateBack('/tabs/dashboard');
    }
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

  formatInsulin(value: number | null | undefined): string {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toFixed(1);
    }
    return '—';
  }

  /** Show error toast when bolus calculation fails */
  private async showErrorToast(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('bolusCalculator.errors.calculationFailed'),
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }
}
