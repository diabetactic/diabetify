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
import { addIcons } from 'ionicons';
import {
  homeOutline,
  home,
  bookOutline,
  book,
  calendarOutline,
  calendar,
  personOutline,
  person,
  add,
  addCircleOutline,
  chevronForward,
  chevronBack,
  settingsOutline,
  settings,
  logOutOutline,
  closeOutline,
  close,
  checkmarkOutline,
  checkmark,
  alertCircleOutline,
  alertCircle,
  informationCircleOutline,
  informationCircle,
  warningOutline,
  warning,
  syncOutline,
  sync,
  refreshOutline,
  refresh,
  trashOutline,
  trash,
  createOutline,
  create,
  searchOutline,
  search,
  filterOutline,
  filter,
  ellipsisVertical,
  ellipsisHorizontal,
  timeOutline,
  time,
  todayOutline,
  today,
  nutritionOutline,
  nutrition,
  fitnessOutline,
  fitness,
  heartOutline,
  heart,
  pulseOutline,
  pulse,
  waterOutline,
  water,
  moonOutline,
  moon,
  sunnyOutline,
  sunny,
  languageOutline,
  language,
  globeOutline,
  globe,
  notificationsOutline,
  notifications,
  lockClosedOutline,
  lockClosed,
  eyeOutline,
  eye,
  eyeOffOutline,
  eyeOff,
  mailOutline,
  mail,
  callOutline,
  call,
  locationOutline,
  location,
  cameraOutline,
  camera,
  imageOutline,
  image,
  documentOutline,
  document as documentIcon,
  documentTextOutline,
  documentText,
  cloudUploadOutline,
  cloudUpload,
  cloudDownloadOutline,
  cloudDownload,
  shareOutline,
  share,
  copyOutline,
  copy,
  clipboardOutline,
  clipboard,
  helpCircleOutline,
  helpCircle,
  arrowBackOutline,
  arrowBack,
  arrowForwardOutline,
  arrowForward,
  caretDownOutline,
  caretDown,
  caretUpOutline,
  caretUp,
} from 'ionicons/icons';

// Register all ionicons globally for standalone components
addIcons({
  'home-outline': homeOutline,
  'home': home,
  'book-outline': bookOutline,
  'book': book,
  'calendar-outline': calendarOutline,
  'calendar': calendar,
  'person-outline': personOutline,
  'person': person,
  'add': add,
  'add-circle-outline': addCircleOutline,
  'chevron-forward': chevronForward,
  'chevron-back': chevronBack,
  'settings-outline': settingsOutline,
  'settings': settings,
  'log-out-outline': logOutOutline,
  'close-outline': closeOutline,
  'close': close,
  'checkmark-outline': checkmarkOutline,
  'checkmark': checkmark,
  'alert-circle-outline': alertCircleOutline,
  'alert-circle': alertCircle,
  'information-circle-outline': informationCircleOutline,
  'information-circle': informationCircle,
  'warning-outline': warningOutline,
  'warning': warning,
  'sync-outline': syncOutline,
  'sync': sync,
  'refresh-outline': refreshOutline,
  'refresh': refresh,
  'trash-outline': trashOutline,
  'trash': trash,
  'create-outline': createOutline,
  'create': create,
  'search-outline': searchOutline,
  'search': search,
  'filter-outline': filterOutline,
  'filter': filter,
  'ellipsis-vertical': ellipsisVertical,
  'ellipsis-horizontal': ellipsisHorizontal,
  'time-outline': timeOutline,
  'time': time,
  'today-outline': todayOutline,
  'today': today,
  'nutrition-outline': nutritionOutline,
  'nutrition': nutrition,
  'fitness-outline': fitnessOutline,
  'fitness': fitness,
  'heart-outline': heartOutline,
  'heart': heart,
  'pulse-outline': pulseOutline,
  'pulse': pulse,
  'water-outline': waterOutline,
  'water': water,
  'moon-outline': moonOutline,
  'moon': moon,
  'sunny-outline': sunnyOutline,
  'sunny': sunny,
  'language-outline': languageOutline,
  'language': language,
  'globe-outline': globeOutline,
  'globe': globe,
  'notifications-outline': notificationsOutline,
  'notifications': notifications,
  'lock-closed-outline': lockClosedOutline,
  'lock-closed': lockClosed,
  'eye-outline': eyeOutline,
  'eye': eye,
  'eye-off-outline': eyeOffOutline,
  'eye-off': eyeOff,
  'mail-outline': mailOutline,
  'mail': mail,
  'call-outline': callOutline,
  'call': call,
  'location-outline': locationOutline,
  'location': location,
  'camera-outline': cameraOutline,
  'camera': camera,
  'image-outline': imageOutline,
  'image': image,
  'document-outline': documentOutline,
  'document': documentIcon,
  'document-text-outline': documentTextOutline,
  'document-text': documentText,
  'cloud-upload-outline': cloudUploadOutline,
  'cloud-upload': cloudUpload,
  'cloud-download-outline': cloudDownloadOutline,
  'cloud-download': cloudDownload,
  'share-outline': shareOutline,
  'share': share,
  'copy-outline': copyOutline,
  'copy': copy,
  'clipboard-outline': clipboardOutline,
  'clipboard': clipboard,
  'help-circle-outline': helpCircleOutline,
  'help-circle': helpCircle,
  'arrow-back-outline': arrowBackOutline,
  'arrow-back': arrowBack,
  'arrow-forward-outline': arrowForwardOutline,
  'arrow-forward': arrowForward,
  'caret-down-outline': caretDownOutline,
  'caret-down': caretDown,
  'caret-up-outline': caretUpOutline,
  'caret-up': caretUp,
});

// Register Spanish locale data
registerLocaleData(localeEs, 'es');

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
      }),
      LucideAngularModule.pick(appIcons)
    ),
  ],
}).catch(err => {
  console.error('[Main] App bootstrap failed:', err);
});
