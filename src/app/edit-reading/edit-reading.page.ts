import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Input,
} from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastController, ModalController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonDatetimeButton,
  IonModal,
  IonDatetime,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { ReadingsService } from '@services/readings.service';
import { ProfileService } from '@services/profile.service';
import { LoggerService } from '@services/logger.service';
import { LocalGlucoseReading, GlucoseUnit, GlucoseStatus } from '@models/glucose-reading.model';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

interface MealContextOption {
  value: string;
  labelKey: string;
}

@Component({
  selector: 'app-edit-reading',
  templateUrl: './edit-reading.page.html',
  styleUrls: ['./edit-reading.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonDatetimeButton,
    IonModal,
    IonDatetime,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    AppIconComponent,
  ],
})
export class EditReadingPage implements OnInit, OnDestroy {
  @Input() reading!: LocalGlucoseReading;

  readingForm!: FormGroup;
  currentUnit: GlucoseUnit = 'mg/dL';
  isSubmitting = false;
  glucoseStatus: GlucoseStatus | null = null;
  glucoseStatusEmoji = '';
  glucoseStatusColor = '';

  maxDateTime = '';

  private destroy$ = new Subject<void>();

  mealContextOptions: MealContextOption[] = [
    { value: 'DESAYUNO', labelKey: 'glucose.context.breakfast' },
    { value: 'ALMUERZO', labelKey: 'glucose.context.lunch' },
    { value: 'MERIENDA', labelKey: 'glucose.context.snack' },
    { value: 'CENA', labelKey: 'glucose.context.dinner' },
    { value: 'EJERCICIO', labelKey: 'glucose.context.exercise' },
    { value: 'OTRAS_COMIDAS', labelKey: 'glucose.context.otherMeals' },
    { value: 'OTRO', labelKey: 'glucose.context.other' },
  ];

  constructor(
    private fb: FormBuilder,
    private readingsService: ReadingsService,
    private profileService: ProfileService,
    private toastController: ToastController,
    private translate: TranslateService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    if (!this.reading) {
      this.logger.error('EditReading', 'No reading provided to edit');
      void this.modalController.dismiss(null, 'cancel');
      return;
    }

    this.initializeForm();
    this.loadUserPreferences();
    this.subscribeToGlucoseValueChanges();
    this.logger.info('Init', 'EditReadingPage initialized', { readingId: this.reading.id });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const now = this.getLocalISOString(new Date());
    this.maxDateTime = now;

    this.currentUnit = this.reading.units;
    const minValue = this.currentUnit === 'mmol/L' ? 1.1 : 20;
    const maxValue = this.currentUnit === 'mmol/L' ? 33.3 : 600;

    const mealContext = this.reading.mealContext || '';

    this.readingForm = this.fb.group({
      value: [
        this.reading.value,
        [Validators.required, Validators.min(minValue), Validators.max(maxValue)],
      ],
      datetime: [this.reading.time, Validators.required],
      mealContext: [mealContext],
      notes: [this.reading.notes || ''],
    });

    this.updateGlucoseStatus(this.reading.value);
  }

