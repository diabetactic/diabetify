/**
 * Service Orchestrator
 *
 * Coordinates complex operations across multiple external services.
 * Implements saga patterns, compensating transactions, and intelligent
 * retry/fallback strategies for multi-service workflows.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { timeout, take } from 'rxjs/operators';

import { ExternalServicesManager, ExternalService } from '@services/external-services-manager.service';
import { UnifiedAuthService } from '@services/unified-auth.service';
import { GlucoserverService, GlucoseReading as GlucoserverReading } from '@services/glucoserver.service';
import { AppointmentService } from '@services/appointment.service';
import { ReadingsService } from '@services/readings.service';
import { db } from '@services/database.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';

/**
 * Workflow types
 */
export enum WorkflowType {
  FULL_SYNC = 'FULL_SYNC',
  AUTH_AND_SYNC = 'AUTH_AND_SYNC',
  APPOINTMENT_WITH_DATA = 'APPOINTMENT_WITH_DATA',
  DATA_EXPORT = 'DATA_EXPORT',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  ACCOUNT_LINK = 'ACCOUNT_LINK',
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  name: string;
  service: ExternalService;
  action: () => Promise<unknown> | Observable<unknown>;
  compensate?: () => Promise<void>; // Rollback action
  retryable: boolean;
  critical: boolean; // If true, failure stops workflow
  timeout?: number;
}

/**
 * Workflow state
 */
export interface WorkflowState {
  id: string;
  type: WorkflowType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating';
  steps: WorkflowStepState[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
  result?: unknown;
}

/**
 * Workflow step state
 */
export interface WorkflowStepState {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  result?: unknown;
  error?: string;
  retryCount: number;
}

/**
 * Orchestration result
 */
export interface OrchestrationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  workflow: WorkflowState;
}

@Injectable({
  providedIn: 'root',
})
export class ServiceOrchestrator implements OnDestroy {
  private activeWorkflows = new Map<string, BehaviorSubject<WorkflowState>>();
  private completedWorkflows: WorkflowState[] = [];
  private readonly MAX_WORKFLOW_HISTORY = 50;

  constructor(
    private externalServices: ExternalServicesManager,
    private unifiedAuth: UnifiedAuthService,
    private glucoserver: GlucoserverService,
    private appointments: AppointmentService,
    private readings: ReadingsService
  ) {}

  /**
   * Clean up subscriptions when service is destroyed
   * Prevents memory leaks from uncompleted BehaviorSubjects
   */
  ngOnDestroy(): void {
    // Complete all active workflow BehaviorSubjects
    for (const subject of this.activeWorkflows.values()) {
      subject.complete();
    }
    this.activeWorkflows.clear();
  }

  /**
   * Execute a full data synchronization workflow
   */
  public async executeFullSync(): Promise<OrchestrationResult> {
    const workflow = this.createWorkflow(WorkflowType.FULL_SYNC);

    const steps: WorkflowStep[] = [
      {
        name: 'Check Network Connectivity',
        service: ExternalService.TIDEPOOL,
        action: () => this.checkNetworkConnectivity(),
        retryable: true,
        critical: true,
      },
      {
        name: 'Verify Authentication',
        service: ExternalService.TIDEPOOL,
        action: () => this.verifyAuthentication(),
        retryable: true,
        critical: true,
      },
      {
        name: 'Sync Tidepool Data',
        service: ExternalService.TIDEPOOL,
        action: () => this.syncTidepoolData(),
        compensate: () => this.rollbackTidepoolSync(),
        retryable: true,
        critical: false,
        timeout: 60000,
      },
      {
        name: 'Sync Local Server Data',
        service: ExternalService.GLUCOSERVER,
        action: () => this.syncLocalServerData(),
        compensate: () => this.rollbackLocalServerSync(),
        retryable: true,
        critical: false,
        timeout: 30000,
      },
      {
        name: 'Update Statistics',
        service: ExternalService.GLUCOSERVER,
        action: () => this.updateStatistics(),
        retryable: false,
        critical: false,
      },
      {
        name: 'Clean Duplicate Data',
        service: ExternalService.GLUCOSERVER,
        action: () => this.cleanDuplicateData(),
        retryable: false,
        critical: false,
      },
    ];

    return this.executeWorkflow(workflow, steps);
  }

