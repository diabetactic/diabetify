import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonLabel,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

import { createOverlaySafely } from '@core/utils/ionic-overlays';
import { environment } from '@env/environment';
import { UnifiedAuthService } from '@services/unified-auth.service';
import { TranslationService } from '@services/translation.service';
import { db } from '@services/database.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoggerService } from '@services/logger.service';
import { ROUTES, TIMEOUTS } from '@core/constants';

@Component({
  selector: 'app-advanced',
  templateUrl: './advanced.page.html',
  styleUrls: ['./advanced.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonLabel,
    IonSelect,
    IonSelectOption,
    AppIconComponent,
  ],
})
export class AdvancedPage implements OnDestroy {
  isDevMode = !environment.production;
  accountState = 'active';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: UnifiedAuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private router: Router,
    private translationService: TranslationService,
    private logger: LoggerService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async close(): Promise<void> {
    const modal = await this.modalController.getTop();
    if (modal) {
      await modal.dismiss();
    } else {
      this.router.navigate([ROUTES.SETTINGS]);
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const alert = await createOverlaySafely(
      () =>
        this.alertController.create({
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
                  this.router.navigate([ROUTES.WELCOME]);
                } catch (error) {
                  this.logger.error('Auth', 'Sign out error', error);
                  const toast = await createOverlaySafely(
                    () =>
                      this.toastController.create({
                        message: this.translationService.instant('errors.generic'),
                        duration: TIMEOUTS.TOAST_SHORT,
                        color: 'danger',
                      }),
                    { timeoutMs: 1500 }
                  );
                  if (toast) {
                    await toast.present();
                  }
                }
              },
            },
          ],
        }),
      { timeoutMs: 1500 }
    );

    if (!alert) return;
    await alert.present();
  }

  /**
   * Clear all local data (IndexedDB and preferences)
   */
  async clearLocalData(): Promise<void> {
    const alert = await createOverlaySafely(
      () =>
        this.alertController.create({
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
                  const toast = await createOverlaySafely(
                    () =>
                      this.toastController.create({
                        message: this.translationService.instant(
                          'settings.advanced.clearDataSuccess'
                        ),
                        duration: TIMEOUTS.TOAST_SHORT,
                        color: 'success',
                      }),
                    { timeoutMs: 1500 }
                  );
                  if (toast) {
                    await toast.present();
                  }

                  // Reload the app
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                } catch (error) {
                  this.logger.error('Settings', 'Clear data error', error);
                  const toast = await createOverlaySafely(
                    () =>
                      this.toastController.create({
                        message: this.translationService.instant(
                          'settings.advanced.clearDataError'
                        ),
                        duration: TIMEOUTS.TOAST_SHORT,
                        color: 'danger',
                      }),
                    { timeoutMs: 1500 }
                  );
                  if (toast) {
                    await toast.present();
                  }
                }
              },
            },
          ],
        }),
      { timeoutMs: 1500 }
    );

    if (!alert) return;
    await alert.present();
  }

  /**
   * Handle account state change (dev mode only)
   */
  onAccountStateChange(event: CustomEvent): void {
    this.accountState = event.detail.value;
    this.logger.debug('Settings', 'Account state changed', { state: this.accountState });
  }
}
