import { APIRequestContext } from '@playwright/test';
import { API_URL, PRIMARY_USER, TIMEOUTS, type TestUser } from '../../config/test-config';

export interface GlucoseReading {
  id: number;
  glucose_level: number;
  reading_type: string;
  notes?: string;
  created_at: string;
  user_id: number;
}

export interface Appointment {
  id: number;
  user_id: number;
  status: string;
  created_at: string;
  reason?: string;
}

export interface UserProfile {
  user_id: number;
  dni: string;
  name: string;
  surname: string;
  email: string;
  hospital_account: string; // Backend accepts any string (unique per user)
}

export class ApiClient {
  private token: string | null = null;

  constructor(
    private request: APIRequestContext,
    private baseUrl: string = API_URL
  ) {}

  async login(user: TestUser = PRIMARY_USER): Promise<string> {
    const response = await this.request.post(`${this.baseUrl}/token`, {
      form: {
        username: user.dni,
        password: user.password,
      },
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Login failed: ${response.status()} - ${text}`);
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

  async getProfile(): Promise<UserProfile> {
    const response = await this.request.get(`${this.baseUrl}/users/me`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      throw new Error(`Failed to get profile: ${response.status()}`);
    }

    return response.json();
  }

  async getReadings(): Promise<GlucoseReading[]> {
    const response = await this.request.get(`${this.baseUrl}/glucose/mine`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      throw new Error(`Failed to get readings: ${response.status()}`);
    }

    const data = await response.json();
    return data.readings || data || [];
  }

  async createReading(
    glucoseLevel: number,
    readingType: string = 'OTRO',
    notes?: string
  ): Promise<GlucoseReading> {
    const params = new URLSearchParams({
      glucose_level: glucoseLevel.toString(),
      reading_type: readingType,
    });

    if (notes) {
      params.append('notes', notes);
    }

    const response = await this.request.post(`${this.baseUrl}/glucose/create?${params}`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Failed to create reading: ${response.status()} - ${text}`);
    }

    return response.json();
  }

  async deleteReading(id: number): Promise<void> {
    const response = await this.request.delete(`${this.baseUrl}/glucose/delete/${id}`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok() && response.status() !== 404) {
      throw new Error(`Failed to delete reading: ${response.status()}`);
    }
  }

  async getAppointmentStatus(): Promise<{ state: string }> {
    const response = await this.request.get(`${this.baseUrl}/appointments/state`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (response.status() === 404) {
      return { state: 'NONE' };
    }

    if (!response.ok()) {
      throw new Error(`Failed to get appointment status: ${response.status()}`);
    }

    const data = await response.json();
    if (typeof data === 'string') {
      return { state: data };
    }
    return data;
  }

  async submitAppointment(): Promise<number> {
    const response = await this.request.post(`${this.baseUrl}/appointments/submit`, {
      headers: this.authHeaders(),
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Failed to submit appointment: ${response.status()} - ${text}`);
    }

    return response.json();
  }

  async createAppointment(appointmentData: {
    date: string;
    time: string;
    reason?: string;
  }): Promise<Appointment> {
    const response = await this.request.post(`${this.baseUrl}/appointments/create`, {
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
      },
      data: appointmentData,
      timeout: TIMEOUTS.api,
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Failed to create appointment: ${response.status()} - ${text}`);
    }

    return response.json();
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }
}
