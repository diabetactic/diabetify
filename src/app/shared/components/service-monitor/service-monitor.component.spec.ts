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
    performHealthCheck: jest.fn().mockResolvedValue(undefined),
    checkService: jest.fn().mockResolvedValue(undefined),
    resetCircuitBreaker: jest.fn(),
    clearCache: jest.fn(),
    getServiceConfig: jest.fn().mockReturnValue({ name: 'Test Service' }),
  };

  const mockOrchestrator = {
    getActiveWorkflows: jest.fn().mockReturnValue([]),
    getCompletedWorkflows: jest.fn().mockReturnValue([]),
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should have null servicesState initially', () => {
      expect(component.servicesState).toBeNull();
    });

    it('should have empty services array', () => {
      expect(component.services).toEqual([]);
    });

    it('should have autoRefresh disabled by default', () => {
      expect(component.autoRefresh).toBe(false);
    });

    it('should have refreshInterval of 10000ms', () => {
      expect(component.refreshInterval).toBe(10000);
    });
  });

  describe('statusColors', () => {
    it('should have color for HEALTHY status', () => {
      expect(component.statusColors[HealthStatus.HEALTHY]).toBe('#4CAF50');
    });

    it('should have color for DEGRADED status', () => {
      expect(component.statusColors[HealthStatus.DEGRADED]).toBe('#FF9800');
    });

    it('should have color for UNHEALTHY status', () => {
      expect(component.statusColors[HealthStatus.UNHEALTHY]).toBe('#F44336');
    });

    it('should have color for CHECKING status', () => {
      expect(component.statusColors[HealthStatus.CHECKING]).toBe('#2196F3');
    });

    it('should have color for UNKNOWN status', () => {
      expect(component.statusColors[HealthStatus.UNKNOWN]).toBe('#9E9E9E');
    });
  });

  describe('circuitBreakerColors', () => {
    it('should have color for CLOSED state', () => {
      expect(component.circuitBreakerColors['CLOSED']).toBe('#4CAF50');
    });

    it('should have color for OPEN state', () => {
      expect(component.circuitBreakerColors['OPEN']).toBe('#F44336');
    });

    it('should have color for HALF_OPEN state', () => {
      expect(component.circuitBreakerColors['HALF_OPEN']).toBe('#FF9800');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(component.formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(component.formatDuration(2500)).toBe('2.5s');
    });

    it('should format minutes', () => {
      expect(component.formatDuration(90000)).toBe('1.5m');
    });

    it('should handle zero', () => {
      expect(component.formatDuration(0)).toBe('0ms');
    });

    it('should handle exactly 1000ms as seconds', () => {
      expect(component.formatDuration(1000)).toBe('1.0s');
    });

    it('should handle exactly 60000ms as minutes', () => {
      expect(component.formatDuration(60000)).toBe('1.0m');
    });
  });

  describe('formatDate', () => {
    it('should return N/A for undefined', () => {
      expect(component.formatDate(undefined)).toBe('N/A');
    });

    it('should format Date object', () => {
      const date = new Date('2025-01-15T10:30:00');
      const result = component.formatDate(date);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format date string', () => {
      const result = component.formatDate('2025-01-15T10:30:00');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('getWorkflowDuration', () => {
    it('should return N/A when no startTime', () => {
      const workflow = { id: '1', status: 'running' } as any;
      expect(component.getWorkflowDuration(workflow)).toBe('N/A');
    });

    it('should calculate duration for completed workflow', () => {
      const workflow = {
        id: '1',
        status: 'completed',
        startTime: new Date(Date.now() - 5000),
        endTime: new Date(),
      } as any;
      const result = component.getWorkflowDuration(workflow);
      expect(result).toMatch(/^\d+(\.\d)?[ms]$/);
    });
  });

  describe('getWorkflowProgress', () => {
    it('should return 0 for no steps', () => {
      const workflow = { id: '1', steps: [] } as any;
      expect(component.getWorkflowProgress(workflow)).toBe(0);
    });

    it('should return 0 for undefined steps', () => {
      const workflow = { id: '1' } as any;
      expect(component.getWorkflowProgress(workflow)).toBe(0);
    });

    it('should calculate progress correctly', () => {
      const workflow = {
        id: '1',
        steps: [
          { status: 'completed' },
          { status: 'completed' },
          { status: 'running' },
          { status: 'pending' },
        ],
      } as any;
      expect(component.getWorkflowProgress(workflow)).toBe(50);
    });

    it('should count failed and skipped as completed', () => {
      const workflow = {
        id: '1',
        steps: [{ status: 'completed' }, { status: 'failed' }, { status: 'skipped' }],
      } as any;
      expect(component.getWorkflowProgress(workflow)).toBe(100);
    });
  });

  describe('getWorkflowStatusColor', () => {
    it('should return green for completed', () => {
      expect(component.getWorkflowStatusColor('completed')).toBe('#4CAF50');
    });

    it('should return blue for running', () => {
      expect(component.getWorkflowStatusColor('running')).toBe('#2196F3');
    });

    it('should return red for failed', () => {
      expect(component.getWorkflowStatusColor('failed')).toBe('#F44336');
    });

    it('should return orange for compensating', () => {
      expect(component.getWorkflowStatusColor('compensating')).toBe('#FF9800');
    });

    it('should return gray for unknown status', () => {
      expect(component.getWorkflowStatusColor('unknown')).toBe('#9E9E9E');
    });
  });

  describe('getStepStatusIcon', () => {
    it('should return checkmark for completed', () => {
      expect(component.getStepStatusIcon('completed')).toBe('checkmark-circle');
    });

    it('should return sync for running', () => {
      expect(component.getStepStatusIcon('running')).toBe('sync');
    });

    it('should return close for failed', () => {
      expect(component.getStepStatusIcon('failed')).toBe('close-circle');
    });

    it('should return arrow for skipped', () => {
      expect(component.getStepStatusIcon('skipped')).toBe('arrow-forward-circle');
    });

    it('should return ellipse for unknown', () => {
      expect(component.getStepStatusIcon('unknown')).toBe('ellipse-outline');
    });
  });

  describe('UI state methods', () => {
    it('should show service details', () => {
      component.showServiceDetails('API_GATEWAY' as any);
      expect(component.selectedService).toBe('API_GATEWAY');
      expect(component.showDetails).toBe(true);
    });

    it('should hide service details', () => {
      component.selectedService = 'API_GATEWAY' as any;
      component.showDetails = true;
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
    it('should track services by service property', () => {
      const service = { service: 'API_GATEWAY' } as any;
      expect(component.trackByService(0, service)).toBe('API_GATEWAY');
    });

    it('should track circuit breakers by service property', () => {
      const cb = { service: 'LOGIN' } as any;
      expect(component.trackByCircuitBreaker(0, cb)).toBe('LOGIN');
    });

    it('should track workflows by id', () => {
      const workflow = { id: 'wf-123' } as any;
      expect(component.trackByWorkflow(0, workflow)).toBe('wf-123');
    });
  });
});
