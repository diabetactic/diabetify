import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastController, AlertController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { AutoTestService, TestResult } from './auto-test.service';
import { LoggerService } from '../core/services/logger.service';

@Component({
  selector: 'app-integration-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // Ionic standalone components
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>🧪 Automated Integration Tests</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="test-container prose prose-sm">
        <!-- Credentials Section -->
        <div class="credentials-section">
          <h2>🔑 Heroku API Gateway</h2>
          <p class="api-url"><strong>URL:</strong> {{ apiUrl }}</p>

          <ion-item>
            <ion-label position="stacked">Username (DNI)</ion-label>
            <ion-input [(ngModel)]="username" placeholder="1000" [disabled]="running"></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Password</ion-label>
            <ion-input
              [(ngModel)]="password"
              type="password"
              placeholder="tu contraseña"
              [disabled]="running"
            ></ion-input>
          </ion-item>

          <ion-button
            expand="block"
            (click)="runAllTests()"
            [disabled]="running"
            color="success"
            class="run-button"
          >
            <ion-icon
              name="{{ running ? 'hourglass-outline' : 'rocket-outline' }}"
              slot="start"
            ></ion-icon>
            {{ running ? '⏳ Running Tests...' : '🚀 Run All Tests' }}
          </ion-button>
        </div>

        <!-- Results Section -->
        <div *ngIf="results.length > 0" class="results-section">
          <h2>📊 Test Results ({{ successCount }}/{{ results.length }} passed)</h2>

          <div
            *ngFor="let result of results"
            class="test-result"
            [class.success]="result.status === 'success'"
            [class.error]="result.status === 'error'"
            [class.pending]="result.status === 'pending'"
          >
            <div class="result-header">
              <span class="test-name">{{ result.name }}</span>
              <span class="test-duration" *ngIf="result.duration">{{ result.duration }}ms</span>
            </div>

            <div class="result-message">{{ result.message }}</div>

            <div *ngIf="result.data" class="result-data">
              <pre>{{ result.data | json }}</pre>
            </div>

            <div *ngIf="result.error && result.status === 'error'" class="result-error">
              <strong>Error Details:</strong>
              <pre>{{ result.error | json }}</pre>
            </div>
          </div>

          <!-- Summary -->
          <div
            class="summary-card"
            [class.all-pass]="successCount === results.length"
            [class.some-fail]="successCount < results.length"
          >
            <h3>{{ summaryEmoji }} Summary</h3>
            <p>
              <strong>Passed:</strong> {{ successCount }} <br />
              <strong>Failed:</strong> {{ errorCount }} <br />
              <strong>Total Time:</strong> {{ totalDuration }}ms
            </p>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="results.length === 0 && !running" class="empty-state">
          <ion-icon name="flask-outline" size="large"></ion-icon>
          <p>Click "Run All Tests" to start automated testing</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .test-container {
        max-width: 900px;
        margin: 0 auto;
      }

      .credentials-section {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: var(--ion-color-light);
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .credentials-section h2 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 22px;
      }

      .api-url {
        padding: 0.75rem;
        background: white;
        border-radius: 6px;
        font-size: 13px;
        word-break: break-all;
        margin-bottom: 1rem;
        border: 1px solid var(--ion-color-medium);
      }

      ion-item {
        margin-bottom: 1rem;
        --background: white;
        --border-radius: 8px;
      }

      .run-button {
        margin-top: 1rem;
        height: 56px;
        font-size: 18px;
        font-weight: bold;
        --border-radius: 8px;
      }

      .results-section {
        margin-top: 2rem;
      }

      .results-section h2 {
        font-size: 20px;
        margin-bottom: 1.5rem;
        color: var(--ion-color-dark);
      }

      .test-result {
        margin-bottom: 1rem;
        padding: 1.25rem;
        border-radius: 8px;
        border-left: 4px solid var(--ion-color-medium);
        background: white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        transition: all 0.2s ease;
      }

      .test-result:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      }

      .test-result.success {
        border-left-color: var(--ion-color-success);
        background: #f0fdf4;
      }

      .test-result.error {
        border-left-color: var(--ion-color-danger);
        background: #fef2f2;
      }

      .test-result.pending {
        border-left-color: var(--ion-color-warning);
        background: #fffbeb;
        animation: pulse 1.5s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.8;
        }
      }

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .test-name {
        font-weight: 600;
        font-size: 15px;
        color: var(--ion-color-dark);
      }

      .test-duration {
        color: var(--ion-color-medium-shade);
        font-size: 12px;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
        background: var(--ion-color-light);
        border-radius: 4px;
      }

      .result-message {
        font-size: 14px;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }

      .result-data,
      .result-error {
        background: #f5f5f5;
        padding: 0.75rem;
        border-radius: 6px;
        margin-top: 0.75rem;
        border: 1px solid var(--ion-color-light-shade);
      }

      .result-data pre,
      .result-error pre {
        margin: 0;
        font-size: 12px;
        max-height: 250px;
        overflow: auto;
        font-family: 'Courier New', monospace;
        line-height: 1.5;
      }

      .result-error {
        background: #fee;
        border-color: #fcc;
      }

      .summary-card {
        padding: 2rem;
        border-radius: 12px;
        margin-top: 2rem;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .summary-card.all-pass {
        background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
        border: 2px solid var(--ion-color-success);
      }

      .summary-card.some-fail {
        background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
        border: 2px solid var(--ion-color-danger);
      }

      .summary-card h3 {
        font-size: 28px;
        margin-bottom: 1rem;
        font-weight: bold;
      }

      .summary-card p {
        font-size: 16px;
        line-height: 2;
        margin: 0;
      }

      .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--ion-color-medium-shade);
      }

      .empty-state ion-icon {
        font-size: 96px;
        margin-bottom: 1rem;
        opacity: 0.4;
      }

      .empty-state p {
        font-size: 16px;
      }
    `,
  ],
})
export class IntegrationTestPage implements OnInit {
  private logger = inject(LoggerService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  apiUrl: string;
  username = '1000';
  password = 'tuvieja';
  running = false;
  results: TestResult[] = [];

  constructor(private autoTest: AutoTestService) {
    this.apiUrl = this.autoTest.apiGatewayUrl;
  }

  ngOnInit() {
    this.logger.debug('IntegrationTest', 'Integration Test Page loaded');
    this.logger.debug('IntegrationTest', 'API URL', { apiUrl: this.apiUrl });
  }

  async runAllTests() {
    if (!this.password) {
      await this.showToast('Por favor ingresa la contraseña', 'warning');
      return;
    }

    this.running = true;
    this.results = [];

    try {
      this.results = await this.autoTest.runAllTests(this.username, this.password);
    } catch (error) {
      this.logger.error('IntegrationTest', 'Test suite error', error);
      await this.showAlert(
        'Error',
        `Error running tests: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.running = false;
    }
  }

  private async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  get successCount(): number {
    return this.results.filter(r => r.status === 'success').length;
  }

  get errorCount(): number {
    return this.results.filter(r => r.status === 'error').length;
  }

  get totalDuration(): number {
    return this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
  }

  get summaryEmoji(): string {
    if (this.results.length === 0) return '📊';
    if (this.successCount === this.results.length) return '🎉';
    if (this.successCount > 0) return '⚠️';
    return '❌';
  }
}
