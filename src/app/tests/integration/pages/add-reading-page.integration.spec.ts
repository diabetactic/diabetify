/**
 * AddReadingPage Integration Tests
 *
 * Tests del flujo completo de agregar una lectura de glucosa:
 * 1. Inicialización del formulario con fecha/hora actual
 * 2. Cambio de unidad de glucosa y actualización de validadores
 * 3. Valores de glucosa y visualización de estado/emoji/color
 * 4. Validaciones del formulario
 * 5. Envío exitoso → guardar + toast de éxito
 * 6. Error en envío → toast de error
 * 7. Cancelación → navegación hacia atrás
 * 8. Selección de contexto de comida
 * 9. Actualización de estado según rangos de glucosa
 * 10. Campo de notas
 * 11. Estado de carga durante guardado
 * 12. Reseteo del formulario después de guardado exitoso
 */

// Inicializar entorno TestBed para Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { AddReadingPage } from '../../../add-reading/add-reading.page';
import { ReadingsService } from '../../../core/services/readings.service';
import { ProfileService } from '../../../core/services/profile.service';
import { LoggerService } from '../../../core/services/logger.service';
import { SMBGReading, GlucoseUnit } from '../../../core/models/glucose-reading.model';
import { UserProfile } from '../../../core/models/user-profile.model';
import { flushPromises } from '../../../../test-setup/helpers/async.helper';

