import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastController, NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonIcon,
  IonDatetimeButton,
  IonModal,
  IonDatetime,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { ReadingsService } from '../core/services/readings.service';
import { ProfileService } from '../core/services/profile.service';
import { LoggerService } from '../core/services/logger.service';
import { SMBGReading, GlucoseUnit, GlucoseStatus } from '../core/models/glucose-reading.model';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';

interface MealContextOption {
  value: string;
  labelKey: string;
}

@Component({
  selector: 'app-add-reading',
  templateUrl: './add-reading.page.html',
  styleUrls: ['./add-reading.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    // Ionic standalone components
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonIcon,
    IonDatetimeButton,
    IonModal,
    IonDatetime,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    // App components
    AppIconComponent,
  ],
})
export class AddReadingPage implements OnInit, OnDestroy {
  readingForm!: FormGroup;
  currentUnit: GlucoseUnit = 'mg/dL';
  isSubmitting = false;
  glucoseStatus: GlucoseStatus | null = null;
  glucoseStatusEmoji = '';
  glucoseStatusColor = '';

  private destroy$ = new Subject<void>();

  mealContextOptions: MealContextOption[] = [
    { value: 'before-breakfast', labelKey: 'glucose.meal.beforeBreakfast' },
    { value: 'after-breakfast', labelKey: 'glucose.meal.afterBreakfast' },
    { value: 'before-lunch', labelKey: 'glucose.meal.beforeLunch' },
    { value: 'after-lunch', labelKey: 'glucose.meal.afterLunch' },
    { value: 'before-dinner', labelKey: 'glucose.meal.beforeDinner' },
    { value: 'after-dinner', labelKey: 'glucose.meal.afterDinner' },
    { value: 'snack', labelKey: 'glucose.tags.snack' },
    { value: 'bedtime', labelKey: 'glucose.meal.bedtime' },
    { value: 'other', labelKey: 'glucose.meal.other' },
  ];

  constructor(
    private fb: FormBuilder,
    private readingsService: ReadingsService,
    private profileService: ProfileService,
    private router: Router,
    private navCtrl: NavController,
    private toastController: ToastController,
    private translate: TranslateService,
    private logger: LoggerService
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadUserPreferences();
    this.subscribeToGlucoseValueChanges();
    this.logger.info('Init', 'AddReadingPage initialized');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const now = new Date().toISOString();

    this.readingForm = this.fb.group({
      value: ['', [Validators.required, Validators.min(20), Validators.max(600)]],
      datetime: [now, Validators.required],
      mealContext: [''],
      notes: [''],
    });
  }

  private loadUserPreferences(): void {
    this.profileService.profile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      if (profile?.preferences?.glucoseUnit) {
        this.currentUnit = profile.preferences.glucoseUnit;
        // Update validators based on unit
        this.updateValidatorsForUnit(this.currentUnit);
      }
    });
  }

  private updateValidatorsForUnit(unit: GlucoseUnit): void {
    const valueControl = this.readingForm.get('value');
    if (!valueControl) return;

    if (unit === 'mmol/L') {
      // mmol/L range: approximately 1.1 to 33.3
      valueControl.setValidators([Validators.required, Validators.min(1.1), Validators.max(33.3)]);
    } else {
      // mg/dL range: 20 to 600
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
    // Convert to mg/dL for consistent comparison
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
      this.logger.warn('UI', 'AddReading form invalid', this.readingForm.errors);
      // Mark all fields as touched to show validation errors
      Object.keys(this.readingForm.controls).forEach(key => {
        this.readingForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.logger.info('UI', 'Submitting reading form');

    try {
      const formValue = this.readingForm.value;

      // Create glucose reading object (ID will be generated by the service)
      const reading: Omit<SMBGReading, 'id'> = {
        type: 'smbg', // Self-monitored blood glucose
        value: parseFloat(formValue.value),
        units: this.currentUnit,
        time: formValue.datetime,
        subType: 'manual',
        notes: formValue.notes ? [formValue.notes] : undefined,
        tags: formValue.mealContext ? [formValue.mealContext] : undefined,
      };

      this.logger.debug('UI', 'Calling addReading service');

      // Add timeout safeguard (10s)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), 10000)
      );

      // Save to IndexedDB via ReadingsService with race condition
      await Promise.race([this.readingsService.addReading(reading), timeoutPromise]);

      this.logger.info('UI', 'Reading saved successfully');

      // Show success message
      await this.showSuccessToast();

      // Navigate back to readings list
      this.logger.debug('UI', 'Navigating back to readings');
      this.navCtrl.navigateBack('/tabs/readings');
    } catch (error) {
      this.logger.error('UI', 'Error saving reading', error);
      await this.showErrorToast(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  async onCancel(): Promise<void> {
    this.navCtrl.back();
  }

  private async showSuccessToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: this.translate.instant('addReading.toast.success'),
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }

  private async showErrorToast(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save reading';
    const toast = await this.toastController.create({
      message: this.translate.instant('addReading.toast.error', { message: errorMessage }),
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      icon: 'alert-circle-outline',
    });
    await toast.present();
  }
}
