import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  ModalController,
  ToastController,
  LoadingController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ProfileService } from '../../core/services/profile.service';
import { UserProfile } from '../../core/models/user-profile.model';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonFooter,
    AppIconComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfileEditComponent implements OnInit {
  editForm!: FormGroup;
  isSubmitting = false;
  profile: UserProfile | null = null;

  constructor(
    private fb: FormBuilder,
    private modalController: ModalController,
    private profileService: ProfileService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private translate: TranslateService
  ) {}

  async ngOnInit() {
    // Load current profile
    this.profile = await this.profileService.getProfile();

    // Initialize form with current values
    this.editForm = this.fb.group({
      name: [this.profile?.name || '', [Validators.required, Validators.minLength(2)]],
      surname: ['', [Validators.minLength(2)]],
      email: [this.profile?.email || '', [Validators.required, Validators.email]],
    });
  }

  /**
   * Get validation error message for a field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return this.translate.instant('addReading.validation.required');
    }

    if (control.errors['email']) {
      return this.translate.instant('auth.errors.invalidEmail');
    }

    if (control.errors['minlength']) {
      return this.translate.instant('auth.errors.minLength', {
        min: control.errors['minlength'].requiredLength,
      });
    }

    return '';
  }

  /**
   * Check if a field is invalid and touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.editForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Handle form submission
   */
  async onSubmit() {
    if (this.editForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.editForm.controls).forEach(key => {
        this.editForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;

    const loading = await this.loadingController.create({
      message: this.translate.instant('common.saving'),
    });
    await loading.present();

    try {
      const formValue = this.editForm.value;
      const updates: Record<string, string> = {};

      // Prepare update payload for backend
      if (formValue.name?.trim()) {
        updates['name'] = formValue.name.trim();
      }
      if (formValue.surname?.trim()) {
        updates['surname'] = formValue.surname.trim();
      }
      if (formValue.email?.trim()) {
        updates['email'] = formValue.email.trim();
      }

      // Update on backend
      await this.profileService.updateProfileOnBackend(updates);

      // Update local profile (name and email only, backend doesn't store surname locally)
      const localUpdates: Record<string, string> = {};
      if (updates['name']) localUpdates['name'] = updates['name'];
      if (updates['email']) localUpdates['email'] = updates['email'];

      if (Object.keys(localUpdates).length > 0) {
        await this.profileService.updateProfile(localUpdates);
      }

      await loading.dismiss();

      // Show success toast
      const toast = await this.toastController.create({
        message: this.translate.instant('profile.editForm.success'),
        duration: 2000,
        color: 'success',
        position: 'bottom',
        icon: 'checkmark-circle-outline',
      });
      await toast.present();

      // Close modal with success result
      await this.modalController.dismiss({ success: true });
    } catch (_error) {
      await loading.dismiss();

      // Show error toast
      const toast = await this.toastController.create({
        message: this.translate.instant('profile.editForm.error'),
        duration: 3000,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline',
      });
      await toast.present();

      this.isSubmitting = false;
    }
  }

  /**
   * Cancel and close modal
   */
  async onCancel() {
    await this.modalController.dismiss({ success: false });
  }
}
