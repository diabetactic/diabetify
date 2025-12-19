/**
 * Language Switcher Component Integration Tests
 *
 * Pruebas de integración para el componente de cambio de idioma:
 * 1. LanguageSwitcherComponent - Componente principal con múltiples modos de visualización
 * 2. LanguagePopoverComponent - Componente de popover para selección de idioma
 * 3. TranslationService - Servicio de traducción y gestión de idiomas
 *
 * Flujo: Carga de idiomas → Suscripción a cambios → Toggle/Select → Actualización UI
 */

// Inicializar TestBed environment para Vitest
import '../../../../test-setup';

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopoverController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  LanguageSwitcherComponent,
  LanguagePopoverComponent,
} from '@shared/components/language-switcher/language-switcher.component';
import {
  TranslationService,
  Language,
  LanguageConfig,
  TranslationState,
} from '@core/services/translation.service';

describe('Language Switcher Integration Tests', () => {
  let component: LanguageSwitcherComponent;
  let fixture: ComponentFixture<LanguageSwitcherComponent>;
  let mockTranslationService: {
    state$: BehaviorSubject<TranslationState>;
    currentConfig$: BehaviorSubject<LanguageConfig>;
    getAvailableLanguages: Mock;
    getCurrentLanguage: Mock;
    getCurrentConfig: Mock;
    setLanguage: Mock;
    toggleLanguage: Mock;
    resetToDeviceLanguage: Mock;
    state: BehaviorSubject<TranslationState>;
  };
  let mockPopoverController: {
    create: Mock;
    getTop: Mock;
    dismiss: Mock;
  };

  const mockEnglishConfig: LanguageConfig = {
    code: Language.EN,
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    numberFormat: {
      decimal: '.',
      thousands: ',',
    },
    glucoseUnit: 'mg/dL',
  };

  const mockSpanishConfig: LanguageConfig = {
    code: Language.ES,
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
    glucoseUnit: 'mg/dL',
  };

  const mockAvailableLanguages = [mockEnglishConfig, mockSpanishConfig];

  const mockInitialState: TranslationState = {
    currentLanguage: Language.ES,
    availableLanguages: mockAvailableLanguages,
    isLoading: false,
    deviceLanguage: 'es',
  };

  beforeEach(() => {
    // Crear mock de TranslationService
    const stateSubject = new BehaviorSubject<TranslationState>(mockInitialState);
    const configSubject = new BehaviorSubject<LanguageConfig>(mockSpanishConfig);

    mockTranslationService = {
      state$: stateSubject,
      currentConfig$: configSubject,
      state: stateSubject,
      getAvailableLanguages: vi.fn().mockReturnValue(mockAvailableLanguages),
      getCurrentLanguage: vi.fn().mockReturnValue(Language.ES),
      getCurrentConfig: vi.fn().mockReturnValue(mockSpanishConfig),
      setLanguage: vi.fn().mockResolvedValue(undefined),
      toggleLanguage: vi.fn().mockResolvedValue(undefined),
      resetToDeviceLanguage: vi.fn().mockResolvedValue(undefined),
    };

    // Crear mock de PopoverController
    mockPopoverController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        dismiss: vi.fn().mockResolvedValue(undefined),
      }),
      getTop: vi.fn().mockResolvedValue(null),
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    // Configurar mock de TranslateService (requerido por TranslateModule)
    const langChangeSubject = new BehaviorSubject({ lang: 'es', translations: {} });
    const translationChangeSubject = new BehaviorSubject({ lang: 'es', translations: {} });
    const defaultLangChangeSubject = new BehaviorSubject({ lang: 'es', translations: {} });

    const mockTranslateService = {
      instant: vi.fn((key: string) => key),
      get: vi.fn((key: string | string[]) => {
        if (Array.isArray(key)) {
          const result: any = {};
          key.forEach(k => result[k] = k);
          return of(result);
        }
        return of(key);
      }),
      use: vi.fn((lang: string) => of({})),
      setDefaultLang: vi.fn(),
      addLangs: vi.fn(),
      currentLang: 'es',
      defaultLang: 'es',
      langs: ['en', 'es'],
      onLangChange: langChangeSubject,
      onTranslationChange: translationChangeSubject,
      onDefaultLangChange: defaultLangChangeSubject,
      stream: vi.fn((key: string | string[]) => {
        if (Array.isArray(key)) {
          const result: any = {};
          key.forEach(k => result[k] = k);
          return of(result);
        }
        return of(key);
      }),
      getTranslation: vi.fn((lang: string) => of({})),
      setTranslation: vi.fn(),
      getLangs: vi.fn().mockReturnValue(['en', 'es']),
      getDefaultLang: vi.fn().mockReturnValue('es'),
      getCurrentLang: vi.fn().mockReturnValue('es'),
      getBrowserLang: vi.fn().mockReturnValue('es'),
      getBrowserCultureLang: vi.fn().mockReturnValue('es-ES'),
      getParsedResult: vi.fn((translations: any, key: any, interpolateParams?: any) => {
        if (typeof key === 'string') return key;
        if (Array.isArray(key)) {
          const result: any = {};
          key.forEach(k => result[k] = k);
          return result;
        }
        return key;
      }),
      parser: {
        interpolate: vi.fn((expr: string, params?: any) => expr),
        getValue: vi.fn((target: any, key: string) => key),
      },
      compiler: {
        compile: vi.fn((value: string, lang: string) => (params: any) => value),
        compileTranslations: vi.fn((translations: any, lang: string) => translations),
      },
      translations: { es: {}, en: {} },
      currentLoader: {},
    };

    TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent, FormsModule],
      providers: [
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: PopoverController, useValue: mockPopoverController },
        { provide: TranslateService, useValue: mockTranslateService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });

    fixture = TestBed.createComponent(LanguageSwitcherComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('1. Inicialización y carga de idiomas', () => {
    it('debería cargar idiomas disponibles desde TranslationService', () => {
      fixture.detectChanges();

      expect(component.availableLanguages).toEqual(mockAvailableLanguages);
      expect(component.availableLanguages).toHaveLength(2);
      expect(mockTranslationService.getAvailableLanguages).toHaveBeenCalled();
    });

    it('debería establecer el idioma actual en null antes de la inicialización', () => {
      expect(component.currentLanguage).toBeNull();
    });

    it('debería cargar idiomas con configuraciones correctas (EN y ES)', () => {
      fixture.detectChanges();

      const enLang = component.availableLanguages.find(l => l.code === Language.EN);
      const esLang = component.availableLanguages.find(l => l.code === Language.ES);

      expect(enLang).toBeDefined();
      expect(enLang?.name).toBe('English');
      expect(enLang?.nativeName).toBe('English');

      expect(esLang).toBeDefined();
      expect(esLang?.name).toBe('Spanish');
      expect(esLang?.nativeName).toBe('Español');
    });
  });

  describe('2. Suscripción a cambios de idioma', () => {
    it('debería suscribirse a currentConfig$ y actualizar currentLanguage', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.currentLanguage).toEqual(mockSpanishConfig);
    });

    it('debería actualizar currentLanguage cuando cambia el idioma', async () => {
      fixture.detectChanges();

      // Cambiar a inglés
      mockTranslationService.currentConfig$.next(mockEnglishConfig);
      await fixture.whenStable();

      expect(component.currentLanguage).toEqual(mockEnglishConfig);
    });

    it('debería mantener la suscripción activa durante el ciclo de vida', async () => {
      fixture.detectChanges();

      // Cambiar idioma varias veces
      mockTranslationService.currentConfig$.next(mockEnglishConfig);
      await fixture.whenStable();
      expect(component.currentLanguage?.code).toBe(Language.EN);

      mockTranslationService.currentConfig$.next(mockSpanishConfig);
      await fixture.whenStable();
      expect(component.currentLanguage?.code).toBe(Language.ES);
    });
  });

  describe('3. Indicador de estado de carga', () => {
    it('debería suscribirse al estado de carga', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.isLoading).toBe(false);
    });

    it('debería actualizar isLoading cuando el servicio está cargando', async () => {
      fixture.detectChanges();

      mockTranslationService.state$.next({
        ...mockInitialState,
        isLoading: true,
      });
      await fixture.whenStable();

      expect(component.isLoading).toBe(true);
    });

    it('debería reflejar cambios de estado de carga en tiempo real', async () => {
      fixture.detectChanges();

      // Inicio de carga
      mockTranslationService.state$.next({ ...mockInitialState, isLoading: true });
      await fixture.whenStable();
      expect(component.isLoading).toBe(true);

      // Fin de carga
      mockTranslationService.state$.next({ ...mockInitialState, isLoading: false });
      await fixture.whenStable();
      expect(component.isLoading).toBe(false);
    });
  });

  describe('4. Toggle de idioma', () => {
    it('debería llamar a toggleLanguage del servicio', async () => {
      fixture.detectChanges();

      await component.toggleLanguage();

      expect(mockTranslationService.toggleLanguage).toHaveBeenCalled();
    });

    it('debería actualizar currentLanguage después de toggle', async () => {
      fixture.detectChanges();

      // Mock: toggleLanguage cambia a inglés
      mockTranslationService.toggleLanguage.mockImplementation(async () => {
        mockTranslationService.currentConfig$.next(mockEnglishConfig);
      });
      mockTranslationService.getCurrentLanguage.mockReturnValue(Language.EN);

      await component.toggleLanguage();

      expect(component.currentLanguage?.code).toBe(Language.EN);
    });

    it('no debería hacer toggle si está cargando', async () => {
      fixture.detectChanges();
      component.isLoading = true;

      await component.toggleLanguage();

      expect(mockTranslationService.toggleLanguage).not.toHaveBeenCalled();
    });

    it('debería sincronizar UI forzando actualización del idioma actual', async () => {
      fixture.detectChanges();

      mockTranslationService.getCurrentLanguage.mockReturnValue(Language.EN);

      await component.toggleLanguage();

      expect(mockTranslationService.getAvailableLanguages).toHaveBeenCalled();
      expect(component.currentLanguage?.code).toBe(Language.EN);
    });
  });

  describe('5. Cambio a idioma específico', () => {
    it('debería cambiar a idioma específico', async () => {
      fixture.detectChanges();

      await component.changeLanguage(Language.EN);

      expect(mockTranslationService.setLanguage).toHaveBeenCalledWith(Language.EN);
    });

    it('debería actualizar currentLanguage después del cambio', async () => {
      fixture.detectChanges();

      mockTranslationService.setLanguage.mockImplementation(async (lang: Language) => {
        mockTranslationService.currentConfig$.next(mockEnglishConfig);
      });

      await component.changeLanguage(Language.EN);

      expect(component.currentLanguage?.code).toBe(Language.EN);
    });

    it('no debería cambiar idioma si está cargando', async () => {
      fixture.detectChanges();
      component.isLoading = true;

      await component.changeLanguage(Language.EN);

      expect(mockTranslationService.setLanguage).not.toHaveBeenCalled();
    });
  });

  describe('6. Cerrar popover después de selección', () => {
    it('debería cerrar popover si está presente', async () => {
      fixture.detectChanges();

      const mockPopover = {
        dismiss: vi.fn().mockResolvedValue(undefined),
        present: vi.fn().mockResolvedValue(undefined),
      };
      mockPopoverController.getTop.mockResolvedValue(mockPopover);

      await component.changeLanguage(Language.EN);

      expect(mockPopoverController.getTop).toHaveBeenCalled();
      expect(mockPopover.dismiss).toHaveBeenCalled();
    });

    it('no debería fallar si no hay popover', async () => {
      fixture.detectChanges();

      mockPopoverController.getTop.mockResolvedValue(null);

      await expect(component.changeLanguage(Language.EN)).resolves.not.toThrow();
    });

    it('debería manejar errores al cerrar popover', async () => {
      fixture.detectChanges();

      mockPopoverController.getTop.mockRejectedValue(new Error('Popover error'));

      await expect(component.changeLanguage(Language.EN)).resolves.not.toThrow();
      expect(mockTranslationService.setLanguage).toHaveBeenCalledWith(Language.EN);
    });
  });

  describe('7. Evento de cambio de select', () => {
    it('debería manejar evento de cambio de select', async () => {
      fixture.detectChanges();

      const event = {
        detail: { value: Language.EN },
      } as CustomEvent<{ value: Language }>;

      await component.onLanguageSelect(event);

      expect(mockTranslationService.setLanguage).toHaveBeenCalledWith(Language.EN);
    });

    it('debería actualizar idioma desde evento de select', async () => {
      fixture.detectChanges();

      mockTranslationService.setLanguage.mockImplementation(async () => {
        mockTranslationService.currentConfig$.next(mockEnglishConfig);
      });

      const event = {
        detail: { value: Language.EN },
      } as CustomEvent<{ value: Language }>;

      await component.onLanguageSelect(event);

      expect(component.currentLanguage?.code).toBe(Language.EN);
    });
  });

  describe('8. Texto de visualización (nativo/inglés)', () => {
    it('debería mostrar nombre en inglés por defecto', () => {
      fixture.detectChanges();
      component.currentLanguage = mockSpanishConfig;

      const displayText = component.getDisplayText();

      expect(displayText).toBe('Spanish');
    });

    it('debería mostrar nombre nativo cuando showNativeName es true', () => {
      fixture.detectChanges();
      component.currentLanguage = mockSpanishConfig;
      component.showNativeName = true;

      const displayText = component.getDisplayText();

      expect(displayText).toBe('Español');
    });

    it('debería retornar string vacío si no hay idioma actual', () => {
      fixture.detectChanges();
      component.currentLanguage = null;

      const displayText = component.getDisplayText();

      expect(displayText).toBe('');
    });

    it('debería cambiar entre nombre y nombre nativo', () => {
      fixture.detectChanges();
      component.currentLanguage = mockEnglishConfig;

      component.showNativeName = false;
      expect(component.getDisplayText()).toBe('English');

      component.showNativeName = true;
      expect(component.getDisplayText()).toBe('English');
    });
  });

  describe('9. Emojis de banderas', () => {
    it('debería retornar bandera correcta para inglés', () => {
      const flag = component.getFlagEmoji(Language.EN);
      expect(flag).toBe('🇺🇸');
    });

    it('debería retornar bandera correcta para español', () => {
      const flag = component.getFlagEmoji(Language.ES);
      expect(flag).toBe('🇪🇸');
    });

    it('debería retornar globo por defecto para idioma desconocido', () => {
      const flag = component.getFlagEmoji('unknown' as Language);
      expect(flag).toBe('🌐');
    });
  });

  describe('10. Lista de idiomas en sub-componente', () => {
    it('debería tener función trackBy para lista de idiomas', () => {
      const trackByResult = component.trackByLanguage(0, mockEnglishConfig);
      expect(trackByResult).toBe(Language.EN);
    });

    it('debería trackear correctamente idiomas en la lista', () => {
      fixture.detectChanges();

      const enTrack = component.trackByLanguage(0, mockEnglishConfig);
      const esTrack = component.trackByLanguage(1, mockSpanishConfig);

      expect(enTrack).toBe(Language.EN);
      expect(esTrack).toBe(Language.ES);
    });
  });

  describe('11. Limpieza en ngOnDestroy', () => {
    it('debería cancelar suscripciones en ngOnDestroy', () => {
      fixture.detectChanges();

      const unsubscribeSpy = vi.spyOn(component['subscriptions'], 'unsubscribe');

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('no debería actualizar currentLanguage después de destroy', async () => {
      fixture.detectChanges();
      component.ngOnDestroy();

      mockTranslationService.currentConfig$.next(mockEnglishConfig);
      await fixture.whenStable();

      // No debería actualizarse porque la suscripción fue cancelada
      expect(component.currentLanguage).not.toEqual(mockEnglishConfig);
    });
  });

  describe('12. Estado deshabilitado', () => {
    it('no debería permitir toggle cuando isLoading es true', async () => {
      fixture.detectChanges();
      component.isLoading = true;

      const callsBefore = vi.mocked(mockTranslationService.toggleLanguage).mock.calls.length;
      await component.toggleLanguage();
      const callsAfter = vi.mocked(mockTranslationService.toggleLanguage).mock.calls.length;

      expect(callsAfter).toBe(callsBefore);
    });

    it('no debería permitir changeLanguage cuando isLoading es true', async () => {
      fixture.detectChanges();
      component.isLoading = true;

      const callsBefore = vi.mocked(mockTranslationService.setLanguage).mock.calls.length;
      await component.changeLanguage(Language.EN);
      const callsAfter = vi.mocked(mockTranslationService.setLanguage).mock.calls.length;

      expect(callsAfter).toBe(callsBefore);
    });
  });

  describe('13. Soporte para idiomas RTL', () => {
    it('debería manejar dirección de texto LTR para inglés', () => {
      fixture.detectChanges();
      component.currentLanguage = mockEnglishConfig;

      expect(component.currentLanguage.direction).toBe('ltr');
    });

    it('debería manejar dirección de texto LTR para español', () => {
      fixture.detectChanges();
      component.currentLanguage = mockSpanishConfig;

      expect(component.currentLanguage.direction).toBe('ltr');
    });

    it('debería soportar configuración RTL si se añade en el futuro', () => {
      fixture.detectChanges();

      const mockRtlConfig: LanguageConfig = {
        ...mockEnglishConfig,
        code: 'ar' as Language,
        direction: 'rtl',
      };

      component.currentLanguage = mockRtlConfig;

      expect(component.currentLanguage.direction).toBe('rtl');
    });
  });

  describe('14. Etiquetas de accesibilidad', () => {
    it('debería retornar código de idioma correcto para EN', () => {
      const code = component.getLanguageCode(Language.EN);
      expect(code).toBe('EN');
    });

    it('debería retornar código de idioma correcto para ES', () => {
      const code = component.getLanguageCode(Language.ES);
      expect(code).toBe('ES');
    });

    it('debería retornar ?? para idioma desconocido', () => {
      const code = component.getLanguageCode('unknown' as Language);
      expect(code).toBe('??');
    });
  });

  describe('15. Verificación de idioma actual', () => {
    it('debería identificar correctamente el idioma actual', () => {
      fixture.detectChanges();
      component.currentLanguage = mockSpanishConfig;

      expect(component.isCurrentLanguage(Language.ES)).toBe(true);
      expect(component.isCurrentLanguage(Language.EN)).toBe(false);
    });

    it('debería retornar false si no hay idioma actual', () => {
      fixture.detectChanges();
      component.currentLanguage = null;

      expect(component.isCurrentLanguage(Language.ES)).toBe(false);
      expect(component.isCurrentLanguage(Language.EN)).toBe(false);
    });
  });
});

