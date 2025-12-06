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
import { importProvidersFrom, LOCALE_ID } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

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
  close: close,
  'alert-circle': alertCircle,
  'sync-outline': syncOutline,
  sync: sync,
  'arrow-back-outline': arrowBackOutline,
  'information-circle-outline': informationCircleOutline,
  'calculator-outline': calculatorOutline,
  'warning-outline': warningOutline,
  'refresh-outline': refreshOutline,
  refresh: refresh,
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
import {
  TRANSLATE_HTTP_LOADER_CONFIG,
  TranslateHttpLoaderConfig,
} from '@ngx-translate/http-loader';
import { APP_CONFIG, defaultAppConfig } from './app/core/config/app-config';
import { APP_ROUTES } from './app/app-routing.module';
import { LucideAngularModule } from 'lucide-angular';
import { appIcons } from './app/shared/icons/lucide-icons';

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
    provideAnimations(),
    provideIonicAngular(),
    provideRouter(APP_ROUTES, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: LOCALE_ID, useValue: 'es' }, // Set default locale to Spanish
    { provide: HTTP_INTERCEPTORS, useClass: RequestIdInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: TRANSLATE_HTTP_LOADER_CONFIG, useValue: httpLoaderConfig },
    { provide: APP_CONFIG, useValue: defaultAppConfig },
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