  /**
   * Execute authentication and sync workflow
   */
  public async executeAuthAndSync(): Promise<OrchestrationResult> {
    const workflow = this.createWorkflow(WorkflowType.AUTH_AND_SYNC);

    const steps: WorkflowStep[] = [
      {
        name: 'Authenticate with Tidepool',
        service: ExternalService.TIDEPOOL,
        action: () => this.authenticateTidepool(),
        retryable: false,
        critical: true,
      },
      {
        name: 'Authenticate with Local Server',
        service: ExternalService.LOCAL_AUTH,
        action: () => this.authenticateLocal(),
        retryable: false,
        critical: false,
      },
      {
        name: 'Initial Data Sync',
        service: ExternalService.TIDEPOOL,
        action: () => this.performInitialSync(),
        retryable: true,
        critical: false,
        timeout: 60000,
      },
      {
        name: 'Load User Preferences',
        service: ExternalService.GLUCOSERVER,
        action: () => this.loadUserPreferences(),
        retryable: true,
        critical: false,
      },
    ];

    return this.executeWorkflow(workflow, steps);
  }

  /**
   * Execute appointment with data sharing workflow
   */
  public async executeAppointmentWithData(appointmentId: string): Promise<OrchestrationResult> {
    const workflow = this.createWorkflow(WorkflowType.APPOINTMENT_WITH_DATA);

    const steps: WorkflowStep[] = [
      {
        name: 'Verify Authentication',
        service: ExternalService.LOCAL_AUTH,
        action: () => this.verifyAuthentication(),
        retryable: true,
        critical: true,
      },
      {
        name: 'Fetch Appointment Details',
        service: ExternalService.APPOINTMENTS,
        action: () => this.fetchAppointmentDetails(appointmentId),
        retryable: true,
        critical: true,
      },
      {
        name: 'Prepare Glucose Data',
        service: ExternalService.GLUCOSERVER,
        action: () => this.prepareGlucoseDataForSharing(appointmentId),
        retryable: false,
        critical: true,
      },
      {
        name: 'Share Data with Doctor',
        service: ExternalService.APPOINTMENTS,
        action: () => this.shareDataWithDoctor(appointmentId),
        compensate: () => this.revokeDataSharing(appointmentId),
        retryable: true,
        critical: true,
      },
      {
        name: 'Send Confirmation',
        service: ExternalService.APPOINTMENTS,
        action: () => this.sendShareConfirmation(appointmentId),
        retryable: false,
        critical: false,
      },
    ];

    return this.executeWorkflow(workflow, steps);
  }

  /**
   * Execute data export workflow
   */
  public async executeDataExport(
    format: 'csv' | 'pdf',
    dateRange?: { start: Date; end: Date }
  ): Promise<OrchestrationResult> {
    const workflow = this.createWorkflow(WorkflowType.DATA_EXPORT);

    const steps: WorkflowStep[] = [
      {
        name: 'Sync Latest Data',
        service: ExternalService.TIDEPOOL,
        action: () => this.syncLatestData(),
        retryable: true,
        critical: false,
      },
      {
        name: 'Fetch Readings',
        service: ExternalService.GLUCOSERVER,
        action: () => this.fetchReadingsForExport(dateRange),
        retryable: true,
        critical: true,
      },
      {
        name: 'Calculate Statistics',
        service: ExternalService.GLUCOSERVER,
        action: () => this.calculateExportStatistics(dateRange),
        retryable: false,
        critical: false,
      },
      {
        name: 'Generate Export',
        service: ExternalService.GLUCOSERVER,
        action: () => this.generateExport(format),
        retryable: false,
        critical: true,
      },
    ];

    return this.executeWorkflow(workflow, steps);
  }

