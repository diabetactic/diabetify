import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { setAssetPath } from '@ionic/core/components';
import {
  RouteReuseStrategy,
  PreloadAllModules,
  provideRouter,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy } from '@ionic/angular';
import {
  APP_INITIALIZER,
  importProvidersFrom,
  LOCALE_ID,
  provideZoneChangeDetection,
} from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { environment } from './environments/environment';

/**
 * Production Console Filter
 * Suppresses console.log/debug/info in production for clean demo experience.
 * Preserves console.warn and console.error for debugging issues.
 */
if (environment.production) {
  // Store original console methods
  const noop = () => {
    /* No-op function to suppress verbose console output (log/debug/info) in production */
  };

  // Override verbose console methods in production
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  // Keep console.warn and console.error for important messages
}

// Ionicons - must be registered globally BEFORE app bootstrap for standalone components
// OPTIMIZED: Only 18 actually used icons (removed 86 unused icons, ~80KB savings)
import { addIcons } from 'ionicons';
import {
  homeOutline,
  documentTextOutline,
  calendarOutline,
  personOutline,
  close,
  alertCircle,
  syncOutline,
  sync,
  arrowBackOutline,
  informationCircleOutline,
  calculatorOutline,
  warningOutline,
  refreshOutline,
  refresh,
  lockClosedOutline,
  cameraOutline,
  personCircleOutline,
  openOutline,
} from 'ionicons/icons';

// Register only the icons actually used in templates
addIcons({
  'home-outline': homeOutline,
  'document-text-outline': documentTextOutline,
  'calendar-outline': calendarOutline,
  'person-outline': personOutline,
  close,
  'alert-circle': alertCircle,
  'sync-outline': syncOutline,
  sync,
  'arrow-back-outline': arrowBackOutline,
  'information-circle-outline': informationCircleOutline,
  'calculator-outline': calculatorOutline,
  'warning-outline': warningOutline,
  'refresh-outline': refreshOutline,
  refresh,
  'lock-closed-outline': lockClosedOutline,
  'camera-outline': cameraOutline,
  'person-circle-outline': personCircleOutline,
  'open-outline': openOutline,
});

// Register Spanish locale data
registerLocaleData(localeEs, 'es');

import { AppComponent } from './app/app.component';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { RequestIdInterceptor } from './app/core/interceptors/request-id.interceptor';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';
import { RetryInterceptor } from './app/core/interceptors/retry.interceptor';
import {
  TRANSLATE_HTTP_LOADER_CONFIG,
  TranslateHttpLoaderConfig,
} from '@ngx-translate/http-loader';
import { APP_CONFIG, defaultAppConfig } from './app/core/config/app-config';
import {
  EnvironmentConfigService,
  initializeEnvironmentConfig,
} from './app/core/config/environment-config.service';
import { APP_ROUTES } from './app/app-routing.module';
import { LucideAngularModule } from 'lucide-angular';
import { appIcons } from './app/shared/icons/lucide-icons';
import { provideCharts } from 'ng2-charts';
import { Chart, DoughnutController, ArcElement, Legend, Tooltip } from 'chart.js';

// Optimize Chart.js bundle - only register used components
Chart.register(DoughnutController, ArcElement, Legend, Tooltip);

// Ensure Ionic web components can resolve their asset path (icons, etc.)
setAssetPath(window.document.baseURI ?? '/');

const httpLoaderConfig: TranslateHttpLoaderConfig = {
  prefix: './assets/i18n/',
  suffix: '.json',
  enforceLoading: false,
  useHttpBackend: false,
};

export function createTranslateLoader() {
  return new TranslateHttpLoader();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideAnimations(),
    provideIonicAngular(),
    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    // Optimized chart config - no default registerables
    provideCharts(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: LOCALE_ID, useValue: 'es' }, // Set default locale to Spanish
    { provide: HTTP_INTERCEPTORS, useClass: RequestIdInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: RetryInterceptor, multi: true },
    { provide: TRANSLATE_HTTP_LOADER_CONFIG, useValue: httpLoaderConfig },
    { provide: APP_CONFIG, useValue: defaultAppConfig },
    // Environment configuration - initialized before app bootstrap
    {
      provide: APP_INITIALIZER,
      useFactory: initializeEnvironmentConfig,
      deps: [EnvironmentConfigService],
      multi: true,
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [],
        },
        fallbackLang: 'en',
      }),
      LucideAngularModule.pick(appIcons)
    ),
  ],
}).catch(err => {
  console.error('[Main] App bootstrap failed:', err);
});
