import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';

import { ReadingsService } from '../core/services/readings.service';
import { ProfileService } from '../core/services/profile.service';
import { GlucoseReading, GlucoseUnit, GlucoseStatus } from '../core/models/glucose-reading.model';

interface MealContext {
  value: string;
  label: string;
}

@Component({
  selector: 'app-add-reading',
  templateUrl: './add-reading.page.html',
  styleUrls: ['./add-reading.page.scss'],
})
export class AddReadingPage implements OnInit, OnDestroy {
  readingForm!: FormGroup;
  currentUnit: GlucoseUnit = 'mg/dL';
  isSubmitting = false;
  glucoseStatus: GlucoseStatus | null = null;
  glucoseStatusEmoji = '';
  glucoseStatusColor = '';

  private destroy$ = new Subject<void>();

  mealContextOptions: MealContext[] = [
    { value: 'before-breakfast', label: 'Before Breakfast' },
    { value: 'after-breakfast', label: 'After Breakfast' },
    { value: 'before-lunch', label: 'Before Lunch' },
    { value: 'after-lunch', label: 'After Lunch' },
    { value: 'before-dinner', label: 'Before Dinner' },
    { value: 'after-dinner', label: 'After Dinner' },
    { value: 'snack', label: 'Snack' },
    { value: 'bedtime', label: 'Bedtime' },
    { value: 'other', label: 'Other' },
  ];

  constructor(
    private fb: FormBuilder,
    private readingsService: ReadingsService,
    private profileService: ProfileService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadUserPreferences();
    this.subscribeToGlucoseValueChanges();
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
    if (!this.glucoseStatus) return '';

    switch (this.glucoseStatus) {
      case 'critical-low':
        return 'Critical Low';
      case 'low':
        return 'Low';
      case 'normal':
        return 'Normal';
      case 'high':
        return 'High';
      case 'critical-high':
        return 'Critical High';
      default:
        return '';
    }
  }

  getUnitLabel(): string {
    return this.currentUnit;
  }

  getValidationMessage(fieldName: string): string {
    const control = this.readingForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) {
      return 'This field is required';
    }

    if (fieldName === 'value') {
      if (control.errors['min']) {
        const minValue = this.currentUnit === 'mmol/L' ? '1.1' : '20';
        return `Value must be at least ${minValue} ${this.currentUnit}`;
      }
      if (control.errors['max']) {
        const maxValue = this.currentUnit === 'mmol/L' ? '33.3' : '600';
        return `Value must be at most ${maxValue} ${this.currentUnit}`;
      }
    }

    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.readingForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.readingForm.controls).forEach(key => {
        this.readingForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.readingForm.value;

      // Create glucose reading object
      const reading: GlucoseReading = {
        id: '', // Will be generated by the service
        type: 'smbg', // Self-monitored blood glucose
        value: parseFloat(formValue.value),
        units: this.currentUnit,
        time: formValue.datetime,
        subType: 'manual',
        notes: formValue.notes ? [formValue.notes] : undefined,
        tags: formValue.mealContext ? [formValue.mealContext] : undefined,
      };

      // Save to IndexedDB via ReadingsService
      await this.readingsService.addReading(reading);

      // Show success message
      await this.showSuccessToast();

      // Navigate back to readings list
      await this.router.navigate(['/tabs/readings']);
    } catch (error) {
      console.error('Error saving reading:', error);
      await this.showErrorToast(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  async onCancel(): Promise<void> {
    await this.router.navigate(['/tabs/readings']);
  }

  private async showSuccessToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Reading saved successfully',
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }

  private async showErrorToast(error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save reading';
    const toast = await this.toastController.create({
      message: errorMessage,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      icon: 'alert-circle-outline',
    });
    await toast.present();
  }
}