  /**
   * Execute account linking workflow
   */
  public async executeLinkAccounts(): Promise<OrchestrationResult> {
    const workflow = this.createWorkflow(WorkflowType.ACCOUNT_LINK);

    const steps: WorkflowStep[] = [
      {
        name: 'Verify Local Authentication',
        service: ExternalService.LOCAL_AUTH,
        action: () => this.verifyLocalAuth(),
        retryable: false,
        critical: true,
      },
      {
        name: 'Authenticate with Tidepool',
        service: ExternalService.TIDEPOOL,
        action: () => this.authenticateTidepool(),
        retryable: false,
        critical: true,
      },
      {
        name: 'Link Accounts',
        service: ExternalService.LOCAL_AUTH,
        action: () => this.linkAccounts(),
        compensate: () => this.unlinkAccounts(),
        retryable: false,
        critical: true,
      },
      {
        name: 'Merge Data',
        service: ExternalService.GLUCOSERVER,
        action: () => this.mergeAccountData(),
        compensate: () => this.rollbackDataMerge(),
        retryable: false,
        critical: true,
      },
      {
        name: 'Update Preferences',
        service: ExternalService.LOCAL_AUTH,
        action: () => this.updateMergedPreferences(),
        retryable: false,
        critical: false,
      },
    ];

    return this.executeWorkflow(workflow, steps);
  }

  /**
   * Create a new workflow
   */
  private createWorkflow(type: WorkflowType): WorkflowState {
    const workflow: WorkflowState = {
      id: this.generateWorkflowId(),
      type,
      status: 'pending',
      steps: [],
    };

    const subject = new BehaviorSubject(workflow);
    this.activeWorkflows.set(workflow.id, subject);

    return workflow;
  }

  /**
   * Execute a workflow
   */
  private async executeWorkflow(
    workflow: WorkflowState,
    steps: WorkflowStep[]
  ): Promise<OrchestrationResult> {
    const subject = this.activeWorkflows.get(workflow.id);
    if (!subject) {
      return {
        success: false,
        error: 'Workflow not found',
        workflow,
      };
    }

    // Initialize workflow state
    workflow.status = 'running';
    workflow.startTime = new Date();
    workflow.steps = steps.map(step => ({
      name: step.name,
      status: 'pending',
      retryCount: 0,
    }));
    subject.next(workflow);

    const executedSteps: { step: WorkflowStep; result: unknown }[] = [];

    try {
      // Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepState = workflow.steps[i];

        // Check service availability
        if (!this.externalServices.isServiceAvailable(step.service)) {
          if (step.critical) {
            throw new Error(`Critical service ${step.service} is not available`);
          }
          stepState.status = 'skipped';
          stepState.error = 'Service unavailable';
          subject.next(workflow);
          continue;
        }

        // Execute step
        stepState.status = 'running';
        stepState.startTime = new Date();
        subject.next(workflow);

        try {
          const result = await this.executeStep(step, stepState);
          executedSteps.push({ step, result });

          stepState.status = 'completed';
          stepState.endTime = new Date();
          stepState.result = result;
          subject.next(workflow);
        } catch (error) {
          stepState.status = 'failed';
          stepState.endTime = new Date();
          stepState.error = error instanceof Error ? error.message : 'Step failed';
          subject.next(workflow);

          if (step.critical) {
            throw error;
          }
        }
      }

      // Workflow completed successfully
      workflow.status = 'completed';
      workflow.endTime = new Date();
      subject.next(workflow);

      this.completeWorkflow(workflow);

      return {
        success: true,
        data: executedSteps.map(e => e.result),
        workflow,
      };
    } catch (error) {
      // Workflow failed, execute compensating transactions
      workflow.status = 'compensating';
      subject.next(workflow);

      await this.compensateWorkflow(executedSteps);

      workflow.status = 'failed';
      workflow.endTime = new Date();
      workflow.error = error instanceof Error ? error.message : 'Workflow failed';
      subject.next(workflow);

      this.completeWorkflow(workflow);

      return {
        success: false,
        error: workflow.error,
        workflow,
      };
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep, stepState: WorkflowStepState): Promise<unknown> {
    const maxRetries = step.retryable ? 3 : 1;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      stepState.retryCount = attempt - 1;

      try {
        // Convert to promise if observable
        let action = step.action();
        if (action instanceof Observable) {
          action = firstValueFrom(action.pipe(timeout(step.timeout || 30000)));
        }

        return await action;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry with exponential backoff
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }
    // This should never be reached as we either return or throw above
    throw new Error('Unexpected: exceeded max retries without result');
  }

