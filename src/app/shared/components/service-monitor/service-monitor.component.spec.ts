// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { ServiceMonitorComponent } from './service-monitor.component';
import {
  ExternalServicesManager,
  ExternalServicesState,
  HealthStatus,
} from '@services/external-services-manager.service';
import { ServiceOrchestrator } from '@services/service-orchestrator.service';

describe('ServiceMonitorComponent', () => {
  let component: ServiceMonitorComponent;
  let fixture: ComponentFixture<ServiceMonitorComponent>;

  const mockState: ExternalServicesState = {
    isOnline: true,
    services: new Map(),
    circuitBreakers: new Map(),
    overallHealth: HealthStatus.HEALTHY,
  };

  const mockExternalServices = {
    state: new BehaviorSubject<ExternalServicesState>(mockState),
    performHealthCheck: vi.fn().mockResolvedValue(undefined),
    checkService: vi.fn().mockResolvedValue(undefined),
    resetCircuitBreaker: vi.fn(),
    clearCache: vi.fn(),
    getServiceConfig: vi.fn().mockReturnValue({ name: 'Test Service' }),
  };

  const mockOrchestrator = {
    getActiveWorkflows: vi.fn().mockReturnValue([]),
    getCompletedWorkflows: vi.fn().mockReturnValue([]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceMonitorComponent, TranslateModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ServiceMonitorComponent, {
        set: {
          imports: [TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
          providers: [
            { provide: ExternalServicesManager, useValue: mockExternalServices },
            { provide: ServiceOrchestrator, useValue: mockOrchestrator },
          ],
        },
      })
      .overrideProvider(ExternalServicesManager, { useValue: mockExternalServices })
      .overrideProvider(ServiceOrchestrator, { useValue: mockOrchestrator })
      .compileComponents();

    fixture = TestBed.createComponent(ServiceMonitorComponent);
    component = fixture.componentInstance;
  });

  describe('default values and configuration', () => {
    it('should have correct default values', () => {
      expect(component.servicesState).toBeNull();
      expect(component.services).toEqual([]);
      expect(component.autoRefresh).toBe(false);
      expect(component.refreshInterval).toBe(10000);
    });

    it('should have correct status colors for all health statuses', () => {
      const expectedColors = {
        [HealthStatus.HEALTHY]: '#4CAF50',
        [HealthStatus.DEGRADED]: '#FF9800',
        [HealthStatus.UNHEALTHY]: '#F44336',
        [HealthStatus.CHECKING]: '#2196F3',
        [HealthStatus.UNKNOWN]: '#9E9E9E',
      };

      Object.entries(expectedColors).forEach(([status, color]) => {
        expect(component.statusColors[status as HealthStatus], status).toBe(color);
      });
    });

    it('should have correct circuit breaker colors', () => {
      const expectedColors = {
        CLOSED: '#4CAF50',
        OPEN: '#F44336',
        HALF_OPEN: '#FF9800',
      };

      Object.entries(expectedColors).forEach(([state, color]) => {
        expect(component.circuitBreakerColors[state], state).toBe(color);
      });
    });
  });

  describe('formatDuration', () => {
    it('should format durations correctly', () => {
      const testCases = [
        { ms: 0, expected: '0ms' },
        { ms: 500, expected: '500ms' },
        { ms: 1000, expected: '1.0s' },
        { ms: 2500, expected: '2.5s' },
        { ms: 60000, expected: '1.0m' },
        { ms: 90000, expected: '1.5m' },
      ];

      testCases.forEach(({ ms, expected }) => {
        expect(component.formatDuration(ms), `${ms}ms`).toBe(expected);
      });
    });
  });

  describe('formatDate', () => {
    it('should format dates and handle undefined', () => {
      expect(component.formatDate(undefined)).toBe('N/A');

      const date = new Date('2025-01-15T10:30:00');
      const result = component.formatDate(date);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');

      const stringResult = component.formatDate('2025-01-15T10:30:00');
      expect(stringResult).toBeTruthy();
    });
  });

  describe('workflow methods', () => {
    it('should handle workflow duration', () => {
      // SAFETY: Partial mock for testing a single function
      expect(component.getWorkflowDuration({ id: '1', status: 'running' } as any)).toBe('N/A');

      const completedWorkflow = {
        id: '1',
        status: 'completed',
        startTime: new Date(Date.now() - 5000),
        endTime: new Date(),
      };
      // SAFETY: Partial mock for testing a single function
      expect(component.getWorkflowDuration(completedWorkflow as any)).toMatch(/^\d+(\.\d)?s$/);
    });

    it('should calculate workflow progress correctly', () => {
      // SAFETY: Partial mock for testing a single function
      expect(component.getWorkflowProgress({ id: '1', steps: [] } as any)).toBe(0);
      // SAFETY: Partial mock for testing a single function
      expect(component.getWorkflowProgress({ id: '1' } as any)).toBe(0);

      const workflow = {
        id: '1',
        steps: [
          { status: 'completed' },
          { status: 'completed' },
          { status: 'running' },
          { status: 'pending' },
        ],
      };
      // SAFETY: Partial mock for testing a single function
      expect(component.getWorkflowProgress(workflow as any)).toBe(50);

      const fullWorkflow = {
        id: '1',
        steps: [{ status: 'completed' }, { status: 'failed' }, { status: 'skipped' }],
      };
      // SAFETY: Partial mock for testing a single function
      expect(component.getWorkflowProgress(fullWorkflow as any)).toBe(100);
    });

    it('should return correct workflow status colors', () => {
      const colorTests = [
        { status: 'completed', color: '#4CAF50' },
        { status: 'running', color: '#2196F3' },
        { status: 'failed', color: '#F44336' },
        { status: 'compensating', color: '#FF9800' },
        { status: 'unknown', color: '#9E9E9E' },
      ];

      colorTests.forEach(({ status, color }) => {
        expect(component.getWorkflowStatusColor(status), status).toBe(color);
      });
    });

    it('should return correct step status icons', () => {
      const iconTests = [
        { status: 'completed', icon: 'checkmark-circle' },
        { status: 'running', icon: 'sync' },
        { status: 'failed', icon: 'close-circle' },
        { status: 'skipped', icon: 'arrow-forward-circle' },
        { status: 'unknown', icon: 'ellipse-outline' },
      ];

      iconTests.forEach(({ status, icon }) => {
        expect(component.getStepStatusIcon(status), status).toBe(icon);
      });
    });
  });

  describe('UI state methods', () => {
    it('should toggle service details visibility', () => {
      component.showServiceDetails('API_GATEWAY');
      expect(component.selectedService).toBe('API_GATEWAY');
      expect(component.showDetails).toBe(true);

      component.hideServiceDetails();
      expect(component.selectedService).toBeNull();
      expect(component.showDetails).toBe(false);
    });

    it('should toggle autoRefresh', () => {
      expect(component.autoRefresh).toBe(false);
      component.toggleAutoRefresh();
      expect(component.autoRefresh).toBe(true);
      component.toggleAutoRefresh();
      expect(component.autoRefresh).toBe(false);
    });
  });

  describe('trackBy functions', () => {
    it('should track by correct identifiers', () => {
      // SAFETY: Partial mock for testing a single function
      expect(component.trackByService(0, { service: 'API_GATEWAY' } as any)).toBe('API_GATEWAY');
      // SAFETY: Partial mock for testing a single function
      expect(component.trackByCircuitBreaker(0, { service: 'LOGIN' } as any)).toBe('LOGIN');
      // SAFETY: Partial mock for testing a single function
      expect(component.trackByWorkflow(0, { id: 'wf-123' } as any)).toBe('wf-123');
    });
  });
});
