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
