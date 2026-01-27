import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  NgZone,
} from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Platform } from '@ionic/angular';
import { TranslationService } from './core/services/translation.service';
import { LoggerService } from './core/services/logger.service';
import { LocalAuthService } from './core/services/local-auth.service';
import { SessionTimeoutService } from './core/services/session-timeout.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { EnvironmentConfigService } from '@core/config/environment-config.service';

import { TranslateModule } from '@ngx-translate/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { ReadingsService } from '@services/readings.service';
import { DemoDataService } from '@services/demo-data.service';
import { OfflineBannerComponent } from '@shared/components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IonApp, IonRouterOutlet, OfflineBannerComponent],
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
    private readingsService: ReadingsService,
    private demoDataService: DemoDataService,
    private envConfig: EnvironmentConfigService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.logger.info('Init', 'AppComponent initialized');
    this.initializeApp();
    if (!this.envConfig.production) {
      (window as unknown as Record<string, unknown>)['readingsService'] = this.readingsService;
    }
  }

  async ngOnInit(): Promise<void> {
    this.configureWebDeviceFrame();

    if (this.platform.is('capacitor')) {
      // Deep link handler
      App.addListener('appUrlOpen', (data: URLOpenListenerEvent) => {
        this.ngZone.run(() => {
          const url = new URL(data.url);
          if (url.host === 'reset-password' || url.pathname.includes('reset-password')) {
            const token = url.searchParams.get('token');
            if (token) {
              this.router.navigate(['/reset-password'], { queryParams: { token } });
            }
          }
        });
      });

      // Hardware back button handler for Android
      App.addListener('backButton', ({ canGoBack }) => {
        this.ngZone.run(() => {
          if (this.isOnMainTab()) {
            App.exitApp();
          } else if (canGoBack) {
            window.history.back();
          }
        });
      });
    }

    // Log navigation events to trace ghost navigation
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(event => event instanceof NavigationStart)
      )
      .subscribe((event: NavigationStart) => {
        this.logger.info('Navigation', 'Navigating to', {
          url: event.url,
          trigger: event.navigationTrigger,
        });
      });

    // Log backend configuration for visibility
    this.logBackendConfiguration();

    if (this.envConfig.isMockMode) {
      this.demoDataService.ensureSeeded().catch(err => {
        this.logger.error('Init', 'Failed to seed demo data', err);
      });
    }

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
    const mode = this.envConfig.backendMode;
    const url = this.envConfig.apiGatewayBaseUrl;
    const isProduction = this.envConfig.production;

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

  private configureWebDeviceFrame(): void {
    if (this.platform.is('capacitor')) return;
    const enableFrame = this.envConfig.features.webDeviceFrame;
    document.documentElement.classList.toggle('dt-device-frame', enableFrame);
  }

  private isOnMainTab(): boolean {
    const url = this.router.url;
    const mainTabs = ['/tabs/dashboard', '/tabs/readings', '/tabs/appointments', '/tabs/profile'];
    return mainTabs.some(tab => url === tab || url.startsWith(tab + '?'));
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