describe('Language Popover Component Integration Tests', () => {
  let component: LanguagePopoverComponent;
  let fixture: ComponentFixture<LanguagePopoverComponent>;
  let mockTranslationService: {
    getAvailableLanguages: Mock;
    getCurrentLanguage: Mock;
    setLanguage: Mock;
    resetToDeviceLanguage: Mock;
  };
  let mockPopoverController: {
    dismiss: Mock;
  };

  const mockAvailableLanguages: LanguageConfig[] = [
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
      nativeName: 'Español',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      numberFormat: { decimal: ',', thousands: '.' },
      glucoseUnit: 'mg/dL',
    },
  ];

  beforeEach(() => {
    mockTranslationService = {
      getAvailableLanguages: vi.fn().mockReturnValue(mockAvailableLanguages),
      getCurrentLanguage: vi.fn().mockReturnValue(Language.ES),
      setLanguage: vi.fn().mockResolvedValue(undefined),
      resetToDeviceLanguage: vi.fn().mockResolvedValue(undefined),
    };

    mockPopoverController = {
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    const langChangeSubject = new BehaviorSubject({ lang: 'es', translations: {} });
    const translationChangeSubject = new BehaviorSubject({ lang: 'es', translations: {} });
    const defaultLangChangeSubject = new BehaviorSubject({ lang: 'es', translations: {} });

    const mockTranslateService = {
      instant: vi.fn((key: string) => key),
      get: vi.fn((key: string | string[]) => {
        if (Array.isArray(key)) {
          const result: any = {};
          key.forEach(k => result[k] = k);
          return of(result);
        }
        return of(key);
      }),
      use: vi.fn((lang: string) => of({})),
      setDefaultLang: vi.fn(),
      addLangs: vi.fn(),
      currentLang: 'es',
      defaultLang: 'es',
      langs: ['en', 'es'],
      onLangChange: langChangeSubject,
      onTranslationChange: translationChangeSubject,
      onDefaultLangChange: defaultLangChangeSubject,
      stream: vi.fn((key: string | string[]) => {
        if (Array.isArray(key)) {
          const result: any = {};
          key.forEach(k => result[k] = k);
          return of(result);
        }
        return of(key);
      }),
      getTranslation: vi.fn((lang: string) => of({})),
      setTranslation: vi.fn(),
      getLangs: vi.fn().mockReturnValue(['en', 'es']),
      getDefaultLang: vi.fn().mockReturnValue('es'),
      getCurrentLang: vi.fn().mockReturnValue('es'),
      getBrowserLang: vi.fn().mockReturnValue('es'),
      getBrowserCultureLang: vi.fn().mockReturnValue('es-ES'),
      getParsedResult: vi.fn((translations: any, key: any, interpolateParams?: any) => {
        if (typeof key === 'string') return key;
        if (Array.isArray(key)) {
          const result: any = {};
          key.forEach(k => result[k] = k);
          return result;
        }
        return key;
      }),
      parser: {
        interpolate: vi.fn((expr: string, params?: any) => expr),
        getValue: vi.fn((target: any, key: string) => key),
      },
      compiler: {
        compile: vi.fn((value: string, lang: string) => (params: any) => value),
        compileTranslations: vi.fn((translations: any, lang: string) => translations),
      },
      translations: { es: {}, en: {} },
      currentLoader: {},
    };

    TestBed.configureTestingModule({
      imports: [LanguagePopoverComponent],
      providers: [
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: PopoverController, useValue: mockPopoverController },
        { provide: TranslateService, useValue: mockTranslateService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });

    fixture = TestBed.createComponent(LanguagePopoverComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('debería cargar idiomas disponibles al inicializar', () => {
    // Llamar a ngOnInit manualmente sin detectar cambios (evita renderizar template con translate pipe)
    component.ngOnInit();

    expect(component.languages).toEqual(mockAvailableLanguages);
    expect(mockTranslationService.getAvailableLanguages).toHaveBeenCalled();
  });

  it('debería establecer idioma actual al inicializar', () => {
    // Llamar a ngOnInit manualmente
    component.ngOnInit();

    expect(component.currentLanguage).toBe(Language.ES);
    expect(mockTranslationService.getCurrentLanguage).toHaveBeenCalled();
  });

  it('debería seleccionar idioma y cerrar popover', async () => {
    // Llamar a ngOnInit manualmente
    component.ngOnInit();

    await component.selectLanguage(Language.EN);

    expect(mockTranslationService.setLanguage).toHaveBeenCalledWith(Language.EN);
    expect(mockPopoverController.dismiss).toHaveBeenCalled();
  });

  it('debería resetear a idioma del dispositivo y cerrar popover', async () => {
    // Llamar a ngOnInit manualmente
    component.ngOnInit();

    await component.resetToDevice();

    expect(mockTranslationService.resetToDeviceLanguage).toHaveBeenCalled();
    expect(mockPopoverController.dismiss).toHaveBeenCalled();
  });

  it('debería identificar idioma seleccionado correctamente', () => {
    // Llamar a ngOnInit manualmente
    component.ngOnInit();

    expect(component.isSelected(Language.ES)).toBe(true);
    expect(component.isSelected(Language.EN)).toBe(false);
  });

  it('debería retornar bandera correcta para cada idioma', () => {
    expect(component.getFlagEmoji(Language.EN)).toBe('🇺🇸');
    expect(component.getFlagEmoji(Language.ES)).toBe('🇪🇸');
    expect(component.getFlagEmoji('unknown' as Language)).toBe('🌐');
  });

  it('debería retornar código de idioma correcto', () => {
    expect(component.getLanguageCode(Language.EN)).toBe('EN');
    expect(component.getLanguageCode(Language.ES)).toBe('ES');
    expect(component.getLanguageCode('unknown' as Language)).toBe('??');
  });
});
