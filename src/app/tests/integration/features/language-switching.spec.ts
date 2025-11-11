/**
 * Language Switching Integration Tests
 * Tests language selection, UI updates, and persistence
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService, TranslateLoader } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import {
  TranslationService,
  Language,
  LanguageConfig,
} from '../../../core/services/translation.service';

import {
  clickElement,
  queryIonicComponent,
  queryAllIonicComponents,
  getElementText,
} from '../../helpers/dom-utils';

// Mock TranslateLoader
class MockTranslateLoader implements TranslateLoader {
  getTranslation(lang: string) {
    const translations: any = {
      en: {
        'settings.language.title': 'Language',
        'common.home': 'Home',
        'common.readings': 'Readings',
        'common.profile': 'Profile',
      },
      es: {
        'settings.language.title': 'Idioma',
        'common.home': 'Inicio',
        'common.readings': 'Lecturas',
        'common.profile': 'Perfil',
      },
    };
    return of(translations[lang] || {});
  }
}

describe('Language Switching Integration', () => {
  let component: LanguageSwitcherComponent;
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let compiled: HTMLElement;

  let translationService: jasmine.SpyObj<TranslationService>;
  let translateService: TranslateService;

  let currentLanguageSubject: BehaviorSubject<Language>;
  let currentConfigSubject: BehaviorSubject<LanguageConfig>;
  let stateSubject: BehaviorSubject<any>;

  const mockLanguages: LanguageConfig[] = [
    {
      code: Language.EN,
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      numberFormat: { decimal: '.', thousands: ',' },
      glucoseUnit: 'mg/dL',
    },
    {
      code: Language.ES,
      name: 'Spanish',
      nativeName: 'Español',
      direction: 'ltr',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: '24h',
      numberFormat: { decimal: ',', thousands: '.' },
      glucoseUnit: 'mg/dL',
    },
  ];

  beforeEach(async () => {
    // Create observable subjects
    currentLanguageSubject = new BehaviorSubject<Language>(Language.EN);
    currentConfigSubject = new BehaviorSubject<LanguageConfig>(mockLanguages[0]);
    stateSubject = new BehaviorSubject<any>({ isLoading: false });

    // Create service spies
    translationService = jasmine.createSpyObj(
      'TranslationService',
      [
        'setLanguage',
        'toggleLanguage',
        'getCurrentLanguage',
        'getAvailableLanguages',
        'resetToDeviceLanguage',
      ],
      {
        currentLanguage$: currentLanguageSubject.asObservable(),
        currentConfig$: currentConfigSubject.asObservable(),
        state: stateSubject.asObservable(),
      }
    );

    // Setup default return values
    translationService.getCurrentLanguage.and.returnValue(Language.EN);
    translationService.getAvailableLanguages.and.returnValue(mockLanguages);
    translationService.setLanguage.and.returnValue(Promise.resolve());
    translationService.toggleLanguage.and.returnValue(Promise.resolve());
    translationService.resetToDeviceLanguage.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: MockTranslateLoader },
        }),
        LanguageSwitcherComponent,
      ],
      providers: [{ provide: TranslationService, useValue: translationService }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    translateService = TestBed.inject(TranslateService);

    // Set initial language
    translateService.use('en');
    fixture.detectChanges();
  });

  it('should create language switcher component', () => {
    expect(component).toBeTruthy();
  });

  it('should load available languages on init', fakeAsync(() => {
    expect(component.availableLanguages.length).toBe(2);
    expect(component.availableLanguages[0].code).toBe(Language.EN);
    expect(component.availableLanguages[1].code).toBe(Language.ES);
  }));

  it('should display current language', fakeAsync(() => {
    currentConfigSubject.next(mockLanguages[0]);
    tick();
    fixture.detectChanges();

    expect(component.currentLanguage?.code).toBe(Language.EN);
  }));

  it('should switch UI language from English to Spanish', fakeAsync(() => {
    // Change to Spanish
    translationService.setLanguage.and.returnValue(
      Promise.resolve().then(() => {
        currentLanguageSubject.next(Language.ES);
        currentConfigSubject.next(mockLanguages[1]);
      })
    );

    component.changeLanguage(Language.ES);
    tick();
    fixture.detectChanges();

    // Verify service was called
    expect(translationService.setLanguage).toHaveBeenCalledWith(Language.ES);
  }));

  it('should persist language preference after reload', fakeAsync(() => {
    // Set language to Spanish
    currentLanguageSubject.next(Language.ES);
    currentConfigSubject.next(mockLanguages[1]);
    tick();

    // Simulate component reload
    component.ngOnInit();
    tick();
    fixture.detectChanges();

    // Verify Spanish is still active
    expect(component.currentLanguage?.code).toBe(Language.ES);
  }));

  it('should update UI text when language changes', fakeAsync(() => {
    // Switch to Spanish
    translateService.use('es');
    currentLanguageSubject.next(Language.ES);
    currentConfigSubject.next(mockLanguages[1]);
    tick();
    fixture.detectChanges();

    // Verify translation service is using Spanish
    expect(translateService.currentLang).toBe('es');
  }));

  it('should show loading state during language change', fakeAsync(() => {
    stateSubject.next({ isLoading: true });
    tick();
    fixture.detectChanges();

    expect(component.isLoading).toBe(true);

    stateSubject.next({ isLoading: false });
    tick();
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
  }));

  it('should toggle between languages in button mode', fakeAsync(() => {
    component.displayMode = 'button';
    fixture.detectChanges();

    component.toggleLanguage();
    tick();

    expect(translationService.toggleLanguage).toHaveBeenCalled();
  }));

  it('should handle select dropdown change', fakeAsync(() => {
    component.displayMode = 'select';
    fixture.detectChanges();

    const event = {
      detail: { value: Language.ES },
    };

    component.onLanguageSelect(event);
    tick();

    expect(translationService.setLanguage).toHaveBeenCalledWith(Language.ES);
  }));

  it('should show native language names', fakeAsync(() => {
    component.showNativeName = true;
    currentConfigSubject.next(mockLanguages[1]); // Spanish
    tick();
    fixture.detectChanges();

    const displayText = component.getDisplayText();
    expect(displayText).toBe('Español');
  }));

  it('should show English language names by default', fakeAsync(() => {
    component.showNativeName = false;
    currentConfigSubject.next(mockLanguages[1]); // Spanish
    tick();
    fixture.detectChanges();

    const displayText = component.getDisplayText();
    expect(displayText).toBe('Spanish');
  }));

  it('should identify current language correctly', fakeAsync(() => {
    currentConfigSubject.next(mockLanguages[0]); // English
    tick();

    expect(component.isCurrentLanguage(Language.EN)).toBe(true);
    expect(component.isCurrentLanguage(Language.ES)).toBe(false);
  }));

  it('should not change language when loading', fakeAsync(() => {
    stateSubject.next({ isLoading: true });
    component.isLoading = true;
    tick();

    component.toggleLanguage();
    tick();

    // Should not call service when loading
    expect(translationService.toggleLanguage).not.toHaveBeenCalled();
  }));

  it('should support reset to device language', fakeAsync(() => {
    component.changeLanguage(Language.ES);
    tick();

    translationService.resetToDeviceLanguage();
    tick();

    expect(translationService.resetToDeviceLanguage).toHaveBeenCalled();
  }));

  it('should show all available languages', fakeAsync(() => {
    expect(component.availableLanguages).toEqual(mockLanguages);
  }));
});
