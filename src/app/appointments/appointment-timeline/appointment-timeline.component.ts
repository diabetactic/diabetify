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
        <div class="timeline-progress-bar">
          <div class="timeline-progress-fill" [style.height.%]="progressPercentage"></div>
        </div>

        <div
          *ngFor="let step of steps; let i = index"
          class="timeline-item"
          [class.active]="isStepActive(step)"
          [class.current]="step === currentStatus"
        >
          <div class="timeline-dot-wrapper">
            <div class="timeline-dot"></div>
          </div>
          <div class="timeline-content">
            <div class="state-name">
              {{ 'appointments.status.' + step.toLowerCase() | translate }}
            </div>
            <div class="timestamp" *ngIf="isStepActive(step) && getTimestamp(step)">
              {{ getTimestamp(step) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .timeline-container {
        padding: 0 16px;
        font-family: inherit;
      }

      .timeline {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      /* Vertical Line Background */
      .timeline-progress-bar {
        position: absolute;
        top: 10px;
        bottom: 10px;
        left: 9px;
        width: 2px;
        background-color: var(--ion-color-step-150, #e0e0e0);
        z-index: 1;
      }

      /* Vertical Line Fill */
      .timeline-progress-fill {
        width: 100%;
        background-color: var(--ion-color-primary, #3880ff);
        transition: height 0.3s ease-in-out;
      }

      .timeline.denied-flow .timeline-progress-fill {
        background-color: var(--ion-color-danger, #eb445a);
      }

      .timeline-item {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        padding-bottom: 16px; /* Space between items */
      }

      .timeline-item:last-child {
        padding-bottom: 0;
      }

      .timeline-dot-wrapper {
        width: 20px;
        display: flex;
        justify-content: center;
        margin-right: 16px;
        padding-top: 4px; /* Align dot with text */
      }

      .timeline-dot {
        width: 12px;
        height: 12px;
        background-color: var(--ion-color-step-150, #e0e0e0);
        border-radius: 50%;
        transition: all 0.3s ease-in-out;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px var(--ion-color-step-150, #e0e0e0);
      }

      /* Active State (Past/Current) */
      .timeline-item.active .timeline-dot {
        background-color: var(--ion-color-primary, #3880ff);
        box-shadow: 0 0 0 2px var(--ion-color-primary-tint, #3880ff);
      }

      .timeline.denied-flow .timeline-item.active .timeline-dot {
        background-color: var(--ion-color-danger, #eb445a);
        box-shadow: 0 0 0 2px var(--ion-color-danger-tint, #eb445a);
      }

      /* Current State (Pulse effect or larger) */
      .timeline-item.current .timeline-dot {
        transform: scale(1.2);
      }

      .timeline-content {
        flex: 1;
      }

      .state-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--ion-color-medium);
        line-height: 1.2;
      }

      .timeline-item.active .state-name {
        color: var(--ion-color-dark);
      }

      .timeline.denied-flow .timeline-item.active .state-name {
        color: var(--ion-color-danger, #eb445a);
      }

      .timestamp {
        font-size: 12px;
        color: var(--ion-color-medium-tint);
        margin-top: 2px;
      }
    `,
  ],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppointmentTimelineComponent implements OnChanges {
  @Input() appointment!: Appointment;

  steps: string[] = [];
  currentStatus = 'NONE';
  isDenied = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appointment']) {
      this.updateState();
    }
  }

  private updateState() {
    this.currentStatus = this.normalizeStatus(this.appointment?.status);
    this.isDenied = this.currentStatus === 'DENIED';

    if (this.isDenied) {
      this.steps = ['PENDING', 'DENIED'];
    } else if (this.currentStatus === 'COMPLETED') {
      this.steps = ['PENDING', 'ACCEPTED', 'CREATED', 'COMPLETED'];
    } else {
      this.steps = ['PENDING', 'ACCEPTED', 'CREATED'];
    }
  }

  private normalizeStatus(status: string | undefined): string {
    if (!status) return 'NONE';
    const upper = status.toUpperCase();
    // Basic validation to ensure we don't display garbage
    const validStates = [
      'PENDING',
      'ACCEPTED',
      'DENIED',
      'CREATED',
      'COMPLETED',
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

    // If current status is not in the steps (e.g. unexpected), default to inactive
    if (currentIndex === -1) return false;

    return stepIndex <= currentIndex;
  }

  getTimestamp(step: string): string | null {
    if (!this.appointment?.timestamps) return null;

    // Map step name to timestamp key
    // PENDING -> created_at (usually request time)
    // ACCEPTED -> accepted_at
    // CREATED -> completed_at or created_at (of the appointment object?)
    // DENIED -> denied_at

    // Wait, the backend model timestamps might differ.
    // Let's assume consistent keys or use a map.
    const keyMap: Record<string, string> = {
      PENDING: 'created_at', // The request creation
      ACCEPTED: 'accepted_at',
      DENIED: 'denied_at',
      CREATED: 'completed_at', // or 'appointment_created_at'
    };

    // Fallback to simple lowercase check
    const key = keyMap[step] || step.toLowerCase() + '_at';

    const timestamps = this.appointment.timestamps as Record<string, string>;
    const ts =
      timestamps[key] || ((this.appointment as unknown as Record<string, unknown>)[key] as string);

    if (ts) {
      return new Date(ts).toLocaleString();
    }
    return null;
  }

  get progressPercentage(): number {
    const currentIndex = this.steps.indexOf(this.currentStatus);
    if (currentIndex === -1) return 0;
    // Calculate percentage based on steps
    // 0 steps -> 0%
    // 1 step (start) -> 0%
    // 2 steps -> 100% (full line)
    // But we want to fill UP TO the current dot.

    if (this.steps.length <= 1) return 0;
    return (currentIndex / (this.steps.length - 1)) * 100;
  }
}