  /**
   * Execute compensating transactions
   */
  private async compensateWorkflow(
    executedSteps: { step: WorkflowStep; result: unknown }[]
  ): Promise<void> {
    // Execute compensating transactions in reverse order
    for (const { step } of executedSteps.reverse()) {
      if (step.compensate) {
        try {
          await step.compensate();
        } catch (error) {
          console.error(`Failed to compensate step ${step.name}:`, error);
        }
      }
    }
  }

  /**
   * Complete a workflow
   */
  private completeWorkflow(workflow: WorkflowState): void {
    this.activeWorkflows.delete(workflow.id);
    this.completedWorkflows.push(workflow);

    // Keep only recent workflow history
    if (this.completedWorkflows.length > this.MAX_WORKFLOW_HISTORY) {
      this.completedWorkflows.shift();
    }
  }

  /**
   * Get active workflow by ID
   */
  public getActiveWorkflow(id: string): Observable<WorkflowState> | undefined {
    return this.activeWorkflows.get(id)?.asObservable();
  }

  /**
   * Get all active workflows
   */
  public getActiveWorkflows(): WorkflowState[] {
    return Array.from(this.activeWorkflows.values()).map(subject => subject.value);
  }

  /**
   * Get completed workflows
   */
  public getCompletedWorkflows(): WorkflowState[] {
    return [...this.completedWorkflows];
  }

  // Helper methods for workflow steps

  private async checkNetworkConnectivity(): Promise<boolean> {
    const state = await firstValueFrom(this.externalServices.state.pipe(take(1)));
    if (!state?.isOnline) {
      throw new Error('No network connectivity');
    }
    return true;
  }

