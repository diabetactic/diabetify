import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';

import { environment } from '../../../environments/environment';
import { UnifiedAuthService } from '../../core/services/unified-auth.service';
import { TranslationService } from '../../core/services/translation.service';
import { db } from '../../core/services/database.service';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-advanced',
  templateUrl: './advanced.page.html',
  styleUrls: ['./advanced.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TranslateModule, AppIconComponent],
})
export class AdvancedPage implements OnInit, OnDestroy {
  isDevMode = !environment.production;
  accountState: string = 'active';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: UnifiedAuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('app.settings'),
      message: this.translationService.instant('settings.advanced.signOut'),
      buttons: [
        {
          text: this.translationService.instant('app.cancel'),
          role: 'cancel',
        },
        {
          text: this.translationService.instant('auth.signOut'),
          role: 'destructive',
          handler: async () => {
            try {
              await this.authService.logout();
              this.router.navigate(['/welcome']);
            } catch (error) {
              console.error('Sign out error:', error);
              const toast = await this.toastController.create({
                message: this.translationService.instant('errors.generic'),
                duration: 2000,
                color: 'danger',
              });
              await toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Clear all local data (IndexedDB and preferences)
   */
  async clearLocalData(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('settings.advanced.clearData'),
      message: this.translationService.instant('settings.advanced.clearDataConfirm'),
      buttons: [
        {
          text: this.translationService.instant('app.cancel'),
          role: 'cancel',
        },
        {
          text: this.translationService.instant('settings.advanced.clearDataButton'),
          role: 'destructive',
          handler: async () => {
            try {
              // Clear IndexedDB
              if (db) {
                await db.delete();
              }

              // Clear Preferences
              await Preferences.clear();

              // Show success toast
              const toast = await this.toastController.create({
                message: this.translationService.instant('settings.advanced.clearDataSuccess'),
                duration: 2000,
                color: 'success',
              });
              await toast.present();

              // Reload the app
              setTimeout(() => {
                window.location.reload();
              }, 500);
            } catch (error) {
              console.error('Clear data error:', error);
              const toast = await this.toastController.create({
                message: this.translationService.instant('settings.advanced.clearDataError'),
                duration: 2000,
                color: 'danger',
              });
              await toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Handle account state change (dev mode only)
   */
  onAccountStateChange(event: any): void {
    this.accountState = event.detail.value;
    console.log('Account state changed to:', this.accountState);
  }
}
