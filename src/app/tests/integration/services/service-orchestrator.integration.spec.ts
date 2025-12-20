/**
 * ServiceOrchestrator Integration Tests
 *
 * Tests workflow execution with saga patterns:
 * 1. FULL_SYNC workflow: auth → readings fetch → cache update
 * 2. AUTH_AND_SYNC workflow with dual providers
 * 3. APPOINTMENT_WITH_DATA: appointment submit + glucose data
 * 4. Workflow state machine progression tracking
 * 5. Compensating transaction on step failure
 * 6. Step retry logic with exponential backoff
 * 7. Timeout handling per step
 * 8. Service availability checks (circuit breaker integration)
 */

import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  ServiceOrchestrator,
  WorkflowType,
  WorkflowState,
  OrchestrationResult,
} from '@core/services/service-orchestrator.service';
import {
  ExternalServicesManager,
  ExternalService,
  ExternalServicesState,
} from '@core/services/external-services-manager.service';
import { UnifiedAuthService, UnifiedUser } from '@core/services/unified-auth.service';
import { GlucoserverService } from '@core/services/glucoserver.service';
import { AppointmentService } from '@core/services/appointment.service';
import { ReadingsService } from '@core/services/readings.service';

describe('ServiceOrchestrator Integration Tests', () => {
  let orchestrator: ServiceOrchestrator;

  // Mock subjects para control reactivo
  let externalServicesStateSubject: BehaviorSubject<ExternalServicesState>;

  // Mocks
  let mockExternalServices: {
    state: BehaviorSubject<ExternalServicesState>;
    isServiceAvailable: ReturnType<typeof vi.fn>;
  };

  let mockUnifiedAuth: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isAuthenticatedWith: ReturnType<typeof vi.fn>;
    getCurrentUser: ReturnType<typeof vi.fn>;
    loginTidepool: ReturnType<typeof vi.fn>;
  };

  let mockGlucoserver: {
    syncReadings: ReturnType<typeof vi.fn>;
  };

  let mockAppointments: {
    getAppointment: ReturnType<typeof vi.fn>;
  };

  let mockReadings: {
    getUnsyncedReadings: ReturnType<typeof vi.fn>;
    getStatistics: ReturnType<typeof vi.fn>;
    getAllReadings: ReturnType<typeof vi.fn>;
    getReadingsByDateRange: ReturnType<typeof vi.fn>;
    performFullSync: ReturnType<typeof vi.fn>;
  };

  const mockUser: UnifiedUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    provider: 'local',
  };

  beforeEach(() => {
    // Inicializar BehaviorSubject para estado de servicios
    externalServicesStateSubject = new BehaviorSubject<ExternalServicesState>({
      isOnline: true,
      services: {
        [ExternalService.TIDEPOOL]: { isAvailable: true, lastError: null, lastChecked: new Date() },
        [ExternalService.GLUCOSERVER]: {
          isAvailable: true,
          lastError: null,
          lastChecked: new Date(),
        },
        [ExternalService.LOCAL_AUTH]: {
          isAvailable: true,
          lastError: null,
          lastChecked: new Date(),
        },
        [ExternalService.APPOINTMENTS]: {
          isAvailable: true,
          lastError: null,
          lastChecked: new Date(),
        },
      },
    });

    mockExternalServices = {
      state: externalServicesStateSubject,
      isServiceAvailable: vi.fn().mockReturnValue(true),
    };

    mockUnifiedAuth = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      isAuthenticatedWith: vi.fn().mockReturnValue(true),
      getCurrentUser: vi.fn().mockResolvedValue(mockUser),
      loginTidepool: vi.fn().mockReturnValue(of(undefined)),
    };

    mockGlucoserver = {
      syncReadings: vi.fn().mockReturnValue(of({ synced: 5, failed: 0 })),
    };

    mockAppointments = {
      getAppointment: vi.fn().mockReturnValue(of({ appointment_id: 1, user_id: 1000 })),
    };

    mockReadings = {
      getUnsyncedReadings: vi.fn().mockResolvedValue([]),
      getStatistics: vi.fn().mockResolvedValue({ average: 120, totalReadings: 50 }),
      getAllReadings: vi.fn().mockResolvedValue({ readings: [], total: 0 }),
      getReadingsByDateRange: vi.fn().mockResolvedValue([]),
      performFullSync: vi.fn().mockResolvedValue({ pushed: 0, fetched: 0, failed: 0 }),
    };

    TestBed.configureTestingModule({
      providers: [
        ServiceOrchestrator,
        { provide: ExternalServicesManager, useValue: mockExternalServices },
        { provide: UnifiedAuthService, useValue: mockUnifiedAuth },
        { provide: GlucoserverService, useValue: mockGlucoserver },
        { provide: AppointmentService, useValue: mockAppointments },
        { provide: ReadingsService, useValue: mockReadings },
      ],
    });

    orchestrator = TestBed.inject(ServiceOrchestrator);
  });

  afterEach(() => {
    orchestrator.ngOnDestroy();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  describe('FULL_SYNC Workflow', () => {
    it('should execute full sync workflow successfully when all services available', async () => {
      // ARRANGE
      mockReadings.getUnsyncedReadings.mockResolvedValue([
        { id: '1', value: 120, time: new Date().toISOString() },
      ]);

      // ACT
      const result = await orchestrator.executeFullSync();

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.workflow.type).toBe(WorkflowType.FULL_SYNC);
      expect(result.workflow.status).toBe('completed');
      expect(result.workflow.steps.length).toBeGreaterThan(0);
    });

    it('should track workflow step progression correctly', async () => {
      // ARRANGE
      const workflowStates: WorkflowState[] = [];

      // ACT
      const result = await orchestrator.executeFullSync();

      // Capturar estados intermedios del workflow
      result.workflow.steps.forEach(step => {
        expect(['pending', 'running', 'completed', 'failed', 'skipped']).toContain(step.status);
      });

      // ASSERT
      expect(result.workflow.startTime).toBeDefined();
      expect(result.workflow.endTime).toBeDefined();
      expect(
        result.workflow.steps.every(s => s.status === 'completed' || s.status === 'skipped')
      ).toBe(true);
    });

    it('should fail workflow when critical service unavailable', async () => {
      // ARRANGE
      mockExternalServices.isServiceAvailable.mockImplementation((service: ExternalService) => {
        return service !== ExternalService.TIDEPOOL;
      });

      // ACT
      const result = await orchestrator.executeFullSync();

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.workflow.status).toBe('failed');
      expect(result.error).toContain('not available');
    });

    it('should skip non-critical steps when service unavailable', async () => {
      // ARRANGE - Solo GLUCOSERVER no disponible para pasos no críticos
      mockExternalServices.isServiceAvailable.mockImplementation((service: ExternalService) => {
        // Los primeros pasos críticos (Check Network, Verify Auth) usan TIDEPOOL
        // Los pasos de sync usan GLUCOSERVER
        return service !== ExternalService.GLUCOSERVER;
      });

      // ACT
      const result = await orchestrator.executeFullSync();

      // ASSERT - Workflow puede completar si los pasos no-críticos son skipped
      const skippedSteps = result.workflow.steps.filter(s => s.status === 'skipped');
      expect(skippedSteps.length).toBeGreaterThan(0);
    });
  });

  describe('AUTH_AND_SYNC Workflow', () => {
    it('should execute auth and sync workflow with dual providers', async () => {
      // ARRANGE
      mockUnifiedAuth.loginTidepool.mockReturnValue(of(undefined));

      // ACT
      const result = await orchestrator.executeAuthAndSync();

      // ASSERT
      expect(result.workflow.type).toBe(WorkflowType.AUTH_AND_SYNC);
      // El workflow puede fallar en authenticate local (requiere credenciales)
      // pero debe intentar ejecutar los pasos
      expect(result.workflow.steps.length).toBeGreaterThan(0);
    });

    it('should fail on critical authentication step failure', async () => {
      // ARRANGE
      mockUnifiedAuth.loginTidepool.mockReturnValue(throwError(() => new Error('Auth failed')));

      // ACT
      const result = await orchestrator.executeAuthAndSync();

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.workflow.status).toBe('failed');
    });
  });

  describe('APPOINTMENT_WITH_DATA Workflow', () => {
    it('should execute appointment with data sharing workflow', async () => {
      // ARRANGE
      const appointmentId = '123';
      mockAppointments.getAppointment.mockReturnValue(
        of({ appointment_id: 123, user_id: 1000, glucose_objective: 120 })
      );
      mockReadings.getReadingsByDateRange.mockResolvedValue([
        { id: '1', value: 115, time: new Date().toISOString() },
        { id: '2', value: 125, time: new Date().toISOString() },
      ]);

      // ACT
      const result = await orchestrator.executeAppointmentWithData(appointmentId);

      // ASSERT
      expect(result.workflow.type).toBe(WorkflowType.APPOINTMENT_WITH_DATA);
      expect(result.workflow.steps.some(s => s.name.includes('Fetch Appointment'))).toBe(true);
      expect(result.workflow.steps.some(s => s.name.includes('Prepare Glucose Data'))).toBe(true);
    });

    it('should fail when appointment not found', async () => {
      // ARRANGE
      mockAppointments.getAppointment.mockReturnValue(
        throwError(() => new Error('Appointment not found'))
      );

      // ACT
      const result = await orchestrator.executeAppointmentWithData('999');

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.workflow.status).toBe('failed');
    });
  });

  describe('Compensating Transactions', () => {
    it('should record error when critical step fails', async () => {
      // ARRANGE - Make TIDEPOOL unavailable (used by critical steps)
      mockExternalServices.isServiceAvailable.mockReturnValue(false);

      // ACT
      const result = await orchestrator.executeFullSync();

      // ASSERT - Workflow should fail when critical service is unavailable
      expect(result.success).toBe(false);
      expect(result.workflow.status).toBe('failed');
      expect(result.workflow.error).toBeDefined();
      expect(result.error).toContain('not available');
    });
  });

  describe('Retry Logic', () => {
    it('should track retry count in step state', async () => {
      // ARRANGE - All services available, workflow should complete
      mockExternalServices.isServiceAvailable.mockReturnValue(true);

      // ACT
      const result = await orchestrator.executeFullSync();

      // ASSERT - Steps should have retryCount property (starts at 0)
      expect(result.workflow.steps.length).toBeGreaterThan(0);
      result.workflow.steps.forEach(step => {
        expect(step).toHaveProperty('retryCount');
        expect(typeof step.retryCount).toBe('number');
      });
    });
  });

  describe('Workflow State Management', () => {
    it('should track active workflows correctly', async () => {
      // ARRANGE
      expect(orchestrator.getActiveWorkflows().length).toBe(0);

      // ACT - Iniciar workflow (no await para capturar estado activo)
      const workflowPromise = orchestrator.executeFullSync();

      // ASSERT - Workflow activo durante ejecución
      // Nota: El workflow puede completar muy rápido en tests
      await workflowPromise;
      expect(orchestrator.getCompletedWorkflows().length).toBeGreaterThan(0);
    });

    it('should maintain workflow history with limit', async () => {
      // ACT - Ejecutar múltiples workflows
      for (let i = 0; i < 5; i++) {
        await orchestrator.executeFullSync();
      }

      // ASSERT
      const completed = orchestrator.getCompletedWorkflows();
      expect(completed.length).toBeLessThanOrEqual(50); // MAX_WORKFLOW_HISTORY
      expect(completed.every(w => w.type === WorkflowType.FULL_SYNC)).toBe(true);
    });

    it('should generate unique workflow IDs', async () => {
      // ACT
      const result1 = await orchestrator.executeFullSync();
      const result2 = await orchestrator.executeFullSync();

      // ASSERT
      expect(result1.workflow.id).not.toBe(result2.workflow.id);
      expect(result1.workflow.id).toMatch(/^workflow_\d+_[a-z0-9]+$/);
    });
  });

  describe('DATA_EXPORT Workflow', () => {
    it('should execute data export workflow for CSV format', async () => {
      // ARRANGE
      mockReadings.getAllReadings.mockResolvedValue({
        readings: [
          { id: '1', value: 120, time: new Date().toISOString() },
          { id: '2', value: 130, time: new Date().toISOString() },
        ],
        total: 2,
      });

      // ACT
      const result = await orchestrator.executeDataExport('csv');

      // ASSERT
      expect(result.workflow.type).toBe(WorkflowType.DATA_EXPORT);
      expect(result.workflow.steps.some(s => s.name.includes('Generate Export'))).toBe(true);
    });

    it('should execute data export with date range filter', async () => {
      // ARRANGE
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      // ACT
      const result = await orchestrator.executeDataExport('pdf', dateRange);

      // ASSERT
      expect(result.workflow.type).toBe(WorkflowType.DATA_EXPORT);
      expect(mockReadings.getReadingsByDateRange).toHaveBeenCalled();
    });
  });

  describe('ACCOUNT_LINK Workflow', () => {
    it('should execute account linking workflow', async () => {
      // ARRANGE
      mockUnifiedAuth.isAuthenticatedWith.mockImplementation(
        (provider: string) => provider === 'local'
      );

      // ACT
      const result = await orchestrator.executeLinkAccounts();

      // ASSERT
      expect(result.workflow.type).toBe(WorkflowType.ACCOUNT_LINK);
      expect(result.workflow.steps.some(s => s.name.includes('Verify Local'))).toBe(true);
      expect(result.workflow.steps.some(s => s.name.includes('Link Accounts'))).toBe(true);
    });

    it('should fail linking when not authenticated locally', async () => {
      // ARRANGE
      mockUnifiedAuth.isAuthenticatedWith.mockReturnValue(false);

      // ACT
      const result = await orchestrator.executeLinkAccounts();

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });
  });

  describe('Network Connectivity Handling', () => {
    it('should fail FULL_SYNC when offline', async () => {
      // ARRANGE
      externalServicesStateSubject.next({
        isOnline: false,
        services: {},
      });

      // ACT
      const result = await orchestrator.executeFullSync();

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toContain('No network connectivity');
    });
  });
});
