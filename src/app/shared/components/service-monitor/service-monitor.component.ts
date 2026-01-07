/**
 * Service Monitor Component
 *
 * Displays real-time health status of all external services.
 * Shows service availability, response times, circuit breaker states,
 * and active workflows.
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { CommonModule } from '@angular/common';

import {
  ExternalServicesManager,
  ExternalService,
  ExternalServicesState,
  ServiceHealthCheck,
  CircuitBreakerState,
  HealthStatus,
} from '@services/external-services-manager.service';
import { ServiceOrchestrator, WorkflowState } from '@services/service-orchestrator.service';

@Component({
  selector: 'app-service-monitor',
  templateUrl: './service-monitor.component.html',
  styleUrls: ['./service-monitor.component.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, TranslateModule, AppIconComponent],
})
export class ServiceMonitorComponent implements OnInit, OnDestroy {
  // Service states
  servicesState: ExternalServicesState | null = null;
  services: ServiceHealthCheck[] = [];
  circuitBreakers: CircuitBreakerState[] = [];

  // Workflow states
  activeWorkflows: WorkflowState[] = [];
  completedWorkflows: WorkflowState[] = [];

  // UI state
  selectedService: ExternalService | null = null;
  showDetails = false;
  autoRefresh = false; // DISABLED: Health checks cause CORS errors on web (native uses auto-patched HttpClient)
  refreshInterval = 10000; // 10 seconds

  // Subscriptions
  private subscriptions = new Subscription();
  private refreshSubscription?: Subscription;

  // Service status indicators
  readonly statusColors = {
    [HealthStatus.HEALTHY]: '#4CAF50',
    [HealthStatus.DEGRADED]: '#FF9800',
    [HealthStatus.UNHEALTHY]: '#F44336',
    [HealthStatus.CHECKING]: '#2196F3',
    [HealthStatus.UNKNOWN]: '#9E9E9E',
  };

  readonly statusIcons = {
    [HealthStatus.HEALTHY]: 'checkmark-circle',
    [HealthStatus.DEGRADED]: 'warning',
    [HealthStatus.UNHEALTHY]: 'close-circle',
    [HealthStatus.CHECKING]: 'reload',
    [HealthStatus.UNKNOWN]: 'help-circle',
  };

  readonly circuitBreakerColors = {
    CLOSED: '#4CAF50',
    OPEN: '#F44336',
    HALF_OPEN: '#FF9800',
  };

  constructor(
    private externalServices: ExternalServicesManager,
    private orchestrator: ServiceOrchestrator
  ) {}

  ngOnInit() {
    // Subscribe to service state changes
    this.subscriptions.add(
      this.externalServices.state.subscribe(state => {
        this.servicesState = state;
        this.services = Array.from(state.services.values());
        this.circuitBreakers = Array.from(state.circuitBreakers.values());
      })
    );

    // Load active workflows
    this.loadWorkflows();

    // Set up auto-refresh
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }

    // DISABLED: Health checks cause CORS errors on web platforms.
    // With Capacitor 6 auto-patching, HttpClient uses native HTTP on mobile.
    // this.checkAllServices();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.stopAutoRefresh();
  }

  /**
   * Load active and completed workflows
   */
  loadWorkflows() {
    this.activeWorkflows = this.orchestrator.getActiveWorkflows();
    this.completedWorkflows = this.orchestrator.getCompletedWorkflows();
  }

  /**
   * Check health of all services
   */
  async checkAllServices() {
    await this.externalServices.performHealthCheck();
    this.loadWorkflows();
  }

  /**
   * Check health of specific service
   */
  async checkService(service: ExternalService) {
    await this.externalServices.checkService(service);
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuitBreaker(service: ExternalService) {
    this.externalServices.resetCircuitBreaker(service);
    this.checkService(service);
  }

  /**
   * Clear cache for a service
   */
  clearServiceCache(service?: ExternalService) {
    this.externalServices.clearCache(service);
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
      if (this.autoRefresh) {
        this.checkAllServices();
      }
    });
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  /**
   * Get service name
   */
  getServiceName(service: ExternalService): string {
    const config = this.externalServices.getServiceConfig(service);
    return config?.name || service;
  }

  /**
   * Get service config
   */
  getServiceConfig(service: ExternalService) {
    return this.externalServices.getServiceConfig(service);
  }

  /**
   * Show service details
   */
  showServiceDetails(service: ExternalService) {
    this.selectedService = service;
    this.showDetails = true;
  }

  /**
   * Hide service details
   */
  hideServiceDetails() {
    this.selectedService = null;
    this.showDetails = false;
  }

  /**
   * Format duration
   */
  formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${(ms / 60000).toFixed(1)}m`;
    }
  }

  /**
   * Format date
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const dateObject = new Date(date);
    return dateObject.toLocaleString();
  }

  /**
   * Get workflow duration
   */
  getWorkflowDuration(workflow: WorkflowState): string {
    if (!workflow.startTime) return 'N/A';
    const end = workflow.endTime || new Date();
    const duration = new Date(end).getTime() - new Date(workflow.startTime).getTime();
    return this.formatDuration(duration);
  }

  /**
   * Get workflow progress
   */
  getWorkflowProgress(workflow: WorkflowState): number {
    if (!workflow.steps || workflow.steps.length === 0) return 0;
    const completed = workflow.steps.filter(
      s => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped'
    ).length;
    return Math.round((completed / workflow.steps.length) * 100);
  }

  /**
   * Get workflow status color
   */
  getWorkflowStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'running':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      case 'compensating':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  }

  /**
   * Get step status icon
   */
  getStepStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'running':
        return 'sync';
      case 'failed':
        return 'close-circle';
      case 'skipped':
        return 'arrow-forward-circle';
      default:
        return 'ellipse-outline';
    }
  }

  // trackBy functions for ngFor optimization
  trackByService(_index: number, service: ServiceHealthCheck): ExternalService {
    return service.service;
  }

  trackByCircuitBreaker(_index: number, cb: CircuitBreakerState): ExternalService {
    return cb.service;
  }

  trackByWorkflow(_index: number, workflow: WorkflowState): string {
    return workflow.id;
  }
}
