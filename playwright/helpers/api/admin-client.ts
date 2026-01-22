import { APIRequestContext } from '@playwright/test';
import { BACKOFFICE_URL, ADMIN_CREDENTIALS, TIMEOUTS } from '../../config/test-config';

export type HospitalAccountStatus = string;

export interface QueueStatus {
  isOpen: boolean;
  size: number;
  pending: unknown[];
}

export interface UserStatus {
  dni: string;
  hospital_account: HospitalAccountStatus;
  queue_state?: string;
}

/**
 * Resolution data for completing an appointment.
 * This is submitted by the doctor/admin via the BACKOFFICE API
 * (not the appointments API directly) to ensure email notification is sent.
 */
export interface AppointmentResolution {
  appointment_id: number;
  change_basal_type?: string;
  change_basal_dose?: number;
  change_basal_time?: string;
  change_fast_type?: string;
  change_ratio?: number;
  change_sensitivity?: number;
  emergency_care?: boolean;
  needed_physical_appointment?: boolean;
  glucose_scale?: Array<[number, number, number]>;
}

export class AdminClient {
  private token: string | null = null;

  constructor(
    private request: APIRequestContext,
    private baseUrl: string = BACKOFFICE_URL
  ) {}

  async login(
    username: string = ADMIN_CREDENTIALS.username,
    password: string = ADMIN_CREDENTIALS.password
  ): Promise<string> {
    const response = await this.request.post(`${this.baseUrl}/token`, {
      form: { username, password },
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Admin login failed: ${response.status()} - ${text}`);
    }

    const data = await response.json();
    this.token = data.access_token;
    return this.token as string;
  }

  private authHeaders(): Record<string, string> {
    if (!this.token) {
      throw new Error('Not authenticated. Call login() first.');
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  async getQueueStatus(): Promise<QueueStatus> {
    const [pendingRes, sizeRes, openRes] = await Promise.all([
      this.request.get(`${this.baseUrl}/appointments/queue`, {
        headers: this.authHeaders(),
        timeout: TIMEOUTS.api,
      }),
      this.request.get(`${this.baseUrl}/appointments/queue/size`, {
        headers: this.authHeaders(),
        timeout: TIMEOUTS.api,
      }),
      this.request.get(`${this.baseUrl}/appointments/queue/open`, {
        headers: this.authHeaders(),
        timeout: TIMEOUTS.api,
      }),
    ]);

    if (!pendingRes.ok() || !sizeRes.ok() || !openRes.ok()) {
      throw new Error(
        `Failed to get queue status: pending=${pendingRes.status()}, size=${sizeRes.status()}, open=${openRes.status()}`
      );
    }

    const [pending, size, isOpen] = await Promise.all([
      pendingRes.json(),
      sizeRes.json(),
      openRes.json(),
    ]);

    return { pending, size, isOpen };
  }

  async openQueue(): Promise<void> {
    const response = await this.request.post(`${this.baseUrl}/appointments/queue/open`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      throw new Error(`Failed to open queue: ${response.status()}`);
    }
  }

  async closeQueue(): Promise<void> {
    const response = await this.request.post(`${this.baseUrl}/appointments/queue/close`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      throw new Error(`Failed to close queue: ${response.status()}`);
    }
  }

  async clearQueue(_dni?: string): Promise<void> {
    const response = await this.request.delete(`${this.baseUrl}/appointments`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok() && response.status() !== 404) {
      throw new Error(`Failed to clear queue: ${response.status()}`);
    }
  }

  async acceptUser(queuePlacement: string | number): Promise<void> {
    const response = await this.request.put(
      `${this.baseUrl}/appointments/accept/${queuePlacement}`,
      {
        headers: this.authHeaders(),
        timeout: TIMEOUTS.api,
      }
    );

    if (!response.ok()) {
      throw new Error(`Failed to accept queue placement ${queuePlacement}: ${response.status()}`);
    }
  }

  async denyUser(queuePlacement: string | number): Promise<void> {
    const response = await this.request.put(`${this.baseUrl}/appointments/deny/${queuePlacement}`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      throw new Error(`Failed to deny queue placement ${queuePlacement}: ${response.status()}`);
    }
  }

  /**
   * Resolve an appointment with clinical recommendations.
   * IMPORTANT: This calls the BACKOFFICE API which:
   * 1. Creates the resolution in the appointments service
   * 2. Sends an email notification to the user
   *
   * Do NOT call the appointments API directly - it skips the email.
   */
  async resolveAppointment(resolution: AppointmentResolution): Promise<void> {
    const response = await this.request.post(`${this.baseUrl}/appointments/create_resolution`, {
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
      },
      data: resolution,
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `Failed to resolve appointment ${resolution.appointment_id}: ${response.status()} - ${text}`
      );
    }
  }

  /**
   * Get active appointment ID for a user (needed for resolution).
   * Uses the backoffice endpoint: GET /appointments/from_user/latest/{user_id}
   * Returns the appointment_id if found, null otherwise.
   */
  async getActiveAppointmentId(dni: string): Promise<number | null> {
    const userId = await this.getUserIdByDni(dni);
    const response = await this.request.get(
      `${this.baseUrl}/appointments/from_user/latest/${userId}`,
      {
        headers: this.authHeaders(),
        timeout: TIMEOUTS.api,
      }
    );

    if (!response.ok()) {
      if (response.status() === 404) return null;
      const text = await response.text();
      console.log(
        `[AdminClient] Failed to get appointment for user ${dni}: ${response.status()} - ${text}`
      );
      return null;
    }

    const data = await response.json();
    // The endpoint returns a single appointment object with 'appointment_id' field
    if (data && data.appointment_id) {
      return data.appointment_id;
    }
    return null;
  }

  private async getUserIdByDni(dni: string): Promise<number> {
    const response = await this.request.get(`${this.baseUrl}/users/`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      throw new Error(`Failed to list users: ${response.status()}`);
    }

    const users = (await response.json()) as Array<{ user_id: number; dni: string }>;
    const user = users.find(u => u.dni === dni);
    if (!user) {
      throw new Error(`User with DNI ${dni} not found`);
    }
    return user.user_id;
  }

  async updateHospitalAccountStatus(dni: string, status: HospitalAccountStatus): Promise<void> {
    const userId = await this.getUserIdByDni(dni);
    const response = await this.request.patch(`${this.baseUrl}/users/user/${userId}`, {
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
      },
      data: { hospital_account: status },
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      throw new Error(`Failed to update hospital status for ${dni}: ${response.status()}`);
    }
  }

  async getUserStatus(dni: string): Promise<UserStatus> {
    const userId = await this.getUserIdByDni(dni);
    const response = await this.request.get(`${this.baseUrl}/users/user/${userId}`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      throw new Error(`Failed to get user status for ${dni}: ${response.status()}`);
    }

    const user = await response.json();
    return {
      dni: user.dni,
      hospital_account: user.hospital_account,
      queue_state: undefined,
    };
  }

  async resetTestUser(dni: string): Promise<void> {
    await this.clearQueue(dni);
    await this.updateHospitalAccountStatus(dni, 'accepted');
  }

  async setupTestEnvironment(): Promise<void> {
    await this.openQueue();
  }

  getToken(): string | null {
    return this.token;
  }
}