  private getLocalISOString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const tzOffset = -date.getTimezoneOffset();
    const offsetSign = tzOffset >= 0 ? '+' : '-';
    const offsetHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const offsetMinutes = String(Math.abs(tzOffset) % 60).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }

  private loadUserPreferences(): void {
    this.profileService.profile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      if (profile?.preferences?.glucoseUnit) {
        this.updateValidatorsForUnit(this.currentUnit);
        this.cdr.markForCheck();
      }
    });
  }

  private updateValidatorsForUnit(unit: GlucoseUnit): void {
    const valueControl = this.readingForm.get('value');
    if (!valueControl) return;

    if (unit === 'mmol/L') {
      valueControl.setValidators([Validators.required, Validators.min(1.1), Validators.max(33.3)]);
    } else {
      valueControl.setValidators([Validators.required, Validators.min(20), Validators.max(600)]);
    }

    valueControl.updateValueAndValidity();
  }

  private subscribeToGlucoseValueChanges(): void {
    this.readingForm
      .get('value')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value && !isNaN(value) && value > 0) {
          this.updateGlucoseStatus(parseFloat(value));
        } else {
          this.glucoseStatus = null;
          this.glucoseStatusEmoji = '';
          this.glucoseStatusColor = '';
        }
      });
  }

  private updateGlucoseStatus(value: number): void {
    const mgdl = this.currentUnit === 'mmol/L' ? value * 18.0182 : value;

    if (mgdl < 54) {
      this.glucoseStatus = 'critical-low';
      this.glucoseStatusEmoji = '⚠️';
      this.glucoseStatusColor = 'danger';
    } else if (mgdl < 70) {
      this.glucoseStatus = 'low';
      this.glucoseStatusEmoji = '⬇️';
      this.glucoseStatusColor = 'warning';
    } else if (mgdl > 250) {
      this.glucoseStatus = 'critical-high';
      this.glucoseStatusEmoji = '⚠️';
      this.glucoseStatusColor = 'danger';
    } else if (mgdl > 180) {
      this.glucoseStatus = 'high';
      this.glucoseStatusEmoji = '⬆️';
      this.glucoseStatusColor = 'warning';
    } else {
      this.glucoseStatus = 'normal';
      this.glucoseStatusEmoji = '✅';
      this.glucoseStatusColor = 'success';
    }
  }

  getStatusLabel(): string {
    const key = this.getStatusLabelKey();
    return key ? this.translate.instant(key) : '';
  }

  getUnitLabel(): string {
    return this.currentUnit;
  }

  getStatusLabelKey(): string | null {
    if (!this.glucoseStatus) return null;

    switch (this.glucoseStatus) {
      case 'critical-low':
        return 'glucose.status.veryLow';
      case 'low':
        return 'glucose.status.low';
      case 'normal':
        return 'glucose.status.normal';
      case 'high':
        return 'glucose.status.high';
      case 'critical-high':
        return 'glucose.status.veryHigh';
      default:
        return null;
    }
  }

  getValidationMessage(fieldName: string): string {
    const control = this.readingForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) {
      return this.translate.instant('addReading.validation.required');
    }

    if (fieldName === 'value') {
      const minValue = this.currentUnit === 'mmol/L' ? '1.1' : '20';
      const maxValue = this.currentUnit === 'mmol/L' ? '33.3' : '600';
      if (control.errors['min']) {
        return this.translate.instant('addReading.validation.minValue', {
          value: minValue,
          unit: this.currentUnit,
        });
      }
      if (control.errors['max']) {
        return this.translate.instant('addReading.validation.maxValue', {
          value: maxValue,
          unit: this.currentUnit,
        });
      }
    }

    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.readingForm.invalid) {
      this.logger.warn('UI', 'EditReading form invalid', this.readingForm.errors);

      Object.keys(this.readingForm.controls).forEach(key => {
        this.readingForm.get(key)?.markAsTouched();
      });

      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.logger.info('UI', 'Submitting edit reading form', { readingId: this.reading.id });

    try {
      const formValue = this.readingForm.value;

      // Defensively validate that the glucose value is a finite number before saving
      // This prevents data integrity issues from NaN/Infinity values
      const glucoseValue = parseFloat(formValue.value);

      if (isNaN(glucoseValue) || !isFinite(glucoseValue)) {
        const errorMessage = 'Invalid glucose value provided.';
        this.logger.error('Data Integrity', errorMessage, { value: formValue.value });
        await this.showErrorToast(new Error(errorMessage));
        this.isSubmitting = false;
        this.cdr.markForCheck();
        return;
      }

      const updates: Partial<LocalGlucoseReading> = {
        value: glucoseValue,
        time: formValue.datetime,
        notes: formValue.notes || undefined,
        mealContext: formValue.mealContext || undefined,
      };

      this.logger.debug('UI', 'Calling updateReading service', { id: this.reading.id, updates });

      await this.readingsService.updateReading(this.reading.id, updates);

      this.logger.info('UI', 'Reading updated successfully');

      await this.showSuccessToast();

      await this.modalController.dismiss({ updated: true }, 'confirm');
    } catch (error) {
      this.logger.error('UI', 'Error updating reading', error);
      await this.showErrorToast(error);
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  onCancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  private async showSuccessToast(): Promise<void> {
    const toast = await this.toastController.create({
      message:
        this.translate.instant('readings.editReading') +
        ' - ' +
        this.translate.instant('addReading.toast.success'),
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }

  private async showErrorToast(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update reading';
    const toast = await this.toastController.create({
      message: this.translate.instant('addReading.toast.error', { message: errorMessage }),
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      icon: 'alert-circle-outline',
    });
    await toast.present();
  }

  trackByMealContext(_index: number, option: MealContextOption): string {
    return option.value;
  }
}
