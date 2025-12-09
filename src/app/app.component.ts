import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslationService } from './core/services/translation.service';
import { LoggerService } from './core/services/logger.service';
import { LocalAuthService } from './core/services/local-auth.service';
import { SessionTimeoutService } from './core/services/session-timeout.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { environment } from '../environments/environment';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule, IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  constructor(
    private translationService: TranslationService,
    private platform: Platform,
    private logger: LoggerService,
    private authService: LocalAuthService,
    private sessionTimeout: SessionTimeoutService
  ) {
    this.logger.info('Init', 'AppComponent initialized');
    this.initializeApp();
  }

  async ngOnInit(): Promise<void> {
    // Log backend configuration for visibility
    this.logBackendConfiguration();

    // Translation service initializes automatically in constructor/service
    this.translationService.currentLanguage$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.logger.info('UI', 'Language changed', { language: lang });
    });

    // Monitor authentication state and manage session timeout
    this.authService.authState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      if (state.isAuthenticated) {
        this.logger.info('SessionTimeout', 'User authenticated - starting timeout monitoring');
        this.sessionTimeout.startMonitoring();
      } else {
        this.logger.info('SessionTimeout', 'User logged out - stopping timeout monitoring');
        this.sessionTimeout.stopMonitoring();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private logBackendConfiguration(): void {
    const mode = environment.backendMode;
    const url = environment.backendServices.apiGateway.baseUrl;
    const isProduction = environment.production;

    // Log configuration via LoggerService (respects environment settings)
    if (!isProduction) {
      this.logger.debug('Config', `Backend Mode: ${mode.toUpperCase()}`);
      this.logger.debug('Config', `API Gateway: ${url}`);
      this.logger.debug('Config', `Production: ${isProduction}`);

      // Warn if using cloud backend in development
      if (mode === 'cloud') {
        this.logger.warn('Config', 'Using CLOUD backend in development mode!');
      }
    }

    this.logger.info('Config', 'Backend configuration', {
      mode,
      url,
      production: isProduction,
    });
  }

  private async initializeApp(): Promise<void> {
    this.logger.info('Init', 'Platform initializing');
    await this.platform.ready();
    this.logger.info('Init', 'Platform ready', { platforms: this.platform.platforms() });

    if (this.platform.is('capacitor')) {
      try {
        await StatusBar.setStyle({ style: Style.Default });
        await SplashScreen.hide();
        this.logger.info('Init', 'Native plugins initialized successfully');
      } catch (err) {
        this.logger.error('Init', 'Error initializing native plugins', err);
      }
    }
  }
}
