import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  Input,
  OnChanges,
  ChangeDetectionStrategy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Appointment } from 'src/app/core/models/appointment.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-appointment-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timeline-container">
      <div class="timeline" [class.denied-flow]="isDenied">
        <!-- Progress bar (horizontal) -->
        <div class="timeline-progress-bar">
          <div class="timeline-progress-fill" [ngClass]="progressFillClass"></div>
        </div>

        <!-- Steps -->
        <div class="timeline-steps">
          @for (step of steps; track step; let i = $index) {
            <div
              class="timeline-step"
              [class.active]="isStepActive(step)"
              [class.current]="step === currentStatus"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-label">
                <span class="state-name">
                  {{ 'appointments.status.' + step.toLowerCase() | translate }}
                </span>
                @if (isStepActive(step) && getTimestamp(step)) {
                  <span class="timestamp">{{ getTimestamp(step) }}</span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .timeline-container {
        padding: 16px;
        font-family: inherit;
      }

      .timeline {
        position: relative;
      }

      /* Horizontal progress bar background */
      .timeline-progress-bar {
        position: absolute;
        top: 6px;
        left: 6px;
        right: 6px;
        height: 2px;
        background-color: var(--ion-color-step-200, #e0e0e0);
        z-index: 1;
      }

      /* Horizontal progress fill */
      .timeline-progress-fill {
        height: 100%;
        background-color: var(--ion-color-primary, #3880ff);
        transition: width 0.3s ease-in-out;
      }

      .timeline-progress-fill.progress-0 {
        width: 0%;
      }

      .timeline-progress-fill.progress-33 {
        width: 33.3333%;
      }

      .timeline-progress-fill.progress-50 {
        width: 50%;
      }

      .timeline-progress-fill.progress-67 {
        width: 66.6667%;
      }

      .timeline-progress-fill.progress-100 {
        width: 100%;
      }

      .timeline.denied-flow .timeline-progress-fill {
        background-color: var(--ion-color-danger, #eb445a);
      }

      /* Steps container - horizontal flex */
      .timeline-steps {
        display: flex;
        justify-content: space-between;
        position: relative;
        z-index: 2;
      }

      .timeline-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        min-width: 0;
      }

      .timeline-step:first-child {
        align-items: flex-start;
      }

      .timeline-step:last-child {
        align-items: flex-end;
      }

      .timeline-dot {
        width: 14px;
        height: 14px;
        background-color: var(--ion-color-step-200, #e0e0e0);
        border-radius: 50%;
        border: 2px solid var(--ion-background-color, #fff);
        box-shadow: 0 0 0 1px var(--ion-color-step-200, #e0e0e0);
        transition: all 0.3s ease-in-out;
        flex-shrink: 0;
      }

      /* Active state */
      .timeline-step.active .timeline-dot {
        background-color: var(--ion-color-primary, #3880ff);
        box-shadow: 0 0 0 2px var(--ion-color-primary-tint, rgba(56, 128, 255, 0.3));
      }

      .timeline.denied-flow .timeline-step.active .timeline-dot {
        background-color: var(--ion-color-danger, #eb445a);
        box-shadow: 0 0 0 2px var(--ion-color-danger-tint, rgba(235, 68, 90, 0.3));
      }

      /* Current state - pulse effect */
      .timeline-step.current .timeline-dot {
        transform: scale(1.2);
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          box-shadow: 0 0 0 2px var(--ion-color-primary-tint, rgba(56, 128, 255, 0.3));
        }
        50% {
          box-shadow: 0 0 0 4px var(--ion-color-primary-tint, rgba(56, 128, 255, 0.2));
        }
      }

      .timeline.denied-flow .timeline-step.current .timeline-dot {
        animation: pulse-danger 2s infinite;
      }

      @keyframes pulse-danger {
        0%,
        100% {
          box-shadow: 0 0 0 2px var(--ion-color-danger-tint, rgba(235, 68, 90, 0.3));
        }
        50% {
          box-shadow: 0 0 0 4px var(--ion-color-danger-tint, rgba(235, 68, 90, 0.2));
        }
      }

      .timeline-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 8px;
        text-align: center;
      }

      .timeline-step:first-child .timeline-label {
        align-items: flex-start;
        text-align: left;
      }

      .timeline-step:last-child .timeline-label {
        align-items: flex-end;
        text-align: right;
      }

      .state-name {
        font-size: 11px;
        font-weight: 600;
        color: var(--ion-color-medium);
        line-height: 1.2;
        text-transform: capitalize;
      }

      .timeline-step.active .state-name {
        color: var(--ion-color-dark);
      }

      .timeline.denied-flow .timeline-step.active .state-name {
        color: var(--ion-color-danger, #eb445a);
      }

      .timestamp {
        font-size: 9px;
        color: var(--ion-color-medium-tint);
        margin-top: 2px;
        white-space: nowrap;
      }

      /* Responsive: stack labels on very small screens */
      @media (max-width: 320px) {
        .state-name {
          font-size: 10px;
        }
        .timestamp {
          font-size: 8px;
        }
      }
    `,
  ],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppointmentTimelineComponent implements OnChanges {
  @Input() appointment!: Appointment;
  @Input() hasResolution = false;

  steps: string[] = [];
  currentStatus = 'NONE';
  isDenied = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appointment'] || changes['hasResolution']) {
      this.updateState();
    }
  }

  private updateState() {
    this.currentStatus = this.normalizeStatus(this.appointment?.status);
    this.isDenied = this.currentStatus === 'DENIED';

    if (this.isDenied) {
      this.steps = ['PENDING', 'DENIED'];
    } else if (this.hasResolution) {
      this.steps = ['PENDING', 'ACCEPTED', 'CREATED', 'RESOLVED'];
      if (this.currentStatus === 'CREATED') {
        this.currentStatus = 'RESOLVED';
      }
    } else {
      this.steps = ['PENDING', 'ACCEPTED', 'CREATED'];
    }
  }

  private normalizeStatus(status: string | undefined): string {
    if (!status) return 'NONE';
    const upper = status.toUpperCase();
    const validStates = [
      'PENDING',
      'ACCEPTED',
      'DENIED',
      'CREATED',
      'RESOLVED',
      'NONE',
      'BLOCKED',
      'CANCELLED',
    ];
    return validStates.includes(upper) ? upper : 'NONE';
  }

  isStepActive(step: string): boolean {
    if (this.currentStatus === 'NONE') return false;

    const currentIndex = this.steps.indexOf(this.currentStatus);
    const stepIndex = this.steps.indexOf(step);

    if (currentIndex === -1) return false;

    return stepIndex <= currentIndex;
  }

  getTimestamp(step: string): string | null {
    if (!this.appointment?.timestamps) return null;

    const keyMap: Record<string, string> = {
      PENDING: 'created_at',
      ACCEPTED: 'accepted_at',
      DENIED: 'denied_at',
      CREATED: 'completed_at',
      RESOLVED: 'resolved_at',
    };

    const key = keyMap[step] || step.toLowerCase() + '_at';

    const timestamps = this.appointment.timestamps as Record<string, string>;
    const ts =
      timestamps[key] || ((this.appointment as unknown as Record<string, unknown>)[key] as string);

    if (ts) {
      return new Date(ts).toLocaleDateString();
    }
    return null;
  }

  get progressPercentage(): number {
    const currentIndex = this.steps.indexOf(this.currentStatus);
    if (currentIndex === -1) return 0;

    if (this.steps.length <= 1) return 0;
    return (currentIndex / (this.steps.length - 1)) * 100;
  }

  get progressFillClass(): string {
    const currentIndex = this.steps.indexOf(this.currentStatus);
    if (currentIndex <= 0) return 'progress-0';

    const denominator = this.steps.length - 1;
    if (denominator <= 0) return 'progress-0';
    if (currentIndex >= denominator) return 'progress-100';

    if (denominator === 2 && currentIndex === 1) return 'progress-50';
    if (denominator === 3 && currentIndex === 1) return 'progress-33';
    if (denominator === 3 && currentIndex === 2) return 'progress-67';

    return 'progress-0';
  }
}
