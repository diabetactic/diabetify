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
import { environment } from '@env/environment';

import { TranslateModule } from '@ngx-translate/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReadingsService } from '@services/readings.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  constructor(
    private translationService: TranslationService,
    private platform: Platform,
    private logger: LoggerService,
    private authService: LocalAuthService,
    private sessionTimeout: SessionTimeoutService,
    private readingsService: ReadingsService
  ) {
    this.logger.info('Init', 'AppComponent initialized');
    this.initializeApp();
    if (!environment.production) {
      (window as unknown as Record<string, unknown>)['readingsService'] = this.readingsService;
    }
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
        await this.withTimeout(StatusBar.setStyle({ style: Style.Default }), 5000);
        await this.withTimeout(SplashScreen.hide(), 5000);
        this.logger.info('Init', 'Native plugins initialized successfully');
      } catch (err) {
        this.logger.error('Init', 'Native plugin timeout or error', err);
      }
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, fallback?: T): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((resolve, reject) =>
        setTimeout(
          () => (fallback !== undefined ? resolve(fallback) : reject(new Error('Timeout'))),
          ms
        )
      ),
    ]);
  }
}
