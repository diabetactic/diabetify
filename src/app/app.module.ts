import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouteReuseStrategy } from '@angular/router';
import { provideHttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

// Translation imports
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import {
  TranslateHttpLoader,
  TRANSLATE_HTTP_LOADER_CONFIG,
  TranslateHttpLoaderConfig,
} from '@ngx-translate/http-loader';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TidepoolInterceptor } from './core/interceptors/tidepool.interceptor';

// Translation loader configuration
const httpLoaderConfig: TranslateHttpLoaderConfig = {
  prefix: './assets/i18n/',
  suffix: '.json',
  enforceLoading: false,
  useHttpBackend: false,
};

// Factory function for TranslateHttpLoader (no args)
export function createTranslateLoader() {
  return new TranslateHttpLoader();
}

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    IonicModule.forRoot({
      mode: 'md', // Material Design mode for Ionic components
    }),
    AppRoutingModule,
    AppComponent,
    // Translation module configuration
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [],
      },
      fallbackLang: 'en',
    }),
  ],
  providers: [
    provideHttpClient(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: TidepoolInterceptor, multi: true },
    { provide: TRANSLATE_HTTP_LOADER_CONFIG, useValue: httpLoaderConfig },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
