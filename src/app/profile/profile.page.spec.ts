import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { ProfilePage } from './profile.page';
import { TidepoolAuthService, AuthState } from '../core/services/tidepool-auth.service';
import { ProfileService } from '../core/services/profile.service';
import { ThemeService } from '../core/services/theme.service';
import { TranslationService, Language, LanguageConfig } from '../core/services/translation.service';
import { getLucideIconsForTesting } from '../tests/helpers/icon-test.helper';

class TidepoolAuthServiceStub {
  private stateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userId: null,
    email: null,
  });

  authState = this.stateSubject.asObservable();

  login = jest.fn().mockResolvedValue(undefined);
  logout = jest.fn().mockResolvedValue(undefined);
}

class ProfileServiceStub {
  private profileSubject = new BehaviorSubject<any>(null);
  profile$ = this.profileSubject.asObservable();

  getProfile = jest.fn().mockResolvedValue(null);
  updatePreferences = jest.fn().mockResolvedValue({});
  updateProfile = jest.fn().mockResolvedValue({});
  clearTidepoolCredentials = jest.fn().mockResolvedValue(undefined);
  deleteProfile = jest.fn().mockResolvedValue(undefined);
}

class ThemeServiceStub {
  setThemeMode = jest.fn().mockResolvedValue(undefined);
}

class TranslationServiceStub {
  private languages: LanguageConfig[] = [
    {
      code: Language.EN,
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      numberFormat: { decimal: '.', thousands: ',' },
      glucoseUnit: 'mg/dL',
    },
    {
      code: Language.ES,
      name: 'Spanish',
      nativeName: 'Espanol',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      numberFormat: { decimal: ',', thousands: '.' },
      glucoseUnit: 'mg/dL',
    },
  ];

  private languageSubject = new BehaviorSubject<Language>(Language.EN);
  private stateSubject = new BehaviorSubject({
    currentLanguage: Language.EN,
    availableLanguages: this.languages,
    isLoading: false,
  });

  currentLanguage$ = this.languageSubject.asObservable();
  currentConfig$ = this.languageSubject
    .asObservable()
    .pipe(map(code => this.languages.find(lang => lang.code === code) ?? this.languages[0]));
  state = this.stateSubject.asObservable();

  instant(key: string, params?: Record<string, unknown>): string {
    if (key === 'profile.greeting') {
      return `Hi, ${params?.['name'] ?? 'User'}!`;
    }
    return key;
  }

  getCurrentLanguage(): Language {
    return this.languageSubject.value;
  }

  getAvailableLanguages(): LanguageConfig[] {
    return this.languages;
  }

  async setLanguage(language: Language): Promise<void> {
    this.languageSubject.next(language);
    this.stateSubject.next({
      currentLanguage: language,
      availableLanguages: this.languages,
      isLoading: false,
    });
  }

  async toggleLanguage(): Promise<void> {
    const next = this.languageSubject.value === Language.EN ? Language.ES : Language.EN;
    await this.setLanguage(next);
  }
}

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        RouterTestingModule,
        HttpClientTestingModule,
        ProfilePage,
        getLucideIconsForTesting(),
      ],
      providers: [
        { provide: TidepoolAuthService, useClass: TidepoolAuthServiceStub },
        { provide: ProfileService, useClass: ProfileServiceStub },
        { provide: ThemeService, useClass: ThemeServiceStub },
        { provide: TranslationService, useClass: TranslationServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
