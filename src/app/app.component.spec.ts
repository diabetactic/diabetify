// Initialize TestBed environment for Vitest
import '../test-setup';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app.component';
import { TranslationService } from '@services/translation.service';
import { LocalAuthService } from '@services/local-auth.service';
import { SessionTimeoutService } from '@services/session-timeout.service';
import { getLucideIconsForTesting } from './tests/helpers/icon-test.helper';

class TranslationServiceStub {
  currentLanguage$ = of('en');
}

class LocalAuthServiceStub {
  authState$ = of({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });
}

class SessionTimeoutServiceStub {
  startMonitoring = vi.fn();
  stopMonitoring = vi.fn();
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        getLucideIconsForTesting(),
      ],
      providers: [
        provideRouter([]),
        { provide: TranslationService, useClass: TranslationServiceStub },
        { provide: LocalAuthService, useClass: LocalAuthServiceStub },
        { provide: SessionTimeoutService, useClass: SessionTimeoutServiceStub },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
