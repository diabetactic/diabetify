import { Injectable } from '@angular/core';
import { ApiGatewayService } from '../core/services/api-gateway.service';
import { LocalAuthService } from '../core/services/local-auth.service';
import { firstValueFrom } from 'rxjs';
import { API_GATEWAY_BASE_URL } from '../shared/config/api-base-url';

// Backend appointment type from ExtServices API
export interface AppointmentPost {
  glucose_objective: number;
  insulin_type: string;
  dose: number;
  fast_insulin: string;
  fixed_dose: number;
  ratio: number;
  sensitivity: number;
  pump_type: string;
  another_treatment?: string | null;
  control_data: string;
  motive: string[];
  other_motive?: string | null;
}

export interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
  data?: Record<string, unknown>;
  error?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class AutoTestService {
  private results: TestResult[] = [];
  public readonly apiGatewayUrl: string;

  constructor(
    private apiGateway: ApiGatewayService,
    private localAuth: LocalAuthService
  ) {
    this.apiGatewayUrl = API_GATEWAY_BASE_URL;
  }

  async runAllTests(username: string, password: string): Promise<TestResult[]> {
    this.results = [];

    console.log('🚀 Starting automated tests against Heroku...');
    console.log('🌐 API URL:', this.apiGatewayUrl);

    // Test 1: Login
    await this.test('1. POST /token (Login)', async () => {
      const response = await firstValueFrom(
        this.apiGateway.request<{ access_token: string; token_type: string }>('auth.token', {
          body: { username, password },
        })
      );
      if (!response.success || !response.data?.access_token) {
        throw new Error('No token received');
      }
      // Store token for subsequent requests
      localStorage.setItem('access_token', response.data.access_token);
      return { token: `${response.data.access_token.substring(0, 20)}...` };
    });

    // Test 2: User Profile
    await this.test('2. GET /users/me (User Profile)', async () => {
      const response = await firstValueFrom(
        this.apiGateway.request<{
          dni: string;
          name: string;
          email: string;
          state: string;
        }>('extservices.users.me')
      );
      if (!response.success || !response.data?.dni) {
        throw new Error('Invalid user profile');
      }
      return {
        dni: response.data.dni,
        name: response.data.name,
        email: response.data.email,
        state: response.data.state,
      };
    });

    // Test 3: Get Appointments
    await this.test('3. GET /appointments/mine', async () => {
      const response = await firstValueFrom(
        this.apiGateway.request<unknown[]>('extservices.appointments.mine')
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch appointments');
      }
      const appointments = response.data || [];
      return { count: appointments.length, appointments: appointments.slice(0, 2) };
    });

    // Test 4: Get Appointment State
    await this.test('4. GET /appointments/state', async () => {
      const response = await firstValueFrom(
        this.apiGateway.request<string>('extservices.appointments.state')
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch appointment state');
      }
      return { state: response.data };
    });

    // Test 5: Create Appointment
    await this.test('5. POST /appointments/create', async () => {
      const appointmentData: AppointmentPost = {
        glucose_objective: 120,
        insulin_type: 'Lantus',
        dose: 10,
        fast_insulin: 'Humalog',
        fixed_dose: 5,
        ratio: 1.5,
        sensitivity: 50,
        pump_type: 'None',
        control_data: 'Automated test data',
        motive: ['AJUSTE'],
        another_treatment: null,
        other_motive: null,
      };
      const response = await firstValueFrom(
        this.apiGateway.request<{
          appointment_id: number;
          user_id: number;
          motive: string[];
        }>('extservices.appointments.create', { body: appointmentData })
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create appointment');
      }
      return {
        appointment_id: response.data?.appointment_id,
        user_id: response.data?.user_id,
        motive: response.data?.motive,
      };
    });

    // Test 6: Submit Appointment
    await this.test('6. POST /appointments/submit', async () => {
      const response = await firstValueFrom(
        this.apiGateway.request<number>('extservices.appointments.submit', { body: {} })
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to submit appointment');
      }
      return { submitted_id: response.data };
    });

    // Test 7: Get Glucose Readings
    await this.test('7. GET /glucose/mine', async () => {
      const response = await firstValueFrom(
        this.apiGateway.request<{ readings: unknown[] }>('extservices.glucose.mine')
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch glucose readings');
      }
      const readings = response.data?.readings || [];
      return {
        count: readings.length,
        sample: readings.slice(0, 2),
      };
    });

    // Test 8: Get Latest Glucose Readings
    await this.test('8. GET /glucose/mine/latest', async () => {
      const response = await firstValueFrom(
        this.apiGateway.request<{ readings: unknown[] }>('extservices.glucose.latest')
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch latest glucose readings');
      }
      const readings = response.data?.readings || [];
      return {
        count: readings.length,
        sample: readings.slice(0, 2),
      };
    });

    // Test 9: Create Glucose Reading
    await this.test('9. POST /glucose/create', async () => {
      const response = await firstValueFrom(
        this.apiGateway.request<{
          id: number;
          glucose_level: number;
          reading_type: string;
        }>('extservices.glucose.create', {
          params: { glucose_level: '125', reading_type: 'DESAYUNO' },
        })
      );
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create glucose reading');
      }
      return {
        reading_id: response.data?.id,
        glucose_level: response.data?.glucose_level,
        reading_type: response.data?.reading_type,
      };
    });

    console.log('✅ All tests completed');
    console.log(`Results: ${this.getSuccessCount()}/${this.results.length} passed`);

    return this.results;
  }

  private async test(name: string, fn: () => Promise<Record<string, unknown>>): Promise<void> {
    const result: TestResult = {
      name,
      status: 'pending',
      message: 'Running...',
    };

    this.results.push(result);
    const start = Date.now();

    try {
      const data = await fn();
      result.status = 'success';
      result.message = '✅ Success';
      result.data = data;
      result.duration = Date.now() - start;
      console.log(`✅ ${name} (${result.duration}ms)`, data);
    } catch (error: unknown) {
      result.status = 'error';
      result.message = `❌ ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.error = error;
      result.duration = Date.now() - start;
      console.error(`❌ ${name} (${result.duration}ms)`, error);
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSuccessCount(): number {
    return this.results.filter(r => r.status === 'success').length;
  }

  getErrorCount(): number {
    return this.results.filter(r => r.status === 'error').length;
  }

  getTotalDuration(): number {
    return this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
  }
}
