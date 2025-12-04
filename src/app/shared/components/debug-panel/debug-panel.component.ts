import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonFabButton, IonIcon, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../../environments/environment';
import { TidepoolAuthService } from '../../../core/services/tidepool-auth.service';
import { LocalAuthService } from '../../../core/services/local-auth.service';
import {
  ExternalServicesManager,
  ExternalServicesState,
  HealthStatus,
} from '../../../core/services/external-services-manager.service';
import { db } from '../../../core/services/database.service';
import { MockAdapterService } from '../../../core/services/mock-adapter.service';
import { ToastController } from '@ionic/angular';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { CapacitorHttpService } from '../../../core/services/capacitor-http.service';
import { API_GATEWAY_BASE_URL } from '../../config/api-base-url';
import { firstValueFrom } from 'rxjs';

interface DebugInfo {
  platform: string;
  version: string;
  deviceModel: string;
  osVersion: string;
  networkStatus: string;
  environment: string;
  apiBaseUrl: string;
  tidepoolEnabled: boolean;
  tidepoolMockEnabled: boolean;
  localBackendEnabled: boolean;
}

interface BackofficeTokenResponse {
  access_token: string;
}

interface BackofficeQueueEntry {
  queue_placement?: string | number;
  user_id?: string | number;
  [key: string]: unknown;
}

interface BackofficeResolutionPayload {
  appointment_id: number;
  change_basal_type: string;
  change_basal_dose: number;
  change_basal_time: string;
  change_fast_type: string;
  change_ratio: number;
  change_sensitivity: number;
  emergency_care: boolean;
  needed_physical_appointment: boolean;
  glucose_scale: [string, number][];
}

interface AuthStatus {
  tidepool?: {
    isAuthenticated: boolean;
    userId: string;
  };
}

interface StorageStats {
  readings: number;
  syncQueue: number;
}

const BACKOFFICE_BASE_URL = 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const BACKOFFICE_ADMIN_USER = 'admin';
const BACKOFFICE_ADMIN_PASSWORD = 'admin';

