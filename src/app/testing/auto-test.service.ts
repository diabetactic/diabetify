import { Injectable } from '@angular/core';
import { ExtServicesClientService, AppointmentPost } from '../core/services/ext-services-client.service';
import { firstValueFrom } from 'rxjs';

export interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
  data?: any;
  error?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AutoTestService {
  private results: TestResult[] = [];

  constructor(private extServices: ExtServicesClientService) {}

  async runAllTests(username: string, password: string): Promise<TestResult[]> {
    this.results = [];

    console.log('🚀 Starting automated tests against Heroku...');
    console.log('🌐 API URL:', this.extServices.apiGatewayUrl);

    // Test 1: Login
    await this.test('1. POST /token (Login)', async () => {
      const result = await firstValueFrom(this.extServices.login(username, password));
      if (!result?.token?.access_token) {
        throw new Error('No token received');
      }
      return { token: result.token.access_token.substring(0, 20) + '...' };
    });

    // Test 2: User Profile
    await this.test('2. GET /users/me (User Profile)', async () => {
      const profile = await firstValueFrom(this.extServices.getUserProfile());
      if (!profile?.dni) {
        throw new Error('Invalid user profile');
      }
      return {
        dni: profile.dni,
        name: profile.name,
        email: profile.email,
        state: profile.state
      };
    });

    // Test 3: Get Appointments
    await this.test('3. GET /appointments/mine', async () => {
      const appointments = await firstValueFrom(this.extServices.getAppointments());
      return { count: appointments?.length || 0, appointments: appointments?.slice(0, 2) };
    });

    // Test 4: Get Appointment State
    await this.test('4. GET /appointments/state', async () => {
      const state = await firstValueFrom(this.extServices.getAppointmentState());
      return { state };
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
        other_motive: null
      };
      const created = await firstValueFrom(this.extServices.createAppointment(appointmentData));
      return {
        appointment_id: created?.appointment_id,
        user_id: created?.user_id,
        motive: created?.motive
      };
    });

    // Test 6: Submit Appointment
    await this.test('6. POST /appointments/submit', async () => {
      const result = await firstValueFrom(this.extServices.submitAppointment());
      return { submitted_id: result };
    });

    // Test 7: Get Glucose Readings
    await this.test('7. GET /glucose/mine', async () => {
      const data = await firstValueFrom(this.extServices.getGlucoseReadings());
      return {
        count: data?.readings?.length || 0,
        sample: data?.readings?.slice(0, 2)
      };
    });

    // Test 8: Get Latest Glucose Readings
    await this.test('8. GET /glucose/mine/latest', async () => {
      const data = await firstValueFrom(this.extServices.getLatestGlucoseReadings());
      return {
        count: data?.readings?.length || 0,
        sample: data?.readings?.slice(0, 2)
      };
    });

    // Test 9: Create Glucose Reading
    await this.test('9. POST /glucose/create', async () => {
      const reading = await firstValueFrom(
        this.extServices.createGlucoseReading(125, 'DESAYUNO')
      );
      return {
        reading_id: reading?.id,
        glucose_level: reading?.glucose_level,
        reading_type: reading?.reading_type
      };
    });

    console.log('✅ All tests completed');
    console.log(`Results: ${this.getSuccessCount()}/${this.results.length} passed`);

    return this.results;
  }

  private async test(name: string, fn: () => Promise<any>): Promise<void> {
    const result: TestResult = {
      name,
      status: 'pending',
      message: 'Running...'
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
    } catch (error: any) {
      result.status = 'error';
      result.message = `❌ ${error.message || 'Unknown error'}`;
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
