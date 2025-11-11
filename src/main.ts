import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  RouteReuseStrategy,
  PreloadAllModules,
  provideRouter,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy } from '@ionic/angular';
import { importProvidersFrom } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app/app.component';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { RequestIdInterceptor } from './app/core/interceptors/request-id.interceptor';
import { TidepoolInterceptor } from './app/core/interceptors/tidepool.interceptor';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';
import {
  TRANSLATE_HTTP_LOADER_CONFIG,
  TranslateHttpLoaderConfig,
} from '@ngx-translate/http-loader';
import { APP_CONFIG, defaultAppConfig } from './app/core/config/app-config';
import { APP_ROUTES } from './app/app-routing.module';

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
    { provide: HTTP_INTERCEPTORS, useClass: RequestIdInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: TidepoolInterceptor, multi: true },
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
      })
    ),
  ],
}).catch(err => {
  console.error('[Main] App bootstrap failed:', err);
});