@Component({
  selector: 'app-debug-panel',
  templateUrl: './debug-panel.component.html',
  styleUrls: ['./debug-panel.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AppIconComponent,
    // Ionic standalone components
    IonFabButton,
    IonIcon,
    IonButton,
  ],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('200ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
})
export class DebugPanelComponent implements OnInit {
  isOpen = false;
  selectedTab = 'info';
  debugInfo: DebugInfo | null = null;
  authStatus: AuthStatus | null = null;
  servicesHealth: ExternalServicesState | null = null;
  storageStats: StorageStats | null = null;

  // Feature flags (editable)
  features = {
    offlineMode: environment.features.offlineMode,
    useTidepoolIntegration: environment.features.useTidepoolIntegration,
    useTidepoolMock: environment.features.useTidepoolMock,
    useLocalBackend: environment.features.useLocalBackend,
  };

  // Mock configuration
  mockConfig = {
    enabled: false,
    services: {
      appointments: false,
      glucoserver: false,
      auth: false,
    },
  };

  // Custom backend URL override
  customBackendUrl = '';

  // Cached admin token for backoffice actions
  private backofficeToken: string | null = null;

  constructor(
    private tidepoolAuth: TidepoolAuthService,
    private localAuth: LocalAuthService,
    private servicesManager: ExternalServicesManager,
    private mockAdapter: MockAdapterService,
    private toastController: ToastController,
    private capacitorHttp: CapacitorHttpService
  ) {}

  async ngOnInit() {
    await this.loadDebugInfo();
    this.loadMockConfig();
  }

  async loadDebugInfo() {
    // Get device info
    const deviceInfo = await Device.getInfo();
    const networkStatus = await Network.getStatus();

    this.debugInfo = {
      platform: Capacitor.getPlatform(),
      version: '1.0.0-dev', // Static version since appVersion is not available
      deviceModel: deviceInfo.model,
      osVersion: deviceInfo.osVersion,
      networkStatus: networkStatus.connected ? 'Online' : 'Offline',
      environment: environment.production ? 'production' : 'development',
      apiBaseUrl: environment.backendServices.apiGateway.baseUrl,
      tidepoolEnabled: environment.features.useTidepoolIntegration,
      tidepoolMockEnabled: environment.features.useTidepoolMock,
      localBackendEnabled: environment.features.useLocalBackend,
    };

    // Subscribe to auth status (note: authState$ may need to be public)
    // Commenting out until service is updated
    // this.tidepoolAuth.authState$.subscribe(state => {
    //   this.authStatus = {
    //     tidepool: {
    //       isAuthenticated: state.isAuthenticated,
    //       userId: state.userId || 'N/A',
    //     },
    //   };
    // });

    // Subscribe to services health
    this.servicesManager.state.subscribe((state: ExternalServicesState) => {
      this.servicesHealth = state;
    });

    // Get storage stats
    await this.loadStorageStats();

    // Load custom backend URL from storage
    const { value } = await Preferences.get({ key: 'debug_custom_backend_url' });
    if (value) {
      this.customBackendUrl = value;
    }
  }

  async loadStorageStats() {
    const readingsCount = await db.readings.count();
    const syncQueueCount = await db.syncQueue.count();

    this.storageStats = {
      readings: readingsCount,
      syncQueue: syncQueueCount,
    };
  }

  togglePanel() {
    this.isOpen = !this.isOpen;
  }

  async clearAllData() {
    if (confirm('⚠️ This will delete ALL local data. Are you sure?')) {
      await db.readings.clear();
      await db.syncQueue.clear();
      await Preferences.clear();
      alert('✅ All data cleared. Please restart the app.');
      window.location.reload();
    }
  }

  async clearReadings() {
    if (confirm('⚠️ This will delete all glucose readings. Continue?')) {
      await db.readings.clear();
      await this.loadStorageStats();
      alert('✅ Readings cleared');
    }
  }

  async clearPreferences() {
    if (confirm('⚠️ This will clear all app preferences. Continue?')) {
      await Preferences.clear();
      alert('✅ Preferences cleared. Please restart the app.');
      window.location.reload();
    }
  }

  async forceSync() {
    alert('🔄 Starting sync...');
    try {
      // Trigger sync (implementation depends on your sync service)
      alert('✅ Sync completed');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert('❌ Sync failed: ' + message);
    }
  }

  async saveCustomBackendUrl() {
    if (this.customBackendUrl) {
      await Preferences.set({
        key: 'debug_custom_backend_url',
        value: this.customBackendUrl,
      });
      alert('✅ Custom backend URL saved. Please restart the app to apply changes.');
    }
  }

  async clearCustomBackendUrl() {
    await Preferences.remove({ key: 'debug_custom_backend_url' });
    this.customBackendUrl = '';
    alert('✅ Custom backend URL cleared. Please restart the app.');
  }

  simulateAccountState(state: 'pending' | 'active' | 'disabled') {
    // This would need to be implemented in your auth service
    alert(
      `🎭 Simulating account state: ${state}\n\nNote: This requires backend support to actually work.`
    );
  }

  copyDebugInfo() {
    const info = JSON.stringify(
      {
        debugInfo: this.debugInfo,
        authStatus: this.authStatus,
        servicesHealth: this.servicesHealth,
        storageStats: this.storageStats,
      },
      null,
      2
    );

    navigator.clipboard.writeText(info).then(() => {
      alert('✅ Debug info copied to clipboard');
    });
  }

  getHealthColor(status: HealthStatus): string {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 'success';
      case HealthStatus.DEGRADED:
        return 'warning';
      case HealthStatus.UNHEALTHY:
        return 'danger';
      case HealthStatus.CHECKING:
        return 'primary';
      default:
        return 'medium';
    }
  }

  getSyncStatusColor(status: string): string {
    switch (status) {
      case 'syncing':
        return 'primary';
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Load mock configuration
   */
  loadMockConfig() {
    this.mockConfig = this.mockAdapter.getConfig();
  }

  /**
   * Toggle mock mode globally
   */
  async toggleMockMode(enabled: boolean) {
    this.mockAdapter.useMockBackend(enabled);
    this.loadMockConfig();
    await this.showToast(
      enabled ? '🟢 Mock mode enabled' : '🔴 Mock mode disabled',
      enabled ? 'success' : 'medium'
    );
  }

  /**
   * Toggle mock for specific service
   */
  async toggleServiceMock(service: 'appointments' | 'glucoserver' | 'auth', enabled: boolean) {
    this.mockAdapter.setServiceMockEnabled(service, enabled);
    this.loadMockConfig();
    await this.showToast(
      `${this.getServiceDisplayName(service)}: ${enabled ? '🟢 Mock' : '🔴 Real'}`,
      enabled ? 'success' : 'medium'
    );
  }

  /**
   * Enable all mocks
   */
  async enableAllMocks() {
    this.mockAdapter.useMockBackend(true);
    this.mockAdapter.setServiceMockEnabled('appointments', true);
    this.mockAdapter.setServiceMockEnabled('glucoserver', true);
    this.mockAdapter.setServiceMockEnabled('auth', true);
    this.loadMockConfig();
    await this.showToast('✅ All services using mock data', 'success');
  }

  /**
   * Disable all mocks
   */
  async disableAllMocks() {
    this.mockAdapter.useMockBackend(false);
    this.loadMockConfig();
    await this.showToast('⚠️ All services using real backends', 'warning');
  }

  /**
   * Clear all mock data
   */
  async clearMockData() {
    if (confirm('⚠️ This will clear all mock data (readings, appointments, profile). Continue?')) {
      this.mockAdapter.clearAllMockData();
      await this.showToast('🗑️ Mock data cleared', 'medium');
    }
  }

  /**
   * Get service display name
   */
  private getServiceDisplayName(service: string): string {
    switch (service) {
      case 'appointments':
        return 'Appointments';
      case 'glucoserver':
        return 'Glucose Readings';
      case 'auth':
        return 'Authentication';
      default:
        return service;
    }
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  // =========================================================
  // Dev helper actions (backoffice + gateway)
  // =========================================================

  /**
   * Acquire an admin JWT from the backoffice API (Heroku).
   * Token is cached for the session.
   */
  private async getBackofficeToken(): Promise<string> {
    if (this.backofficeToken) {
      return this.backofficeToken;
    }

    const body = `username=${encodeURIComponent(BACKOFFICE_ADMIN_USER)}&password=${encodeURIComponent(
      BACKOFFICE_ADMIN_PASSWORD
    )}`;

    const response = await firstValueFrom(
      this.capacitorHttp.post<BackofficeTokenResponse>(`${BACKOFFICE_BASE_URL}/token`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );

    if (!response?.access_token) {
      throw new Error('No access token returned from backoffice');
    }

    this.backofficeToken = response.access_token;
    return this.backofficeToken;
  }

  /**
   * Accept the next pending appointment in the queue.
   */
  async devAcceptNextAppointment(): Promise<void> {
    try {
      const token = await this.getBackofficeToken();
      const headers = { Authorization: `Bearer ${token}` };

      const pending = await firstValueFrom(
        this.capacitorHttp.get<BackofficeQueueEntry[]>(
          `${BACKOFFICE_BASE_URL}/appointments/pending`,
          {
            headers,
          }
        )
      );

      if (!pending || pending.length === 0) {
        await this.showToast('No pending appointments in queue', 'medium');
        return;
      }

      const entry = pending[0];
      const placement = entry.queue_placement ?? '(unknown)';

      await firstValueFrom(
        this.capacitorHttp.put(
          `${BACKOFFICE_BASE_URL}/appointments/accept/${placement}`,
          {},
          { headers }
        )
      );

      await this.showToast(`Accepted appointment in queue position ${placement}`, 'success');
    } catch (error: unknown) {
      await this.showToast(this.formatError(error, 'Failed to accept next appointment'), 'danger');
    }
  }

  /**
   * Deny the next pending appointment in the queue.
   */
  async devDenyNextAppointment(): Promise<void> {
    try {
      const token = await this.getBackofficeToken();
      const headers = { Authorization: `Bearer ${token}` };

      const pending = await firstValueFrom(
        this.capacitorHttp.get<BackofficeQueueEntry[]>(
          `${BACKOFFICE_BASE_URL}/appointments/pending`,
          {
            headers,
          }
        )
      );

      if (!pending || pending.length === 0) {
        await this.showToast('No pending appointments in queue', 'medium');
        return;
      }

      const entry = pending[0];
      const placement = entry.queue_placement ?? '(unknown)';

      await firstValueFrom(
        this.capacitorHttp.put(
          `${BACKOFFICE_BASE_URL}/appointments/deny/${placement}`,
          {},
          { headers }
        )
      );

      await this.showToast(`Denied appointment in queue position ${placement}`, 'warning');
    } catch (error: unknown) {
      await this.showToast(this.formatError(error, 'Failed to deny next appointment'), 'danger');
    }
  }

  /**
   * Clear the entire appointments queue in backoffice.
   */
  async devClearAppointmentQueue(): Promise<void> {
    const confirmed = confirm(
      '⚠️ This will clear the ENTIRE appointment queue in the Heroku backoffice.\n\nAre you sure?'
    );
    if (!confirmed) {
      return;
    }

    try {
      const token = await this.getBackofficeToken();
      const headers = { Authorization: `Bearer ${token}` };

      await firstValueFrom(
        this.capacitorHttp.delete(`${BACKOFFICE_BASE_URL}/appointments`, {
          headers,
        })
      );

      await this.showToast('Appointment queue cleared', 'success');
    } catch (error: unknown) {
      await this.showToast(this.formatError(error, 'Failed to clear appointment queue'), 'danger');
    }
  }

  /**
   * Create a sample resolution for a given appointment ID (backoffice).
   * Mirrors scripts/appointments/create-resolution.sh with safe defaults.
   */
  async devCreateResolution(): Promise<void> {
    const input = prompt(
      'Enter appointment_id to create a resolution for (you can get IDs from the backoffice or API logs):'
    );
    if (!input) {
      return;
    }

    const appointmentId = Number(input);
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
      await this.showToast('Invalid appointment_id', 'warning');
      return;
    }

    const confirmed = confirm(
      `Create a sample resolution for appointment ${appointmentId} in the backoffice?`
    );
    if (!confirmed) {
      return;
    }

    try {
      const token = await this.getBackofficeToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const payload: BackofficeResolutionPayload = {
        appointment_id: appointmentId,
        change_basal_type: 'Lantus',
        change_basal_dose: 18.0,
        change_basal_time: '22:00:00',
        change_fast_type: 'Humalog',
        change_ratio: 10.0,
        change_sensitivity: 45.0,
        emergency_care: false,
        needed_physical_appointment: false,
        glucose_scale: [
          ['<70', 0],
          ['70-120', 0],
          ['120-180', 1],
          ['180-250', 2],
          ['>250', 3],
        ],
      };

      await firstValueFrom(
        this.capacitorHttp.post(
          `${BACKOFFICE_BASE_URL}/appointments/${appointmentId}/resolution`,
          payload,
          { headers }
        )
      );

      await this.showToast(`Resolution created for appointment ${appointmentId}`, 'success');
    } catch (error: unknown) {
      await this.showToast(this.formatError(error, 'Failed to create resolution'), 'danger');
    }
  }

  /**
   * Create a new test user via the main API gateway.
   * Uses the same endpoint as scripts/appointments/create-user.sh.
   */
  async devCreateTestUser(): Promise<void> {
    const email = `devuser+${Date.now()}@example.com`;
    const password = 'Test123!';

    const payload = {
      email,
      password,
      firstName: 'Dev',
      lastName: 'User',
      role: 'patient',
    };

    try {
      await firstValueFrom(
        this.capacitorHttp.post(`${API_GATEWAY_BASE_URL}/api/auth/register`, payload, {
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await this.showToast(`User created:\n${email}\nPassword: ${password}`, 'success');
    } catch (error: unknown) {
      await this.showToast(this.formatError(error, 'Failed to create user'), 'danger');
    }
  }

  /**
   * Compact error formatter for dev tools.
   */
  private formatError(error: unknown, fallback: string): string {
    if (!error) {
      return fallback;
    }

    if (typeof error === 'string') {
      return `${fallback}: ${error}`;
    }

    if (error instanceof Error) {
      return `${fallback}: ${error.message}`;
    }

    // Handle HTTP error responses
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      const errorObj = err['error'] as Record<string, unknown> | undefined;

      const detail =
        errorObj?.['detail'] ||
        errorObj?.['message'] ||
        err['message'] ||
        (typeof err['error'] === 'string' ? err['error'] : '');

      return detail ? `${fallback}: ${detail}` : fallback;
    }

    return fallback;
  }
}
