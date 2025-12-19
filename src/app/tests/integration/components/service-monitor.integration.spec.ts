/**
 * Integration Tests - ServiceMonitorComponent
 *
 * Tests de integración completos para el componente de monitoreo de servicios.
 * Verifica la interacción con ExternalServicesManager, estados del circuit breaker,
 * verificaciones de salud, y funcionalidad de UI.
 */

import '../../../../test-setup';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';

import { ServiceMonitorComponent } from '../../../shared/components/service-monitor/service-monitor.component';
import {
  ExternalServicesManager,
  ExternalService,
  ExternalServicesState,
  ServiceHealthCheck,
  CircuitBreakerState,
  HealthStatus,
} from '../../../core/services/external-services-manager.service';
import {
  ServiceOrchestrator,
  WorkflowState,
} from '../../../core/services/service-orchestrator.service';
import { LoggerService } from '../../../core/services/logger.service';
import { TranslateModule } from '@ngx-translate/core';

describe('ServiceMonitorComponent - Integration Tests', () => {
  let component: ServiceMonitorComponent;
  let fixture: ComponentFixture<ServiceMonitorComponent>;
  let mockExternalServicesManager: Partial<ExternalServicesManager>;
  let mockServiceOrchestrator: Partial<ServiceOrchestrator>;
  let mockLoggerService: Partial<LoggerService>;
  let stateSubject: BehaviorSubject<ExternalServicesState>;

  // Estado inicial de los servicios
  const initialState: ExternalServicesState = {
    isOnline: true,
    services: new Map<ExternalService, ServiceHealthCheck>(),
    circuitBreakers: new Map<ExternalService, CircuitBreakerState>(),
    overallHealth: HealthStatus.UNKNOWN,
  };

  // Servicios de ejemplo para testing
  const healthyService: ServiceHealthCheck = {
    service: ExternalService.GLUCOSERVER,
    status: HealthStatus.HEALTHY,
    responseTime: 150,
    lastChecked: new Date(),
    message: 'Service operational',
  };

  const degradedService: ServiceHealthCheck = {
    service: ExternalService.TIDEPOOL,
    status: HealthStatus.DEGRADED,
    responseTime: 3000,
    lastChecked: new Date(),
    message: 'Slow response time',
  };

  const unhealthyService: ServiceHealthCheck = {
    service: ExternalService.APPOINTMENTS,
    status: HealthStatus.UNHEALTHY,
    responseTime: undefined,
    lastChecked: new Date(),
    message: 'Connection timeout',
  };

  const closedCircuitBreaker: CircuitBreakerState = {
    service: ExternalService.GLUCOSERVER,
    state: 'CLOSED',
    failureCount: 0,
  };

  const openCircuitBreaker: CircuitBreakerState = {
    service: ExternalService.APPOINTMENTS,
    state: 'OPEN',
    failureCount: 5,
    lastFailureTime: new Date(),
    nextAttemptTime: new Date(Date.now() + 30000),
  };

  const halfOpenCircuitBreaker: CircuitBreakerState = {
    service: ExternalService.TIDEPOOL,
    state: 'HALF_OPEN',
    failureCount: 3,
    lastFailureTime: new Date(),
  };

  // Workflows de ejemplo
  const activeWorkflow: WorkflowState = {
    id: 'workflow-1',
    name: 'Sync Readings',
    status: 'running',
    startTime: new Date(Date.now() - 5000),
    steps: [
      { id: 'step-1', name: 'Fetch data', status: 'completed', timestamp: new Date() },
      { id: 'step-2', name: 'Process data', status: 'running', timestamp: new Date() },
      { id: 'step-3', name: 'Upload data', status: 'pending', timestamp: new Date() },
    ],
  };

  const completedWorkflow: WorkflowState = {
    id: 'workflow-2',
    name: 'Profile Update',
    status: 'completed',
    startTime: new Date(Date.now() - 10000),
    endTime: new Date(Date.now() - 2000),
    steps: [
      { id: 'step-1', name: 'Validate', status: 'completed', timestamp: new Date() },
      { id: 'step-2', name: 'Update', status: 'completed', timestamp: new Date() },
    ],
  };

  beforeEach(async () => {
    // Inicializar BehaviorSubject con estado inicial
    stateSubject = new BehaviorSubject<ExternalServicesState>(initialState);

    // Mock de ExternalServicesManager
    mockExternalServicesManager = {
      state: stateSubject.asObservable(),
      performHealthCheck: vi.fn().mockResolvedValue(new Map()),
      checkService: vi.fn().mockResolvedValue(healthyService),
      resetCircuitBreaker: vi.fn(),
      clearCache: vi.fn(),
      getServiceConfig: vi.fn().mockReturnValue({
        name: 'Test Service',
        baseUrl: 'http://test.com',
        timeout: 5000,
        retryAttempts: 3,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 30000,
        offlineSupport: true,
      }),
    };

    // Mock de ServiceOrchestrator
    mockServiceOrchestrator = {
      getActiveWorkflows: vi.fn().mockReturnValue([]),
      getCompletedWorkflows: vi.fn().mockReturnValue([]),
    };

    // Mock de LoggerService
    mockLoggerService = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ServiceMonitorComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ExternalServicesManager, useValue: mockExternalServicesManager },
        { provide: ServiceOrchestrator, useValue: mockServiceOrchestrator },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceMonitorComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('1. Subscribe to ExternalServicesManager.state', () => {
    it('debe suscribirse al estado y actualizar servicios', fakeAsync(() => {
      // Emitir nuevo estado con servicios
      const newState: ExternalServicesState = {
        ...initialState,
        services: new Map([
          [ExternalService.GLUCOSERVER, healthyService],
          [ExternalService.TIDEPOOL, degradedService],
        ]),
        circuitBreakers: new Map([
          [ExternalService.GLUCOSERVER, closedCircuitBreaker],
          [ExternalService.TIDEPOOL, halfOpenCircuitBreaker],
        ]),
        overallHealth: HealthStatus.DEGRADED,
      };

      fixture.detectChanges();
      tick();

      stateSubject.next(newState);
      tick();

      expect(component.servicesState).toEqual(newState);
      expect(component.services).toHaveLength(2);
      expect(component.circuitBreakers).toHaveLength(2);
    }));

    it('debe actualizar el estado cuando cambian los servicios', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Primera actualización
      stateSubject.next({
        ...initialState,
        services: new Map([[ExternalService.GLUCOSERVER, healthyService]]),
      });
      tick();

      expect(component.services).toHaveLength(1);

      // Segunda actualización con más servicios
      stateSubject.next({
        ...initialState,
        services: new Map([
          [ExternalService.GLUCOSERVER, healthyService],
          [ExternalService.TIDEPOOL, degradedService],
          [ExternalService.APPOINTMENTS, unhealthyService],
        ]),
      });
      tick();

      expect(component.services).toHaveLength(3);
    }));
  });

  describe('2. Circuit breaker states display', () => {
    it('debe mostrar correctamente los estados CLOSED, OPEN, y HALF_OPEN', fakeAsync(() => {
      const stateWithCircuitBreakers: ExternalServicesState = {
        ...initialState,
        circuitBreakers: new Map([
          [ExternalService.GLUCOSERVER, closedCircuitBreaker],
          [ExternalService.APPOINTMENTS, openCircuitBreaker],
          [ExternalService.TIDEPOOL, halfOpenCircuitBreaker],
        ]),
      };

      fixture.detectChanges();
      tick();

      stateSubject.next(stateWithCircuitBreakers);
      tick();
      fixture.detectChanges();

      expect(component.circuitBreakers).toHaveLength(3);
      expect(component.circuitBreakers[0].state).toBe('CLOSED');
      expect(component.circuitBreakers[1].state).toBe('OPEN');
      expect(component.circuitBreakers[2].state).toBe('HALF_OPEN');
    }));

    it('debe usar colores correctos para cada estado del circuit breaker', () => {
      expect(component.circuitBreakerColors['CLOSED']).toBe('#4CAF50');
      expect(component.circuitBreakerColors['OPEN']).toBe('#F44336');
      expect(component.circuitBreakerColors['HALF_OPEN']).toBe('#FF9800');
    });
  });

  describe('3. Health checks on demand', () => {
    it('debe realizar verificación de salud de todos los servicios', async () => {
      fixture.detectChanges();

      await component.checkAllServices();

      expect(mockExternalServicesManager.performHealthCheck).toHaveBeenCalled();
      expect(mockServiceOrchestrator.getActiveWorkflows).toHaveBeenCalled();
      expect(mockServiceOrchestrator.getCompletedWorkflows).toHaveBeenCalled();
    });

    it('debe actualizar workflows después de verificar servicios', async () => {
      vi.mocked(mockServiceOrchestrator.getActiveWorkflows).mockReturnValue([activeWorkflow]);
      vi.mocked(mockServiceOrchestrator.getCompletedWorkflows).mockReturnValue([completedWorkflow]);

      fixture.detectChanges();

      await component.checkAllServices();

      expect(component.activeWorkflows).toHaveLength(1);
      expect(component.completedWorkflows).toHaveLength(1);
    });
  });

  describe('4. Single service health check', () => {
    it('debe verificar salud de un servicio específico', async () => {
      fixture.detectChanges();

      await component.checkService(ExternalService.GLUCOSERVER);

      expect(mockExternalServicesManager.checkService).toHaveBeenCalledWith(
        ExternalService.GLUCOSERVER
      );
    });

    it('debe manejar errores al verificar un servicio', async () => {
      vi.mocked(mockExternalServicesManager.checkService).mockRejectedValue(
        new Error('Network error')
      );

      fixture.detectChanges();

      await expect(component.checkService(ExternalService.GLUCOSERVER)).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('5. Circuit breaker reset', () => {
    it('debe resetear circuit breaker y verificar el servicio', async () => {
      fixture.detectChanges();

      component.resetCircuitBreaker(ExternalService.APPOINTMENTS);

      expect(mockExternalServicesManager.resetCircuitBreaker).toHaveBeenCalledWith(
        ExternalService.APPOINTMENTS
      );
      await vi.waitFor(() => {
        expect(mockExternalServicesManager.checkService).toHaveBeenCalledWith(
          ExternalService.APPOINTMENTS
        );
      });
    });
  });

  describe('6. Cache cleared', () => {
    it('debe limpiar cache de todos los servicios', () => {
      fixture.detectChanges();

      component.clearServiceCache();

      expect(mockExternalServicesManager.clearCache).toHaveBeenCalledWith(undefined);
    });

    it('debe limpiar cache de un servicio específico', () => {
      fixture.detectChanges();

      component.clearServiceCache(ExternalService.GLUCOSERVER);

      expect(mockExternalServicesManager.clearCache).toHaveBeenCalledWith(
        ExternalService.GLUCOSERVER
      );
    });
  });

  describe('7. Auto-refresh interval', () => {
    it('debe iniciar auto-refresh cuando está habilitado', fakeAsync(() => {
      component.autoRefresh = false;
      fixture.detectChanges();

      component.toggleAutoRefresh();
      tick();

      expect(component.autoRefresh).toBe(true);

      // Avanzar el tiempo hasta el próximo refresh
      tick(component.refreshInterval);

      expect(mockExternalServicesManager.performHealthCheck).toHaveBeenCalled();
    }));

    it('debe detener auto-refresh cuando se deshabilita', fakeAsync(() => {
      component.autoRefresh = false;
      fixture.detectChanges();

      // Habilitar
      component.toggleAutoRefresh();
      expect(component.autoRefresh).toBe(true);

      // Deshabilitar
      component.toggleAutoRefresh();
      expect(component.autoRefresh).toBe(false);

      // No debe llamar performHealthCheck después de deshabilitar
      vi.mocked(mockExternalServicesManager.performHealthCheck).mockClear();
      tick(component.refreshInterval * 2);

      expect(mockExternalServicesManager.performHealthCheck).not.toHaveBeenCalled();
    }));

    it('debe limpiar subscription de auto-refresh al destruir componente', fakeAsync(() => {
      component.autoRefresh = false;
      fixture.detectChanges();

      component.toggleAutoRefresh();
      tick();

      expect(component.autoRefresh).toBe(true);

      component.ngOnDestroy();
      tick();

      // No debe continuar llamando después de destroy
      vi.mocked(mockExternalServicesManager.performHealthCheck).mockClear();
      tick(component.refreshInterval);

      expect(mockExternalServicesManager.performHealthCheck).not.toHaveBeenCalled();
    }));
  });

  describe('8. Workflow durations calculated', () => {
    it('debe calcular duración de workflow activo correctamente', fakeAsync(() => {
      const workflow: WorkflowState = {
        id: 'test',
        name: 'Test',
        status: 'running',
        startTime: new Date(Date.now() - 5000), // 5 segundos atrás
      };

      const duration = component.getWorkflowDuration(workflow);

      // Debe mostrar algo como "5.0s"
      expect(duration).toContain('s');
      expect(duration).not.toBe('N/A');
    }));

    it('debe calcular duración de workflow completado', () => {
      const workflow: WorkflowState = {
        id: 'test',
        name: 'Test',
        status: 'completed',
        startTime: new Date(Date.now() - 10000),
        endTime: new Date(Date.now() - 2000),
      };

      const duration = component.getWorkflowDuration(workflow);

      // Duración de 8 segundos
      expect(duration).toContain('s');
    });

    it('debe retornar N/A si no hay startTime', () => {
      const workflow: WorkflowState = {
        id: 'test',
        name: 'Test',
        status: 'pending',
      };

      const duration = component.getWorkflowDuration(workflow);

      expect(duration).toBe('N/A');
    });

    it('debe formatear duraciones en milisegundos, segundos y minutos', () => {
      // Menos de 1 segundo
      expect(component.formatDuration(500)).toBe('500ms');

      // Entre 1 y 60 segundos
      expect(component.formatDuration(5000)).toBe('5.0s');

      // Más de 60 segundos
      expect(component.formatDuration(120000)).toBe('2.0m');
    });
  });

  describe('9. Service status icons/colors', () => {
    it('debe usar iconos correctos para cada estado de salud', () => {
      expect(component.statusIcons[HealthStatus.HEALTHY]).toBe('checkmark-circle');
      expect(component.statusIcons[HealthStatus.DEGRADED]).toBe('warning');
      expect(component.statusIcons[HealthStatus.UNHEALTHY]).toBe('close-circle');
      expect(component.statusIcons[HealthStatus.CHECKING]).toBe('reload');
      expect(component.statusIcons[HealthStatus.UNKNOWN]).toBe('help-circle');
    });

    it('debe usar colores correctos para cada estado de salud', () => {
      expect(component.statusColors[HealthStatus.HEALTHY]).toBe('#4CAF50');
      expect(component.statusColors[HealthStatus.DEGRADED]).toBe('#FF9800');
      expect(component.statusColors[HealthStatus.UNHEALTHY]).toBe('#F44336');
      expect(component.statusColors[HealthStatus.CHECKING]).toBe('#2196F3');
      expect(component.statusColors[HealthStatus.UNKNOWN]).toBe('#9E9E9E');
    });
  });

  describe('10. Cleanup on destroy', () => {
    it('debe desuscribirse de state subscription', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const subscriptionSpy = vi.spyOn(component['subscriptions'], 'unsubscribe');

      component.ngOnDestroy();

      expect(subscriptionSpy).toHaveBeenCalled();
    }));

    it('debe detener auto-refresh al destruir', fakeAsync(() => {
      component.autoRefresh = false;
      fixture.detectChanges();

      component.toggleAutoRefresh();
      tick();

      const stopAutoRefreshSpy = vi.spyOn(component, 'stopAutoRefresh');

      component.ngOnDestroy();

      expect(stopAutoRefreshSpy).toHaveBeenCalled();
    }));
  });

  describe('11. Loading state', () => {
    it('debe cargar workflows en ngOnInit', fakeAsync(() => {
      vi.mocked(mockServiceOrchestrator.getActiveWorkflows).mockReturnValue([activeWorkflow]);
      vi.mocked(mockServiceOrchestrator.getCompletedWorkflows).mockReturnValue([completedWorkflow]);

      fixture.detectChanges();
      tick();

      expect(component.activeWorkflows).toHaveLength(1);
      expect(component.completedWorkflows).toHaveLength(1);
    }));

    it('debe inicializar estado vacío correctamente', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.servicesState).toEqual(initialState);
      expect(component.services).toEqual([]);
      expect(component.circuitBreakers).toEqual([]);
    }));
  });

  describe('12. Error state', () => {
    it('debe manejar servicios unhealthy correctamente', fakeAsync(() => {
      const errorState: ExternalServicesState = {
        ...initialState,
        services: new Map([[ExternalService.APPOINTMENTS, unhealthyService]]),
        overallHealth: HealthStatus.UNHEALTHY,
      };

      fixture.detectChanges();
      tick();

      stateSubject.next(errorState);
      tick();

      expect(component.servicesState?.overallHealth).toBe(HealthStatus.UNHEALTHY);
      expect(component.services[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(component.services[0].message).toBe('Connection timeout');
    }));

    it('debe mostrar mensaje de error en servicio unhealthy', fakeAsync(() => {
      const serviceWithError: ServiceHealthCheck = {
        ...unhealthyService,
        message: 'Failed to connect',
      };

      const errorState: ExternalServicesState = {
        ...initialState,
        services: new Map([[ExternalService.APPOINTMENTS, serviceWithError]]),
      };

      fixture.detectChanges();
      tick();

      stateSubject.next(errorState);
      tick();

      expect(component.services[0].message).toBe('Failed to connect');
    }));
  });

  describe('13. Service list rendering', () => {
    it('debe renderizar lista de servicios correctamente', fakeAsync(() => {
      const multiServiceState: ExternalServicesState = {
        ...initialState,
        services: new Map([
          [ExternalService.GLUCOSERVER, healthyService],
          [ExternalService.TIDEPOOL, degradedService],
          [ExternalService.APPOINTMENTS, unhealthyService],
        ]),
      };

      fixture.detectChanges();
      tick();

      stateSubject.next(multiServiceState);
      tick();
      fixture.detectChanges();

      expect(component.services).toHaveLength(3);
      expect(component.services[0].service).toBe(ExternalService.GLUCOSERVER);
      expect(component.services[1].service).toBe(ExternalService.TIDEPOOL);
      expect(component.services[2].service).toBe(ExternalService.APPOINTMENTS);
    }));

    it('debe obtener configuración de servicio correctamente', () => {
      fixture.detectChanges();

      const config = component.getServiceConfig(ExternalService.GLUCOSERVER);

      expect(mockExternalServicesManager.getServiceConfig).toHaveBeenCalledWith(
        ExternalService.GLUCOSERVER
      );
      expect(config?.name).toBe('Test Service');
    });

    it('debe obtener nombre de servicio correctamente', () => {
      fixture.detectChanges();

      const name = component.getServiceName(ExternalService.GLUCOSERVER);

      expect(mockExternalServicesManager.getServiceConfig).toHaveBeenCalledWith(
        ExternalService.GLUCOSERVER
      );
      expect(name).toBe('Test Service');
    });
  });

  describe('14. Expand/collapse details', () => {
    it('debe mostrar detalles de servicio seleccionado', () => {
      fixture.detectChanges();

      expect(component.showDetails).toBe(false);
      expect(component.selectedService).toBeNull();

      component.showServiceDetails(ExternalService.GLUCOSERVER);

      expect(component.showDetails).toBe(true);
      expect(component.selectedService).toBe(ExternalService.GLUCOSERVER);
    });

    it('debe ocultar detalles al cerrar', () => {
      fixture.detectChanges();

      component.showServiceDetails(ExternalService.GLUCOSERVER);
      expect(component.showDetails).toBe(true);

      component.hideServiceDetails();

      expect(component.showDetails).toBe(false);
      expect(component.selectedService).toBeNull();
    });

    it('debe cambiar servicio seleccionado al expandir otro', () => {
      fixture.detectChanges();

      component.showServiceDetails(ExternalService.GLUCOSERVER);
      expect(component.selectedService).toBe(ExternalService.GLUCOSERVER);

      component.showServiceDetails(ExternalService.TIDEPOOL);
      expect(component.selectedService).toBe(ExternalService.TIDEPOOL);
    });
  });

  describe('15. Manual refresh button', () => {
    it('debe refrescar todos los servicios manualmente', async () => {
      fixture.detectChanges();

      vi.mocked(mockExternalServicesManager.performHealthCheck).mockClear();

      await component.checkAllServices();

      expect(mockExternalServicesManager.performHealthCheck).toHaveBeenCalledTimes(1);
    });

    it('debe actualizar workflows al refrescar manualmente', async () => {
      const updatedActiveWorkflow: WorkflowState = {
        ...activeWorkflow,
        status: 'completed',
        endTime: new Date(),
      };

      vi.mocked(mockServiceOrchestrator.getActiveWorkflows).mockReturnValue([]);
      vi.mocked(mockServiceOrchestrator.getCompletedWorkflows).mockReturnValue([
        completedWorkflow,
        updatedActiveWorkflow,
      ]);

      fixture.detectChanges();

      await component.checkAllServices();

      expect(component.activeWorkflows).toHaveLength(0);
      expect(component.completedWorkflows).toHaveLength(2);
    });
  });

  describe('Workflow progress calculation', () => {
    it('debe calcular progreso de workflow correctamente', () => {
      const workflow: WorkflowState = {
        id: 'test',
        name: 'Test',
        status: 'running',
        steps: [
          { id: 'step-1', name: 'Step 1', status: 'completed', timestamp: new Date() },
          { id: 'step-2', name: 'Step 2', status: 'completed', timestamp: new Date() },
          { id: 'step-3', name: 'Step 3', status: 'running', timestamp: new Date() },
          { id: 'step-4', name: 'Step 4', status: 'pending', timestamp: new Date() },
        ],
      };

      const progress = component.getWorkflowProgress(workflow);

      // 2 de 4 pasos completados = 50%
      expect(progress).toBe(50);
    });

    it('debe retornar 0 si workflow no tiene pasos', () => {
      const workflow: WorkflowState = {
        id: 'test',
        name: 'Test',
        status: 'pending',
      };

      const progress = component.getWorkflowProgress(workflow);

      expect(progress).toBe(0);
    });
  });

  describe('Date and time formatting', () => {
    it('debe formatear fechas correctamente', () => {
      const testDate = new Date('2024-01-15T10:30:00');

      const formatted = component.formatDate(testDate);

      expect(formatted).not.toBe('N/A');
      expect(formatted).toContain('2024');
    });

    it('debe retornar N/A para fechas undefined', () => {
      const formatted = component.formatDate(undefined);

      expect(formatted).toBe('N/A');
    });
  });

  describe('TrackBy functions', () => {
    it('debe trackear servicios por service', () => {
      const result = component.trackByService(0, healthyService);

      expect(result).toBe(ExternalService.GLUCOSERVER);
    });

    it('debe trackear circuit breakers por service', () => {
      const result = component.trackByCircuitBreaker(0, closedCircuitBreaker);

      expect(result).toBe(ExternalService.GLUCOSERVER);
    });

    it('debe trackear workflows por id', () => {
      const result = component.trackByWorkflow(0, activeWorkflow);

      expect(result).toBe('workflow-1');
    });
  });
});