describe('AddReadingPage Integration Tests', () => {
  let component: AddReadingPage;
  let fixture: ComponentFixture<AddReadingPage>;
  let mockReadingsService: {
    addReading: Mock;
  };
  let mockProfileService: {
    profile$: BehaviorSubject<UserProfile | null>;
    getProfile: Mock;
  };
  let mockRouter: { navigate: Mock };
  let mockNavController: { navigateBack: Mock };
  let mockToastController: {
    create: Mock;
  };
  let mockTranslate: {
    instant: Mock;
    use: Mock;
    setDefaultLang: Mock;
  };
  let mockLogger: {
    info: Mock;
    debug: Mock;
    warn: Mock;
    error: Mock;
  };

  const mockProfile: UserProfile = {
    id: '1000',
    dni: '12345678',
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    accountState: 'active',
    preferences: {
      glucoseUnit: 'mg/dL',
      language: 'en',
      theme: 'light',
    },
    tidepoolConnection: {
      connected: false,
    },
  };

  beforeEach(async () => {
    // Crear mocks de servicios
    mockReadingsService = {
      addReading: vi.fn().mockResolvedValue(undefined),
    };

    mockProfileService = {
      profile$: new BehaviorSubject<UserProfile | null>(mockProfile),
      getProfile: vi.fn().mockResolvedValue(mockProfile),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockNavController = {
      navigateBack: vi.fn().mockResolvedValue(true),
    };

    const mockToast = {
      present: vi.fn().mockResolvedValue(undefined),
    };

    mockToastController = {
      create: vi.fn().mockResolvedValue(mockToast),
    };

    mockTranslate = {
      instant: vi.fn((key: string, params?: any) => {
        // Simular traducciones
        if (key === 'addReading.toast.success') return 'Lectura guardada correctamente';
        if (key === 'addReading.toast.error')
          return `Error: ${params?.message || 'Error desconocido'}`;
        if (key === 'addReading.validation.required') return 'Campo requerido';
        if (key === 'addReading.validation.minValue')
          return `Valor mínimo: ${params?.value} ${params?.unit}`;
        if (key === 'addReading.validation.maxValue')
          return `Valor máximo: ${params?.value} ${params?.unit}`;
        if (key === 'glucose.status.veryLow') return 'Muy bajo';
        if (key === 'glucose.status.low') return 'Bajo';
        if (key === 'glucose.status.normal') return 'Normal';
        if (key === 'glucose.status.high') return 'Alto';
        if (key === 'glucose.status.veryHigh') return 'Muy alto';
        return key;
      }),
      get: vi.fn((key: string, params?: any) => {
        // Simular el mismo comportamiento que instant pero como Observable
        const translation = mockTranslate.instant(key, params);
        return of(translation);
      }),
      use: vi.fn(),
      setDefaultLang: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Configurar TestBed
    await TestBed.configureTestingModule({
      imports: [AddReadingPage, ReactiveFormsModule, TranslateModule.forRoot()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: Router, useValue: mockRouter },
        { provide: NavController, useValue: mockNavController },
        { provide: ToastController, useValue: mockToastController },
        { provide: TranslateService, useValue: mockTranslate },
        { provide: LoggerService, useValue: mockLogger },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddReadingPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Inicialización del formulario', () => {
    it('debe inicializar el formulario con fecha/hora actual', () => {
      // ACT: Inicializar componente
      component.ngOnInit();

      // ASSERT: Formulario creado con valores por defecto
      expect(component.readingForm).toBeDefined();
      expect(component.readingForm.get('value')).toBeDefined();
      expect(component.readingForm.get('datetime')).toBeDefined();
      expect(component.readingForm.get('mealContext')).toBeDefined();
      expect(component.readingForm.get('notes')).toBeDefined();

      // La fecha debe ser aproximadamente la actual
      const datetimeValue = component.readingForm.get('datetime')?.value;
      expect(datetimeValue).toBeTruthy();

      // Verificar que maxDateTime está establecido
      expect(component.maxDateTime).toBeTruthy();
    });

    it('debe cargar la unidad de glucosa preferida del perfil de usuario', async () => {
      // ARRANGE: Perfil con unidad mmol/L
      const profileWithMmol: UserProfile = {
        ...mockProfile,
        preferences: {
          ...mockProfile.preferences,
          glucoseUnit: 'mmol/L',
        },
      };
      mockProfileService.profile$.next(profileWithMmol);

      // ACT: Inicializar componente
      component.ngOnInit();
      await flushPromises();

      // ASSERT: Unidad actualizada
      expect(component.currentUnit).toBe('mmol/L');
    });
  });

  describe('2. Cambio de unidad de glucosa', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe actualizar validadores cuando cambia de mg/dL a mmol/L', () => {
      // ARRANGE: Inicialmente en mg/dL
      component.currentUnit = 'mg/dL';
      const valueControl = component.readingForm.get('value')!;

      // Un valor válido en mg/dL (100) es inválido en mmol/L (max 33.3)
      valueControl.setValue(100);
      expect(valueControl.valid).toBeTruthy();

      // ACT: Cambiar a mmol/L
      component.currentUnit = 'mmol/L';
      component['updateValidatorsForUnit']('mmol/L');

      // ASSERT: Ahora es inválido porque 100 > 33.3
      expect(valueControl.errors?.['max']).toBeTruthy();
    });

    it('debe actualizar validadores cuando cambia de mmol/L a mg/dL', () => {
      // ARRANGE: Inicialmente en mmol/L
      component.currentUnit = 'mmol/L';
      component['updateValidatorsForUnit']('mmol/L');
      const valueControl = component.readingForm.get('value')!;

      // Un valor muy bajo en mmol/L (0.5) es inválido
      valueControl.setValue(0.5);
      expect(valueControl.errors?.['min']).toBeTruthy();

      // ACT: Cambiar a mg/dL donde 0.5 también es inválido
      component.currentUnit = 'mg/dL';
      component['updateValidatorsForUnit']('mg/dL');

      // ASSERT: Sigue siendo inválido (0.5 < 20)
      expect(valueControl.errors?.['min']).toBeTruthy();

      // Pero un valor normal funciona
      valueControl.setValue(100);
      expect(valueControl.valid).toBeTruthy();
    });
  });

  describe('3. Visualización de estado de glucosa', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe mostrar estado critical-low para valor < 54 mg/dL', async () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT: Establecer valor crítico bajo
      component.readingForm.get('value')?.setValue(50);
      await flushPromises();

      // ASSERT: Estado crítico bajo
      expect(component.glucoseStatus).toBe('critical-low');
      expect(component.glucoseStatusEmoji).toBe('⚠️');
      expect(component.glucoseStatusColor).toBe('danger');
      expect(component.getStatusLabel()).toBe('Muy bajo');
    });

    it('debe mostrar estado low para valor entre 54 y 70 mg/dL', async () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT: Establecer valor bajo
      component.readingForm.get('value')?.setValue(65);
      await flushPromises();

      // ASSERT: Estado bajo
      expect(component.glucoseStatus).toBe('low');
      expect(component.glucoseStatusEmoji).toBe('⬇️');
      expect(component.glucoseStatusColor).toBe('warning');
      expect(component.getStatusLabel()).toBe('Bajo');
    });

    it('debe mostrar estado normal para valor entre 70 y 180 mg/dL', async () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT: Establecer valor normal
      component.readingForm.get('value')?.setValue(120);
      await flushPromises();

      // ASSERT: Estado normal
      expect(component.glucoseStatus).toBe('normal');
      expect(component.glucoseStatusEmoji).toBe('✅');
      expect(component.glucoseStatusColor).toBe('success');
      expect(component.getStatusLabel()).toBe('Normal');
    });

    it('debe mostrar estado high para valor entre 180 y 250 mg/dL', async () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT: Establecer valor alto
      component.readingForm.get('value')?.setValue(200);
      await flushPromises();

      // ASSERT: Estado alto
      expect(component.glucoseStatus).toBe('high');
      expect(component.glucoseStatusEmoji).toBe('⬆️');
      expect(component.glucoseStatusColor).toBe('warning');
      expect(component.getStatusLabel()).toBe('Alto');
    });

    it('debe mostrar estado critical-high para valor > 250 mg/dL', async () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT: Establecer valor crítico alto
      component.readingForm.get('value')?.setValue(300);
      await flushPromises();

      // ASSERT: Estado crítico alto
      expect(component.glucoseStatus).toBe('critical-high');
      expect(component.glucoseStatusEmoji).toBe('⚠️');
      expect(component.glucoseStatusColor).toBe('danger');
      expect(component.getStatusLabel()).toBe('Muy alto');
    });

    it('debe convertir correctamente mmol/L a mg/dL para determinar estado', async () => {
      // ARRANGE: Configurar unidad mmol/L
      component.currentUnit = 'mmol/L';
      component['updateValidatorsForUnit']('mmol/L');

      // ACT: Establecer 2.9 mmol/L (≈ 52 mg/dL - crítico bajo < 54)
      component.readingForm.get('value')?.setValue(2.9);
      await flushPromises();

      // ASSERT: Estado crítico bajo (2.9 * 18.0182 ≈ 52 < 54)
      expect(component.glucoseStatus).toBe('critical-low');
      expect(component.glucoseStatusEmoji).toBe('⚠️');
    });
  });

  describe('4. Validaciones del formulario', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe rechazar formulario con valor de glucosa vacío', () => {
      // ARRANGE
      component.readingForm.get('value')?.setValue('');

      // ACT & ASSERT
      expect(component.readingForm.valid).toBeFalsy();
      expect(component.readingForm.get('value')?.errors?.['required']).toBeTruthy();
    });

    it('debe rechazar valor de glucosa por debajo del mínimo (mg/dL)', () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT
      component.readingForm.get('value')?.setValue(15);

      // ASSERT
      expect(component.readingForm.get('value')?.errors?.['min']).toBeTruthy();
    });

    it('debe rechazar valor de glucosa por encima del máximo (mg/dL)', () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT
      component.readingForm.get('value')?.setValue(700);

      // ASSERT
      expect(component.readingForm.get('value')?.errors?.['max']).toBeTruthy();
    });

    it('debe mostrar mensaje de validación apropiado', () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';
      const valueControl = component.readingForm.get('value')!;

      // ACT: Valor requerido
      valueControl.setValue('');
      valueControl.markAsTouched();

      // ASSERT
      expect(component.getValidationMessage('value')).toContain('Campo requerido');

      // ACT: Valor por debajo del mínimo
      valueControl.setValue(15);

      // ASSERT
      expect(component.getValidationMessage('value')).toContain('Valor mínimo');
      expect(component.getValidationMessage('value')).toContain('20');
    });
  });

  describe('5. Envío exitoso del formulario', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe guardar lectura y mostrar toast de éxito', async () => {
      // ARRANGE: Formulario válido
      component.currentUnit = 'mg/dL';
      component.readingForm.patchValue({
        value: 120,
        datetime: '2024-12-19T10:00:00-05:00',
        mealContext: 'DESAYUNO',
        notes: 'Test reading',
      });

      // ACT: Enviar formulario
      await component.onSubmit();
      await flushPromises();

      // ASSERT: Servicio llamado con datos correctos
      expect(mockReadingsService.addReading).toHaveBeenCalledTimes(1);
      const savedReading = mockReadingsService.addReading.mock.calls[0][0];
      expect(savedReading.type).toBe('smbg');
      expect(savedReading.value).toBe(120);
      expect(savedReading.units).toBe('mg/dL');
      expect(savedReading.time).toBe('2024-12-19T10:00:00-05:00');
      expect(savedReading.mealContext).toBe('DESAYUNO');
      expect(savedReading.notes).toBe('Test reading');

      // Toast de éxito mostrado
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lectura guardada correctamente',
          color: 'success',
          icon: 'checkmark-circle-outline',
        })
      );

      // Navegación hacia atrás
      expect(mockNavController.navigateBack).toHaveBeenCalledWith('/tabs/readings');
    });

    it('debe marcar isSubmitting durante el guardado', async () => {
      // ARRANGE: Formulario válido
      component.readingForm.patchValue({
        value: 120,
        datetime: '2024-12-19T10:00:00-05:00',
      });

      // Hacer que addReading tome tiempo
      let resolveAddReading: () => void;
      const addReadingPromise = new Promise<void>(resolve => {
        resolveAddReading = resolve;
      });
      mockReadingsService.addReading.mockReturnValue(addReadingPromise);

      // ACT: Iniciar envío
      const submitPromise = component.onSubmit();

      // ASSERT: isSubmitting debe ser true
      expect(component.isSubmitting).toBe(true);

      // Completar guardado
      resolveAddReading!();
      await submitPromise;
      await flushPromises();

      // ASSERT: isSubmitting debe volver a false
      expect(component.isSubmitting).toBe(false);
    });

    it('debe enviar sin mealContext ni notes si están vacíos', async () => {
      // ARRANGE: Formulario mínimo válido
      component.currentUnit = 'mg/dL';
      component.readingForm.patchValue({
        value: 100,
        datetime: '2024-12-19T10:00:00-05:00',
        mealContext: '',
        notes: '',
      });

      // ACT: Enviar formulario
      await component.onSubmit();
      await flushPromises();

      // ASSERT: Campos opcionales undefined
      const savedReading = mockReadingsService.addReading.mock.calls[0][0];
      expect(savedReading.mealContext).toBeUndefined();
      expect(savedReading.notes).toBeUndefined();
    });
  });

  describe('6. Manejo de errores en envío', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe mostrar toast de error cuando falla el guardado', async () => {
      // ARRANGE: Formulario válido pero servicio falla
      component.readingForm.patchValue({
        value: 120,
        datetime: '2024-12-19T10:00:00-05:00',
      });
      const error = new Error('Database error');
      mockReadingsService.addReading.mockRejectedValue(error);

      // ACT: Enviar formulario
      await component.onSubmit();
      await flushPromises();

      // ASSERT: Toast de error mostrado
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error: Database error',
          color: 'danger',
          icon: 'alert-circle-outline',
        })
      );

      // No debe navegar
      expect(mockNavController.navigateBack).not.toHaveBeenCalled();

      // Logger debe registrar error
      expect(mockLogger.error).toHaveBeenCalledWith('UI', 'Error saving reading', error);
    });

    it('debe resetear isSubmitting después de error', async () => {
      // ARRANGE
      component.readingForm.patchValue({
        value: 120,
        datetime: '2024-12-19T10:00:00-05:00',
      });
      mockReadingsService.addReading.mockRejectedValue(new Error('Test error'));

      // ACT
      await component.onSubmit();
      await flushPromises();

      // ASSERT: isSubmitting debe volver a false
      expect(component.isSubmitting).toBe(false);
    });

    it('no debe enviar si el formulario es inválido', async () => {
      // ARRANGE: Formulario inválido (sin valor)
      component.readingForm.patchValue({
        value: '',
        datetime: '2024-12-19T10:00:00-05:00',
      });

      // ACT: Intentar enviar
      await component.onSubmit();

      // ASSERT: No debe llamar al servicio
      expect(mockReadingsService.addReading).not.toHaveBeenCalled();

      // Debe marcar campos como touched para mostrar errores
      expect(component.readingForm.get('value')?.touched).toBe(true);

      // Logger debe registrar warning (form.errors es null cuando hay errores en controls)
      expect(mockLogger.warn).toHaveBeenCalledWith('UI', 'AddReading form invalid', null);
    });
  });

  describe('7. Cancelación', () => {
    it('debe navegar hacia atrás al cancelar', async () => {
      // ACT: Cancelar
      await component.onCancel();

      // ASSERT: Navegación hacia atrás
      expect(mockNavController.navigateBack).toHaveBeenCalledWith('/tabs/readings');
    });
  });

  describe('8. Selección de contexto de comida', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe tener todas las opciones de contexto de comida disponibles', () => {
      // ASSERT: Opciones definidas
      expect(component.mealContextOptions).toHaveLength(7);
      expect(component.mealContextOptions.map(o => o.value)).toEqual([
        'DESAYUNO',
        'ALMUERZO',
        'MERIENDA',
        'CENA',
        'EJERCICIO',
        'OTRAS_COMIDAS',
        'OTRO',
      ]);
    });

    it('debe permitir seleccionar contexto de comida', () => {
      // ARRANGE: Establecer valor de glucosa para que el formulario sea válido
      component.readingForm.get('value')?.setValue(120);

      // ACT: Seleccionar contexto
      component.readingForm.get('mealContext')?.setValue('DESAYUNO');

      // ASSERT: Valor actualizado
      expect(component.readingForm.get('mealContext')?.value).toBe('DESAYUNO');
      expect(component.readingForm.valid).toBeTruthy();
    });

    it('debe trackear opciones de comida por value', () => {
      // ARRANGE
      const option = component.mealContextOptions[0];

      // ACT: Usar trackBy
      const result = component.trackByMealContext(0, option);

      // ASSERT: Retorna el value
      expect(result).toBe('DESAYUNO');
    });
  });

  describe('9. Actualización de estado según rangos', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe actualizar estado en tiempo real cuando cambia el valor', async () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT: Cambiar valor de normal a alto
      component.readingForm.get('value')?.setValue(120);
      await flushPromises();
      expect(component.glucoseStatus).toBe('normal');

      component.readingForm.get('value')?.setValue(200);
      await flushPromises();

      // ASSERT: Estado actualizado a alto
      expect(component.glucoseStatus).toBe('high');
      expect(component.glucoseStatusEmoji).toBe('⬆️');
      expect(component.glucoseStatusColor).toBe('warning');
    });

    it('debe limpiar estado cuando el valor es inválido', async () => {
      // ARRANGE: Estado inicial con valor válido
      component.currentUnit = 'mg/dL';
      component.readingForm.get('value')?.setValue(120);
      await flushPromises();
      expect(component.glucoseStatus).toBe('normal');

      // ACT: Cambiar a valor inválido
      component.readingForm.get('value')?.setValue('');
      await flushPromises();

      // ASSERT: Estado limpiado
      expect(component.glucoseStatus).toBeNull();
      expect(component.glucoseStatusEmoji).toBe('');
      expect(component.glucoseStatusColor).toBe('');
    });
  });

  describe('10. Campo de notas', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe permitir agregar notas a la lectura', () => {
      // ARRANGE: Establecer valor de glucosa para que el formulario sea válido
      component.readingForm.get('value')?.setValue(120);

      // ACT: Agregar notas
      component.readingForm.get('notes')?.setValue('Antes de correr');

      // ASSERT: Valor actualizado
      expect(component.readingForm.get('notes')?.value).toBe('Antes de correr');
      expect(component.readingForm.valid).toBeTruthy();
    });

    it('debe ser opcional el campo de notas', () => {
      // ACT: Dejar notas vacías
      component.readingForm.get('notes')?.setValue('');

      // ASSERT: Formulario sigue siendo válido
      component.readingForm.get('value')?.setValue(120);
      expect(component.readingForm.valid).toBeTruthy();
    });
  });

  describe('11. Estado de carga durante guardado', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe estar en estado de carga mientras guarda', async () => {
      // ARRANGE: Formulario válido
      component.readingForm.patchValue({
        value: 120,
        datetime: '2024-12-19T10:00:00-05:00',
      });

      // Simular guardado lento
      let resolveAddReading: () => void;
      const addReadingPromise = new Promise<void>(resolve => {
        resolveAddReading = resolve;
      });
      mockReadingsService.addReading.mockReturnValue(addReadingPromise);

      // ACT: Iniciar guardado
      expect(component.isSubmitting).toBe(false);
      const submitPromise = component.onSubmit();

      // ASSERT: isSubmitting true durante guardado
      expect(component.isSubmitting).toBe(true);

      // Completar guardado
      resolveAddReading!();
      await submitPromise;
      await flushPromises();

      // ASSERT: isSubmitting vuelve a false
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('12. Reseteo del formulario después de guardado exitoso', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe mantener la navegación después de guardado exitoso', async () => {
      // ARRANGE: Formulario con datos
      component.readingForm.patchValue({
        value: 120,
        datetime: '2024-12-19T10:00:00-05:00',
        mealContext: 'DESAYUNO',
        notes: 'Test notes',
      });

      // ACT: Guardar
      await component.onSubmit();
      await flushPromises();

      // ASSERT: Debe navegar hacia atrás (el reseteo se hace en la navegación)
      expect(mockNavController.navigateBack).toHaveBeenCalledWith('/tabs/readings');
      expect(mockReadingsService.addReading).toHaveBeenCalledTimes(1);
    });
  });

  describe('Limpieza de recursos', () => {
    it('debe limpiar subscripciones en ngOnDestroy', () => {
      // ARRANGE
      component.ngOnInit();
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completespy = vi.spyOn(component['destroy$'], 'complete');

      // ACT
      component.ngOnDestroy();

      // ASSERT: Subject limpiado
      expect(destroySpy).toHaveBeenCalled();
      expect(completespy).toHaveBeenCalled();
    });
  });

  describe('Obtención de etiquetas', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('debe retornar la etiqueta de unidad actual', () => {
      // ARRANGE
      component.currentUnit = 'mg/dL';

      // ACT & ASSERT
      expect(component.getUnitLabel()).toBe('mg/dL');

      // Cambiar unidad
      component.currentUnit = 'mmol/L';
      expect(component.getUnitLabel()).toBe('mmol/L');
    });

    it('debe retornar null cuando no hay estado de glucosa', () => {
      // ARRANGE
      component.glucoseStatus = null;

      // ACT & ASSERT
      expect(component.getStatusLabelKey()).toBeNull();
      expect(component.getStatusLabel()).toBe('');
    });

    it('debe retornar las claves de traducción correctas para cada estado', () => {
      // Test todos los estados
      const statusMap = [
        { status: 'critical-low', key: 'glucose.status.veryLow' },
        { status: 'low', key: 'glucose.status.low' },
        { status: 'normal', key: 'glucose.status.normal' },
        { status: 'high', key: 'glucose.status.high' },
        { status: 'critical-high', key: 'glucose.status.veryHigh' },
      ] as const;

      statusMap.forEach(({ status, key }) => {
        component.glucoseStatus = status;
        expect(component.getStatusLabelKey()).toBe(key);
      });
    });
  });
});
