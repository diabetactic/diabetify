/**
 * ReadingsPage Integration Tests
 *
 * Pruebas de integración completas para el componente ReadingsPage:
 * - Carga y agrupación de lecturas por fecha
 * - Búsqueda con debounce
 * - Filtros (estado, rango de fechas)
 * - Pull-to-refresh y sincronización
 * - Modal de detalle de lectura
 * - Formatos de contexto de comida, hora y fecha
 * - Estados: carga, vacío, error
 * - Paginación/scroll infinito
 */

// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';

import { ReadingsPage } from '../../../readings/readings.page';
import { ReadingsService } from '@core/services/readings.service';
import { ProfileService } from '@core/services/profile.service';
import { TranslationService } from '@core/services/translation.service';
import { LoggerService } from '@core/services/logger.service';
import { GlucoseStatus, GlucoseUnit } from '@core/models/glucose-reading.model';
import { getLucideIconsForTesting } from '../../helpers/icon-test.helper';

describe('ReadingsPage - Integration Tests', () => {
  let component: ReadingsPage;
  let fixture: ComponentFixture<ReadingsPage>;
  let readingsService: ReadingsService;
  let profileService: ProfileService;
  let translationService: TranslationService;
  let router: Router;
  let toastController: ToastController;
  let cdr: ChangeDetectorRef;

  // Mock data
  const readingsSubject = new BehaviorSubject<any[]>([]);
  const profileSubject = new BehaviorSubject<any>(null);

  const createMockReading = (overrides: any = {}) => ({
    id: overrides.id || `reading-${Math.random()}`,
    localId: overrides.localId || `local-${Math.random()}`,
    time: overrides.time || new Date().toISOString(),
    value: overrides.value || 120,
    units: overrides.units || ('mg/dL' as GlucoseUnit),
    type: 'smbg' as const,
    subType: 'manual',
    deviceId: 'test-device',
    userId: 'test-user',
    status: overrides.status || ('normal' as GlucoseStatus),
    mealContext: overrides.mealContext,
    notes: overrides.notes,
    tags: overrides.tags || [],
    synced: overrides.synced || false,
    localStoredAt: new Date().toISOString(),
    isLocalOnly: true,
    ...overrides,
  });

  // Mock services
  const mockReadingsService = {
    readings$: readingsSubject.asObservable(),
    performFullSync: vi.fn().mockResolvedValue({ fetched: 0, pushed: 0, failed: 0 }),
  };

  const mockProfileService = {
    profile$: profileSubject.asObservable(),
    getProfile: vi.fn().mockResolvedValue(null),
  };

  const mockTranslationService = {
    instant: vi.fn((key: string, params?: any) => {
      // Simular traducciones básicas
      const translations: Record<string, string> = {
        'common.today': 'Hoy',
        'common.yesterday': 'Ayer',
        'readings.filter.all': 'Todos',
        'glucose.status.veryLow': 'Muy Bajo',
        'glucose.status.low': 'Bajo',
        'glucose.status.normal': 'Normal',
        'glucose.status.high': 'Alto',
        'glucose.status.veryHigh': 'Muy Alto',
        'glucose.context.breakfast': 'Desayuno',
        'glucose.context.lunch': 'Almuerzo',
        'glucose.context.snack': 'Merienda',
        'glucose.context.dinner': 'Cena',
        'glucose.context.exercise': 'Ejercicio',
        'glucose.context.otherMeals': 'Otras comidas',
        'glucose.context.other': 'Otro',
        'readings.syncComplete': `Sincronizados: ${params?.pushed || 0} enviados, ${params?.fetched || 0} recibidos`,
        'readings.errors.syncFailed': 'Error al sincronizar',
        'readings.errors.refreshFailed': 'Error al actualizar',
      };
      return translations[key] || key;
    }),
    getCurrentLanguage: vi.fn().mockReturnValue('es'),
    formatTime: vi.fn((date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }),
    formatDate: vi.fn((date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }),
  };

  const mockLoggerService = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const mockRouter = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  const mockToastController = {
    create: vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
    }),
  };

  beforeEach(async () => {
    // Reset subjects
    readingsSubject.next([]);
    profileSubject.next(null);

    // Reset mocks
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ReadingsPage, TranslateModule.forRoot(), getLucideIconsForTesting()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastController, useValue: mockToastController },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsPage);
    component = fixture.componentInstance;
    readingsService = TestBed.inject(ReadingsService);
    profileService = TestBed.inject(ProfileService);
    translationService = TestBed.inject(TranslationService);
    router = TestBed.inject(Router);
    toastController = TestBed.inject(ToastController);
    cdr = fixture.componentRef.injector.get(ChangeDetectorRef);
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('1. Load readings and group by date', () => {
    it('debe cargar lecturas y agruparlas por fecha (hoy, ayer, fechas anteriores)', fakeAsync(() => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const mockReadings = [
        createMockReading({ time: today.toISOString(), value: 120 }),
        createMockReading({ time: today.toISOString(), value: 130 }),
        createMockReading({ time: yesterday.toISOString(), value: 110 }),
        createMockReading({ time: lastWeek.toISOString(), value: 140 }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      expect(component.allReadings).toHaveLength(4);
      expect(component.groupedReadings).toHaveLength(3); // Hoy, Ayer, Semana pasada

      // Verificar grupo de hoy
      const todayGroup = component.groupedReadings.find(g => g.displayDate === 'Hoy');
      expect(todayGroup).toBeDefined();
      expect(todayGroup?.readings).toHaveLength(2);

      // Verificar grupo de ayer
      const yesterdayGroup = component.groupedReadings.find(g => g.displayDate === 'Ayer');
      expect(yesterdayGroup).toBeDefined();
      expect(yesterdayGroup?.readings).toHaveLength(1);

      // Verificar ordenamiento (más reciente primero)
      expect(component.groupedReadings[0].displayDate).toBe('Hoy');
      expect(component.groupedReadings[1].displayDate).toBe('Ayer');
    }));

    it('debe ordenar lecturas dentro de cada grupo por hora descendente', fakeAsync(() => {
      const today = new Date();
      const morning = new Date(today);
      morning.setHours(8, 0, 0, 0);
      const noon = new Date(today);
      noon.setHours(12, 0, 0, 0);
      const evening = new Date(today);
      evening.setHours(20, 0, 0, 0);

      const mockReadings = [
        createMockReading({ time: morning.toISOString(), value: 90 }),
        createMockReading({ time: evening.toISOString(), value: 150 }),
        createMockReading({ time: noon.toISOString(), value: 120 }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      const todayGroup = component.groupedReadings[0];
      expect(todayGroup.readings[0].value).toBe(150); // Noche (más reciente)
      expect(todayGroup.readings[1].value).toBe(120); // Mediodía
      expect(todayGroup.readings[2].value).toBe(90); // Mañana
    }));
  });

  describe('2. Search with debounce (300ms)', () => {
    it('debe aplicar debounce de 300ms a la búsqueda', fakeAsync(() => {
      const mockReadings = [
        createMockReading({ value: 120, notes: 'Antes de desayunar' }),
        createMockReading({ value: 180, notes: 'Después de comer' }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      // Escribir en el search bar
      component.onSearchChange({ detail: { value: 'desayunar' } } as CustomEvent);
      tick(100);
      expect(component.filteredReadings).toHaveLength(2); // Aún no filtrado

      tick(200); // Completar debounce
      expect(component.filteredReadings).toHaveLength(1);
      expect(component.filteredReadings[0].notes).toBe('Antes de desayunar');
    }));

    it('debe buscar en notas, tags y valores', fakeAsync(() => {
      const mockReadings = [
        createMockReading({ value: 120, notes: 'Glucosa en ayunas', tags: ['ayuno'] }),
        createMockReading({ value: 95, notes: 'Antes de ejercicio', tags: ['ejercicio'] }),
        createMockReading({ value: 95, notes: 'Otra lectura', tags: [] }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      // Buscar por nota
      component.onSearchChange({ detail: { value: 'ayunas' } } as CustomEvent);
      tick(300);
      expect(component.filteredReadings).toHaveLength(1);
      expect(component.filteredReadings[0].notes).toContain('ayunas');

      // Buscar por tag
      component.onSearchChange({ detail: { value: 'ejercicio' } } as CustomEvent);
      tick(300);
      expect(component.filteredReadings).toHaveLength(1);
      expect(component.filteredReadings[0].tags).toContain('ejercicio');

      // Buscar por valor
      component.onSearchChange({ detail: { value: '95' } } as CustomEvent);
      tick(300);
      expect(component.filteredReadings).toHaveLength(2);
    }));

    it('debe limpiar búsqueda correctamente', fakeAsync(() => {
      const mockReadings = [
        createMockReading({ value: 120, notes: 'Test 1' }),
        createMockReading({ value: 130, notes: 'Test 2' }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      component.onSearchChange({ detail: { value: 'Test 1' } } as CustomEvent);
      tick(300);
      expect(component.filteredReadings).toHaveLength(1);

      component.clearSearch();
      tick(300);
      expect(component.searchTerm).toBe('');
      expect(component.filteredReadings).toHaveLength(2);
    }));
  });

  describe('3. Apply status filter', () => {
    it('debe filtrar por estado de glucosa', fakeAsync(() => {
      const mockReadings = [
        createMockReading({ value: 60, status: 'low' as GlucoseStatus }),
        createMockReading({ value: 120, status: 'normal' as GlucoseStatus }),
        createMockReading({ value: 200, status: 'high' as GlucoseStatus }),
        createMockReading({ value: 250, status: 'critical-high' as GlucoseStatus }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      // Filtrar por normal
      component.filters.status = 'normal';
      component['applyFiltersAndGroup']();
      expect(component.filteredReadings).toHaveLength(1);
      expect(component.filteredReadings[0].status).toBe('normal');

      // Filtrar por alto
      component.filters.status = 'high';
      component['applyFiltersAndGroup']();
      expect(component.filteredReadings).toHaveLength(1);
      expect(component.filteredReadings[0].status).toBe('high');

      // Mostrar todos
      component.filters.status = 'all';
      component['applyFiltersAndGroup']();
      expect(component.filteredReadings).toHaveLength(4);
    }));

    it('debe obtener etiquetas de estado correctamente', () => {
      expect(component.getStatusLabel('all')).toBe('Todos');
      expect(component.getStatusLabel('critical-low')).toBe('Muy Bajo');
      expect(component.getStatusLabel('low')).toBe('Bajo');
      expect(component.getStatusLabel('normal')).toBe('Normal');
      expect(component.getStatusLabel('high')).toBe('Alto');
      expect(component.getStatusLabel('critical-high')).toBe('Muy Alto');
    });
  });

  describe('4. Apply date range filter', () => {
    it('debe filtrar por rango de fechas', fakeAsync(() => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const mockReadings = [
        createMockReading({ time: today.toISOString() }),
        createMockReading({ time: twoDaysAgo.toISOString() }),
        createMockReading({ time: fiveDaysAgo.toISOString() }),
        createMockReading({ time: tenDaysAgo.toISOString() }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      // Filtrar últimos 7 días
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      component.filters.startDate = sevenDaysAgo;
      component.filters.endDate = today;
      component['applyFiltersAndGroup']();

      expect(component.filteredReadings).toHaveLength(3); // today, 2 days ago, 5 days ago
    }));

    it('debe usar filtros rápidos de fecha', fakeAsync(() => {
      component.setFilterLast24Hours();
      expect(component.filters.startDate).toBeDefined();
      expect(component.filters.endDate).toBeDefined();

      component.setFilterLast7Days();
      expect(component.filters.startDate).toBeDefined();
      expect(component.filters.endDate).toBeDefined();

      component.setFilterLast30Days();
      expect(component.filters.startDate).toBeDefined();
      expect(component.filters.endDate).toBeDefined();

      component.setFilterAllTime();
      expect(component.filters.startDate).toBeUndefined();
      expect(component.filters.endDate).toBeUndefined();
    }));
  });

  describe('5. Clear all filters', () => {
    it('debe limpiar todos los filtros', fakeAsync(() => {
      component.filters = {
        status: 'high' as GlucoseStatus,
        startDate: new Date(),
        endDate: new Date(),
        searchTerm: 'test',
      };
      component.searchTerm = 'test';

      component.clearFilters();

      expect(component.filters.status).toBe('all');
      expect(component.filters.startDate).toBeUndefined();
      expect(component.filters.endDate).toBeUndefined();
      expect(component.searchTerm).toBe('');
    }));

    it('debe detectar filtros activos correctamente', () => {
      // Sin filtros
      component.filters = { status: 'all' };
      expect(component.hasActiveFilters()).toBe(false);

      // Con filtro de estado
      component.filters.status = 'high' as GlucoseStatus;
      expect(component.hasActiveFilters()).toBe(true);

      // Con filtro de fecha
      component.filters = { status: 'all', startDate: new Date() };
      expect(component.hasActiveFilters()).toBe(true);

      // Con búsqueda
      component.filters = { status: 'all', searchTerm: 'test' };
      expect(component.hasActiveFilters()).toBe(true);
    });

    it('debe contar filtros activos correctamente', () => {
      component.filters = { status: 'all' };
      expect(component.getFilterCount()).toBe(0);

      component.filters = {
        status: 'high' as GlucoseStatus,
        startDate: new Date(),
        endDate: new Date(),
        searchTerm: 'test',
      };
      expect(component.getFilterCount()).toBe(4);
    });
  });

  describe('6. Pull-to-refresh → sync', () => {
    it('debe sincronizar lecturas al hacer pull-to-refresh', async () => {
      vi.mocked(mockReadingsService.performFullSync).mockResolvedValue({
        fetched: 5,
        pushed: 3,
        failed: 0,
      });

      const mockRefresher = {
        target: {
          complete: vi.fn(),
        },
      } as unknown as CustomEvent;

      await component.doRefresh(mockRefresher);

      expect(mockReadingsService.performFullSync).toHaveBeenCalled();
      expect(mockRefresher.target.complete).toHaveBeenCalled();
    });

    it('debe manejar errores de sincronización en pull-to-refresh', async () => {
      vi.mocked(mockReadingsService.performFullSync).mockRejectedValue(new Error('Network error'));

      const mockRefresher = {
        target: {
          complete: vi.fn(),
        },
      } as unknown as CustomEvent;

      await component.doRefresh(mockRefresher);

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Readings',
        'Error refreshing readings',
        expect.any(Error)
      );
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al actualizar',
          color: 'danger',
        })
      );
      expect(mockRefresher.target.complete).toHaveBeenCalled();
    });

    it('debe sincronizar automáticamente en segundo plano al cargar', async () => {
      vi.mocked(mockReadingsService.performFullSync).mockResolvedValue({
        fetched: 2,
        pushed: 1,
        failed: 0,
      });

      // Inicializar componente (llama a autoFetchFromBackend)
      component.ngOnInit();

      // Esperar a que se complete la sincronización asíncrona
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockReadingsService.performFullSync).toHaveBeenCalled();
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'Sync',
        expect.stringContaining('Auto-sync complete')
      );
    });

    it('debe manejar errores silenciosamente en sync automático', async () => {
      vi.mocked(mockReadingsService.performFullSync).mockRejectedValue(new Error('Network error'));

      component.ngOnInit();

      // Esperar a que se complete la sincronización asíncrona
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'Sync',
        'Auto-sync failed',
        expect.any(Error)
      );
      // No debe mostrar toast en sync automático
      expect(mockToastController.create).not.toHaveBeenCalled();
    });
  });

  describe('7. Reading click → open detail modal', () => {
    it('debe abrir modal de detalle al hacer clic en lectura', () => {
      const mockReading = createMockReading({ value: 120 });

      component.onReadingClick(mockReading);

      expect(component.isDetailModalOpen).toBe(true);
      expect(component.selectedReading).toBe(mockReading);
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'UI',
        'Reading clicked',
        expect.objectContaining({ readingId: mockReading.id })
      );
    });

    it('debe cerrar modal de detalle correctamente', () => {
      const mockReading = createMockReading({ value: 120 });
      component.selectedReading = mockReading;
      component.isDetailModalOpen = true;

      component.closeDetailModal();

      expect(component.isDetailModalOpen).toBe(false);
      expect(component.selectedReading).toBeNull();
    });
  });

  describe('8. Format meal context correctly', () => {
    it('debe mapear contextos de comida desde backend a i18n', () => {
      expect(component.getMealLabel('DESAYUNO')).toBe('Desayuno');
      expect(component.getMealLabel('ALMUERZO')).toBe('Almuerzo');
      expect(component.getMealLabel('MERIENDA')).toBe('Merienda');
      expect(component.getMealLabel('CENA')).toBe('Cena');
      expect(component.getMealLabel('EJERCICIO')).toBe('Ejercicio');
      expect(component.getMealLabel('OTRAS_COMIDAS')).toBe('Otras comidas');
      expect(component.getMealLabel('OTRO')).toBe('Otro');
    });

    it('debe manejar contextos de comida no definidos', () => {
      expect(component.getMealLabel(undefined)).toBe('');
      expect(component.getMealLabel('INVALID')).toBe('Otro'); // Fallback
    });
  });

  describe('9. Format time/date correctly', () => {
    it('debe formatear hora correctamente según idioma', () => {
      const time = '2024-01-15T14:30:00.000Z';

      vi.mocked(mockTranslationService.getCurrentLanguage).mockReturnValue('es');
      const timeEs = component.formatReadingTime(time);
      expect(timeEs).toBeTruthy();

      vi.mocked(mockTranslationService.getCurrentLanguage).mockReturnValue('en');
      const timeEn = component.formatReadingTime(time);
      expect(timeEn).toBeTruthy();
    });

    it('debe formatear fecha completa correctamente según idioma', () => {
      const time = '2024-01-15T14:30:00.000Z';

      vi.mocked(mockTranslationService.getCurrentLanguage).mockReturnValue('es');
      const dateEs = component.formatReadingDate(time);
      expect(dateEs).toBeTruthy();

      vi.mocked(mockTranslationService.getCurrentLanguage).mockReturnValue('en');
      const dateEn = component.formatReadingDate(time);
      expect(dateEn).toBeTruthy();
    });

    it('debe formatear encabezados de fecha (Hoy, Ayer, fecha)', fakeAsync(() => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const mockReadings = [
        createMockReading({ time: today.toISOString() }),
        createMockReading({ time: yesterday.toISOString() }),
        createMockReading({ time: lastWeek.toISOString() }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      expect(component.groupedReadings[0].displayDate).toBe('Hoy');
      expect(component.groupedReadings[1].displayDate).toBe('Ayer');
      expect(component.groupedReadings[2].displayDate).toBeTruthy(); // Fecha formateada
    }));
  });

  describe('10. hasActiveFilters() badge display', () => {
    it('debe mostrar badge cuando hay filtros activos', () => {
      component.filters = { status: 'all' };
      expect(component.hasActiveFilters()).toBe(false);

      component.filters = { status: 'high' as GlucoseStatus };
      expect(component.hasActiveFilters()).toBe(true);
    });
  });

  describe('11. Multiple filter combinations', () => {
    it('debe combinar múltiples filtros correctamente', fakeAsync(() => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const mockReadings = [
        createMockReading({
          time: today.toISOString(),
          value: 120,
          status: 'normal' as GlucoseStatus,
          notes: 'Ayunas',
        }),
        createMockReading({
          time: today.toISOString(),
          value: 200,
          status: 'high' as GlucoseStatus,
          notes: 'Después de comer',
        }),
        createMockReading({
          time: twoDaysAgo.toISOString(),
          value: 190,
          status: 'high' as GlucoseStatus,
          notes: 'Test antiguo',
        }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      // Combinar filtro de estado + fecha + búsqueda
      const oneDayAgo = new Date(today);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      component.filters = {
        status: 'high' as GlucoseStatus,
        startDate: oneDayAgo,
        endDate: today,
        searchTerm: 'comer',
      };
      component['applyFiltersAndGroup']();

      expect(component.filteredReadings).toHaveLength(1);
      expect(component.filteredReadings[0].notes).toBe('Después de comer');
    }));
  });

  describe('12. Empty state when no readings', () => {
    it('debe mostrar estado vacío cuando no hay lecturas', fakeAsync(() => {
      readingsSubject.next([]);
      fixture.detectChanges();
      tick(100);

      expect(component.allReadings).toHaveLength(0);
      expect(component.groupedReadings).toHaveLength(0);
      expect(component.filteredReadings).toHaveLength(0);
      expect(component.isLoading).toBe(false);
    }));

    it('debe mostrar estado vacío cuando los filtros no retornan resultados', fakeAsync(() => {
      const mockReadings = [
        createMockReading({ status: 'normal' as GlucoseStatus }),
        createMockReading({ status: 'normal' as GlucoseStatus }),
      ];

      readingsSubject.next(mockReadings);
      fixture.detectChanges();
      tick(100);

      // Filtrar por estado que no existe
      component.filters.status = 'critical-high' as GlucoseStatus;
      component['applyFiltersAndGroup']();

      expect(component.allReadings).toHaveLength(2);
      expect(component.filteredReadings).toHaveLength(0);
      expect(component.groupedReadings).toHaveLength(0);
    }));
  });

  describe('13. Loading skeleton during fetch', () => {
    it('debe mostrar estado de carga al inicializar', () => {
      expect(component.isLoading).toBe(true);

      readingsSubject.next([]);
      fixture.detectChanges();

      expect(component.isLoading).toBe(false);
    });

    it('debe manejar estado de sincronización', async () => {
      expect(component.isSyncing).toBe(false);

      vi.mocked(mockReadingsService.performFullSync).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve({ fetched: 0, pushed: 0, failed: 0 }), 100);
          })
      );

      const syncPromise = component.syncWithBackend();
      expect(component.isSyncing).toBe(true);

      await syncPromise;

      expect(component.isSyncing).toBe(false);
    });
  });

  describe('14. Error state handling', () => {
    it('debe manejar errores al cargar lecturas', fakeAsync(() => {
      // Crear un nuevo observable que emita error
      const errorReadingsSubject = new BehaviorSubject<any[]>([]);
      mockReadingsService.readings$ = throwError(() => new Error('Database error'));

      // Re-inicializar componente con observable de error
      component.ngOnInit();
      tick(100);

      // No debe crashear, debe manejar el error
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Readings',
        'Error loading readings',
        expect.any(Error)
      );
      expect(component.isLoading).toBe(false);
    }));

    it('debe mostrar toast de error al fallar sincronización manual', async () => {
      vi.mocked(mockReadingsService.performFullSync).mockRejectedValue(new Error('Network error'));

      await component.syncWithBackend();

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Sync',
        'Sync failed',
        expect.any(Error)
      );
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error al sincronizar',
          color: 'danger',
        })
      );
    });

    it('debe mostrar toast de éxito al sincronizar correctamente', async () => {
      vi.mocked(mockReadingsService.performFullSync).mockResolvedValue({
        fetched: 5,
        pushed: 3,
        failed: 0,
      });

      await component.syncWithBackend();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Sincronizados'),
          color: 'success',
        })
      );
    });
  });

  describe('15. Pagination/infinite scroll', () => {
    it('debe rastrear grupos y lecturas para rendimiento de ngFor', () => {
      const group1 = { date: '2024-01-15', displayDate: 'Hoy', readings: [] };
      const group2 = { date: '2024-01-14', displayDate: 'Ayer', readings: [] };

      expect(component.trackByGroup(0, group1)).toBe('2024-01-15');
      expect(component.trackByGroup(1, group2)).toBe('2024-01-14');
    });

    it('debe rastrear lecturas individuales por ID', () => {
      const reading1 = createMockReading({ id: 'reading-1' });
      const reading2 = createMockReading({ id: 'reading-2', localId: 'local-2' });
      const reading3 = createMockReading({});
      delete (reading3 as any).id;
      delete (reading3 as any).localId;

      expect(component.trackByReading(0, reading1)).toBe('reading-1');
      expect(component.trackByReading(1, reading2)).toBe('reading-2');
      expect(component.trackByReading(2, reading3)).toBe('2'); // Fallback a índice
    });

    it('debe poder hacer scroll al inicio', () => {
      const mockContent = {
        scrollToTop: vi.fn(),
      };
      component.content = mockContent as any;

      component.scrollToTop();

      expect(mockContent.scrollToTop).toHaveBeenCalledWith(300);
    });
  });

  describe('Additional features', () => {
    it('debe suscribirse a preferencias de usuario para unidad de glucosa', fakeAsync(() => {
      profileSubject.next({
        preferences: {
          glucoseUnit: 'mmol/L' as GlucoseUnit,
        },
      });

      component.ngOnInit();
      tick(100);

      expect(component.preferredUnit).toBe('mmol/L');
    }));

    it('debe navegar a página de agregar lectura', () => {
      component.addReading();

      expect(mockRouter.navigate).toHaveBeenCalled();
      expect(mockLoggerService.info).toHaveBeenCalledWith('UI', 'Add reading button clicked');
    });

    it('debe abrir y cerrar modal de filtros', () => {
      expect(component.isFilterModalOpen).toBe(false);

      component.openFilterModal();
      expect(component.isFilterModalOpen).toBe(true);

      component.closeFilterModal();
      expect(component.isFilterModalOpen).toBe(false);
    });

    it('debe aplicar filtros desde modal y cerrar', fakeAsync(() => {
      const newFilters = {
        status: 'high' as GlucoseStatus,
        startDate: new Date(),
        endDate: new Date(),
      };

      component.applyFilters(newFilters);

      expect(component.filters).toEqual(newFilters);
      expect(component.isFilterModalOpen).toBe(false);
    }));

    it('debe limpiar y destruir correctamente', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completespy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      // Verificar que los subjects se completen
      expect(destroySpy).toHaveBeenCalled();
      expect(completespy).toHaveBeenCalled();
    });

    it('debe prevenir sync concurrente', async () => {
      // Limpiar las llamadas previas de autoFetchFromBackend
      vi.mocked(mockReadingsService.performFullSync).mockClear();

      // Asegurar que no hay sync en progreso
      component.isSyncing = false;

      // Crear un contador manual de llamadas
      let callCount = 0;
      let resolveSync: ((value: any) => void) | null = null;
      const syncPromise = new Promise(resolve => {
        resolveSync = resolve;
      });

      // Mock que no se resuelve inmediatamente
      vi.mocked(mockReadingsService.performFullSync).mockImplementation(() => {
        callCount++;
        return syncPromise as Promise<any>;
      });

      // Llamar sync dos veces de forma inmediata (sin await)
      const sync1Promise = component.syncWithBackend();
      const sync2Promise = component.syncWithBackend();

      // El segundo debe retornar inmediatamente por el guard isSyncing
      expect(callCount).toBe(1); // Solo una llamada al servicio

      // Resolver el sync
      resolveSync!({ fetched: 0, pushed: 0, failed: 0 });
      await Promise.all([sync1Promise, sync2Promise]);

      // Verificar que solo hubo una llamada al servicio
      expect(callCount).toBe(1);
    });
  });
});