  private async verifyAuthentication(): Promise<boolean> {
    const isAuthenticated = this.unifiedAuth.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }
    return true;
  }

  private async verifyLocalAuth(): Promise<boolean> {
    const isAuthenticated = this.unifiedAuth.isAuthenticatedWith('local');
    if (!isAuthenticated) {
      throw new Error('Not authenticated with local server');
    }
    return true;
  }

  private async authenticateTidepool(): Promise<void> {
    await firstValueFrom(this.unifiedAuth.loginTidepool());
  }

  private async authenticateLocal(): Promise<void> {
    // This would need credentials, so it's just a placeholder
    throw new Error('Local authentication requires credentials');
  }

  private async syncTidepoolData(): Promise<unknown> {
    // Tidepool is auth-only now, no data sync needed
    // Backend sync is handled by syncLocalServerData
    return Promise.resolve({ skipped: true, reason: 'auth-only' });
  }

  private async rollbackTidepoolSync(): Promise<void> {
    // Mark recently synced data as unsynced
    const recentData = await db.readings
      .where('synced')
      .equals(1)
      .and(reading => {
        const syncTime = new Date(reading.localStoredAt || 0).getTime();
        return Date.now() - syncTime < 300000; // Last 5 minutes
      })
      .toArray();

    await db.readings.bulkPut(recentData.map(r => ({ ...r, synced: false })));
  }

  private async syncLocalServerData(): Promise<unknown> {
    const user = await this.unifiedAuth.getCurrentUser();
    const readings = await this.readings.getUnsyncedReadings();
    // Map LocalGlucoseReading to GlucoserverReading format
    const mappedReadings: GlucoserverReading[] = readings.map(r => ({
      userId: user?.id || r.uploadId || 'unknown',
      value: r.value,
      unit: (r.units as 'mg/dL' | 'mmol/L') || 'mg/dL',
      timestamp: r.time,
      type: r.type as 'smbg' | 'cbg' | 'cgm' | undefined,
      synced: Boolean(r.synced),
    }));
    return await firstValueFrom(this.glucoserver.syncReadings(mappedReadings));
  }

  private async rollbackLocalServerSync(): Promise<void> {
    // Implementation would depend on server API
    console.log('Rolling back local server sync');
  }

  private async updateStatistics(): Promise<unknown> {
    const stats = await this.readings.getStatistics('all');
    return stats;
  }

  private async cleanDuplicateData(): Promise<void> {
    // Implementation for cleaning duplicate data
    const readings = await db.readings.toArray();
    const uniqueReadings = new Map<string, LocalGlucoseReading>();

    for (const reading of readings) {
      const key = `${reading.time}-${reading.value}`;
      if (!uniqueReadings.has(key)) {
        uniqueReadings.set(key, reading);
      }
    }

    if (uniqueReadings.size < readings.length) {
      await db.readings.clear();
      await db.readings.bulkAdd(Array.from(uniqueReadings.values()));
    }
  }

  private async performInitialSync(): Promise<unknown> {
    // Tidepool is auth-only now, use backend sync
    return await this.readings.performFullSync();
  }

  private async loadUserPreferences(): Promise<unknown> {
    return this.unifiedAuth.getCurrentUser();
  }

  private async fetchAppointmentDetails(appointmentId: string): Promise<unknown> {
    return await firstValueFrom(this.appointments.getAppointment(parseInt(appointmentId, 10)));
  }

  private async prepareGlucoseDataForSharing(_appointmentId: string): Promise<unknown> {
    const dateRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
    };

    return await this.readings.getReadingsByDateRange(dateRange.start, dateRange.end);
  }

  private async shareDataWithDoctor(appointmentId: string): Promise<unknown> {
    const data = await this.prepareGlucoseDataForSharing(appointmentId);
    // Note: shareGlucoseData is not implemented in AppointmentService yet
    // This is a placeholder for future implementation
    console.log(`Sharing glucose data for appointment ${appointmentId}`, data);
    return { shared: true, appointmentId, dataSize: Array.isArray(data) ? data.length : 0 };
  }

  private async revokeDataSharing(appointmentId: string): Promise<void> {
    // Implementation would depend on API
    console.log(`Revoking data sharing for appointment ${appointmentId}`);
  }

  private async sendShareConfirmation(appointmentId: string): Promise<void> {
    // Implementation for sending confirmation
    console.log(`Sending share confirmation for appointment ${appointmentId}`);
  }

  private async syncLatestData(): Promise<unknown> {
    // Tidepool is auth-only now, use backend sync
    return await this.readings.performFullSync();
  }

  private async fetchReadingsForExport(dateRange?: { start: Date; end: Date }): Promise<unknown> {
    if (dateRange) {
      return await this.readings.getReadingsByDateRange(dateRange.start, dateRange.end);
    }
    return await this.readings.getAllReadings();
  }

  private async calculateExportStatistics(_dateRange?: {
    start: Date;
    end: Date;
  }): Promise<unknown> {
    return await this.readings.getStatistics('all');
  }

  private async generateExport(format: 'csv' | 'pdf'): Promise<unknown> {
    // Generate export using readings service
    const readings = await this.readings.getAllReadings();
    return { format, count: readings.total };
  }

  private async linkAccounts(): Promise<void> {
    await firstValueFrom(this.unifiedAuth.linkTidepoolAccount());
  }

  private async unlinkAccounts(): Promise<void> {
    await this.unifiedAuth.unlinkTidepoolAccount();
  }

  private async mergeAccountData(): Promise<unknown> {
    // Implementation for merging data from both accounts
    console.log('Merging account data');
    return { merged: true };
  }

  private async rollbackDataMerge(): Promise<void> {
    // Implementation for rolling back data merge
    console.log('Rolling back data merge');
  }

  private async updateMergedPreferences(): Promise<unknown> {
    // Implementation for updating preferences after merge
    console.log('Updating merged preferences');
    return { preferencesUpdated: true };
  }

  /**
   * Helper function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
