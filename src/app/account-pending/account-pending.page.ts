import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLabel,
  IonButton,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { LocalAuthService } from '@core/services/local-auth.service';
import { LoggerService } from '@core/services/logger.service';
import { APP_CONFIG, AppConfig } from '@core/config/app-config';
import { ROUTES } from '@core/constants';

@Component({
  selector: 'app-account-pending',
  templateUrl: './account-pending.page.html',
  styleUrls: ['./account-pending.page.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonLabel,
    IonButton
],
})
export class AccountPendingPage {
  constructor(
    @Inject(APP_CONFIG) public appConfig: AppConfig,
    private authService: LocalAuthService,
    private router: Router,
    private logger: LoggerService
  ) {}

  /**
   * Sign out the user and navigate to welcome page
   */
  async signOut(): Promise<void> {
    try {
      await this.authService.logout();
      await this.router.navigate([ROUTES.WELCOME]);
    } catch (error) {
      this.logger.error('Auth', 'Error signing out', error);
    }
  }
}
