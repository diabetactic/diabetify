import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ExtServicesClientService } from '../core/services/ext-services-client.service';

@Component({
  selector: 'app-integration-test',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>🧪 Integration Tests</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="test-container">

        <!-- API URL Display -->
        <div class="test-section">
          <h3>🌐 API Gateway URL</h3>
          <p class="api-url">{{ apiUrl }}</p>
        </div>

        <!-- Login Test -->
        <div class="test-section">
          <h3>🔑 Login Test</h3>
          <ion-input [(ngModel)]="testUser" placeholder="Username (1000)" fill="outline"></ion-input>
          <ion-input [(ngModel)]="testPassword" type="password" placeholder="Password" fill="outline"></ion-input>
          <ion-button expand="block" (click)="testLogin()">Test Login</ion-button>
          <div class="result" [class.success]="loginResult?.success" [class.error]="loginResult?.error">
            {{ loginResult?.message }}
          </div>
        </div>

        <!-- User Profile Test -->
        <div class="test-section">
          <h3>👤 User Profile Test</h3>
          <ion-button expand="block" (click)="testUserProfile()" [disabled]="!hasToken">Get User Profile</ion-button>
          <pre class="result">{{ userProfileResult | json }}</pre>
        </div>

        <!-- Appointments Tests -->
        <div class="test-section">
          <h3>📅 Appointments Tests</h3>

          <ion-button expand="block" (click)="testGetAppointments()" [disabled]="!hasToken">
            Get My Appointments
          </ion-button>
          <pre class="result">{{ appointmentsResult | json }}</pre>

          <hr/>

          <h4>Create Appointment</h4>
          <ion-input [(ngModel)]="newAppointment.date" type="date" placeholder="Date" fill="outline"></ion-input>
          <ion-input [(ngModel)]="newAppointment.time" type="time" placeholder="Time" fill="outline"></ion-input>
          <ion-input [(ngModel)]="newAppointment.type" placeholder="Type" fill="outline"></ion-input>
          <ion-button expand="block" (click)="testCreateAppointment()" [disabled]="!hasToken">
            Create Appointment
          </ion-button>
          <pre class="result">{{ createAppointmentResult | json }}</pre>

          <hr/>

          <h4>🏥 Backoffice: Queue State</h4>
          <ion-button expand="block" (click)="testAppointmentQueueState()" [disabled]="!hasToken">
            Get Queue State
          </ion-button>
          <pre class="result">{{ queueStateResult | json }}</pre>

          <hr/>

          <h4>🏥 Backoffice: Submit to Queue</h4>
          <ion-input [(ngModel)]="submitAppointmentId" placeholder="Appointment ID" fill="outline"></ion-input>
          <ion-button expand="block" (click)="testSubmitAppointment()" [disabled]="!hasToken">
            Submit Appointment
          </ion-button>
          <pre class="result">{{ submitResult | json }}</pre>

          <hr/>

          <h4>🏥 Backoffice: Get Resolution</h4>
          <ion-input [(ngModel)]="resolutionAppointmentId" placeholder="Appointment ID" fill="outline"></ion-input>
          <ion-button expand="block" (click)="testGetResolution()" [disabled]="!hasToken">
            Get Resolution
          </ion-button>
          <pre class="result">{{ resolutionResult | json }}</pre>
        </div>

        <!-- Glucose Tests -->
        <div class="test-section">
          <h3>🩸 Glucose Tests</h3>

          <ion-button expand="block" (click)="testGetGlucose()" [disabled]="!hasToken">
            Get My Readings
          </ion-button>
          <pre class="result">{{ glucoseResult | json }}</pre>

          <hr/>

          <h4>Create Reading</h4>
          <ion-input [(ngModel)]="newReading.glucose" type="number" placeholder="Glucose Level" fill="outline"></ion-input>
          <ion-select [(ngModel)]="newReading.type" placeholder="Select Type">
            <ion-select-option value="before_meal">Before Meal</ion-select-option>
            <ion-select-option value="after_meal">After Meal</ion-select-option>
            <ion-select-option value="fasting">Fasting</ion-select-option>
          </ion-select>
          <ion-button expand="block" (click)="testCreateReading()" [disabled]="!hasToken">
            Create Reading
          </ion-button>
          <pre class="result">{{ createReadingResult | json }}</pre>
        </div>

        <!-- Token Info -->
        <div class="test-section">
          <h3>🎫 Current Token</h3>
          <div class="token-info">
            <strong>Has Token:</strong> {{ hasToken ? '✅ Yes' : '❌ No' }}
          </div>
          <ion-button expand="block" color="danger" (click)="clearToken()">Clear Token</ion-button>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .test-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .test-section {
      margin-bottom: 2rem;
      padding: 1rem;
      border: 1px solid var(--ion-color-medium);
      border-radius: 8px;
    }
    .api-url {
      font-family: monospace;
      background: var(--ion-color-light);
      padding: 0.5rem;
      border-radius: 4px;
      word-break: break-all;
    }
    .result {
      margin-top: 1rem;
      padding: 0.5rem;
      background: var(--ion-color-light);
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      max-height: 300px;
      overflow: auto;
    }
    .result.success {
      background: #d4edda;
      color: #155724;
    }
    .result.error {
      background: #f8d7da;
      color: #721c24;
    }
    ion-input, ion-select {
      margin-bottom: 0.5rem;
    }
    hr {
      margin: 1rem 0;
      border: none;
      border-top: 1px solid var(--ion-color-medium);
    }
    h4 {
      margin-top: 1rem;
    }
    .token-info {
      padding: 0.5rem;
      background: var(--ion-color-light);
      border-radius: 4px;
      margin-bottom: 1rem;
    }
  `]
})
export class IntegrationTestPage implements OnInit {
  // API URL
  apiUrl: string;

  // Test credentials
  testUser = '1000';
  testPassword = 'tuvieja';

  // Results
  loginResult: any = null;
  userProfileResult: any = null;
  appointmentsResult: any = null;
  createAppointmentResult: any = null;
  queueStateResult: any = null;
  submitResult: any = null;
  resolutionResult: any = null;
  glucoseResult: any = null;
  createReadingResult: any = null;

  // Form data
  newAppointment = {
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    type: 'consultation'
  };
  submitAppointmentId = '';
  resolutionAppointmentId = '';
  newReading = {
    glucose: 120,
    type: 'before_meal'
  };

  get hasToken(): boolean {
    return !!this.extServices.getAccessToken();
  }

  constructor(public extServices: ExtServicesClientService) {
    this.apiUrl = this.extServices.apiGatewayUrl;
  }

  ngOnInit() {
    console.log('🧪 Integration Test Page loaded');
    console.log('API Gateway URL:', this.apiUrl);
  }

  // Login Test
  testLogin() {
    console.log('🔑 Testing login with:', this.testUser);
    this.loginResult = { message: 'Testing...' };

    this.extServices.login(this.testUser, this.testPassword).subscribe({
      next: (response) => {
        console.log('✅ Login SUCCESS:', response);
        this.loginResult = {
          success: true,
          message: `✅ Login exitoso! Token: ${response.token.access_token.substring(0, 20)}...`,
          data: response
        };
        // Also fetch user profile automatically
        this.testUserProfile();
      },
      error: (error) => {
        console.error('❌ Login ERROR:', error);
        this.loginResult = {
          error: true,
          message: `❌ Login failed: ${error.message}`,
          data: error
        };
      }
    });
  }

  // User Profile Test
  testUserProfile() {
    console.log('👤 Testing get user profile');
    this.userProfileResult = 'Loading...';

    this.extServices.getUserProfile().subscribe({
      next: (profile) => {
        console.log('✅ User Profile SUCCESS:', profile);
        this.userProfileResult = profile;
      },
      error: (error) => {
        console.error('❌ User Profile ERROR:', error);
        this.userProfileResult = { error: error.message };
      }
    });
  }

  // Get Appointments Test
  testGetAppointments() {
    console.log('📅 Testing get appointments');
    this.appointmentsResult = 'Loading...';

    this.extServices.getAppointments().subscribe({
      next: (appointments) => {
        console.log('✅ Appointments SUCCESS:', appointments);
        this.appointmentsResult = appointments;
      },
      error: (error) => {
        console.error('❌ Appointments ERROR:', error);
        this.appointmentsResult = { error: error.message };
      }
    });
  }

  // Create Appointment Test
  testCreateAppointment() {
    console.log('📅 Testing create appointment:', this.newAppointment);
    this.createAppointmentResult = 'Creating...';

    const startTime = `${this.newAppointment.date}T${this.newAppointment.time}:00`;

    this.extServices.createAppointment({
      start_time: startTime,
      type_: this.newAppointment.type,
      data_field1: 'Test appointment from integration page',
      data_field2: ''
    }).subscribe({
      next: (appointment) => {
        console.log('✅ Create Appointment SUCCESS:', appointment);
        this.createAppointmentResult = appointment;
        this.submitAppointmentId = appointment.id.toString();
      },
      error: (error) => {
        console.error('❌ Create Appointment ERROR:', error);
        this.createAppointmentResult = { error: error.message };
      }
    });
  }

  // Queue State Test (Backoffice)
  testAppointmentQueueState() {
    console.log('🏥 Testing appointment queue state');
    this.queueStateResult = 'Loading...';

    const headers = {
      'Authorization': `Bearer ${this.extServices.getAccessToken()}`
    };

    this.extServices.http.get(`${this.apiUrl}/appointments/state`, { headers }).subscribe({
      next: (state) => {
        console.log('✅ Queue State SUCCESS:', state);
        this.queueStateResult = state;
      },
      error: (error) => {
        console.error('❌ Queue State ERROR:', error);
        this.queueStateResult = { error: error.message };
      }
    });
  }

  // Submit Appointment Test (Backoffice)
  testSubmitAppointment() {
    console.log('🏥 Testing submit appointment:', this.submitAppointmentId);
    this.submitResult = 'Submitting...';

    const headers = {
      'Authorization': `Bearer ${this.extServices.getAccessToken()}`,
      'Content-Type': 'application/json'
    };

    this.extServices.http.post(
      `${this.apiUrl}/appointments/submit`,
      { appointment_id: this.submitAppointmentId },
      { headers }
    ).subscribe({
      next: (result) => {
        console.log('✅ Submit Appointment SUCCESS:', result);
        this.submitResult = result;
      },
      error: (error) => {
        console.error('❌ Submit Appointment ERROR:', error);
        this.submitResult = { error: error.message };
      }
    });
  }

  // Get Resolution Test (Backoffice)
  testGetResolution() {
    console.log('🏥 Testing get resolution:', this.resolutionAppointmentId);
    this.resolutionResult = 'Loading...';

    const headers = {
      'Authorization': `Bearer ${this.extServices.getAccessToken()}`
    };

    this.extServices.http.get(
      `${this.apiUrl}/appointments/${this.resolutionAppointmentId}/resolution`,
      { headers }
    ).subscribe({
      next: (resolution) => {
        console.log('✅ Resolution SUCCESS:', resolution);
        this.resolutionResult = resolution;
      },
      error: (error) => {
        console.error('❌ Resolution ERROR:', error);
        this.resolutionResult = { error: error.message };
      }
    });
  }

  // Get Glucose Test
  testGetGlucose() {
    console.log('🩸 Testing get glucose readings');
    this.glucoseResult = 'Loading...';

    this.extServices.getGlucoseReadings().subscribe({
      next: (data) => {
        console.log('✅ Glucose Readings SUCCESS:', data);
        this.glucoseResult = data;
      },
      error: (error) => {
        console.error('❌ Glucose Readings ERROR:', error);
        this.glucoseResult = { error: error.message };
      }
    });
  }

  // Create Reading Test
  testCreateReading() {
    console.log('🩸 Testing create glucose reading:', this.newReading);
    this.createReadingResult = 'Creating...';

    this.extServices.createGlucoseReading(
      this.newReading.glucose,
      this.newReading.type
    ).subscribe({
      next: (reading) => {
        console.log('✅ Create Reading SUCCESS:', reading);
        this.createReadingResult = reading;
      },
      error: (error) => {
        console.error('❌ Create Reading ERROR:', error);
        this.createReadingResult = { error: error.message };
      }
    });
  }

  clearToken() {
    this.extServices.logout();
    this.loginResult = null;
    this.userProfileResult = null;
    this.appointmentsResult = null;
    this.glucoseResult = null;
    console.log('🗑️ Token cleared');
  }
}
