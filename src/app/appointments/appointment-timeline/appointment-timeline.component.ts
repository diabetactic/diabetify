import { CUSTOM_ELEMENTS_SCHEMA, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Appointment } from 'src/app/core/models/appointment.model';

@Component({
  selector: 'app-appointment-timeline',
  template: `
    <div class="timeline-container">
      <div class="timeline">
        <div
          class="timeline-progress"
          [style.width.%]="progressPercentage"
        ></div>
        <div
          *ngFor="let state of states; let i = index"
          class="timeline-item"
          [class.active]="isStateActive(state)"
        >
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="state-name">{{ state }}</div>
            <div class="timestamp" *ngIf="isStateActive(state) && getTimestamp(state)">
              {{ getTimestamp(state) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .timeline-container {
        padding: 20px;
        font-family: Arial, sans-serif;
      }

      .timeline {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .timeline::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 4px;
        background-color: #e0e0e0;
        transform: translateY(-50%);
        z-index: 1;
      }

      .timeline-progress {
        position: absolute;
        top: 50%;
        left: 0;
        height: 4px;
        background-color: #3880ff;
        transform: translateY(-50%);
        z-index: 2;
        transition: width 0.3s ease-in-out;
      }

      .timeline-item {
        position: relative;
        z-index: 3;
        text-align: center;
      }

      .timeline-dot {
        width: 20px;
        height: 20px;
        background-color: #e0e0e0;
        border-radius: 50%;
        transition: background-color 0.3s ease-in-out;
        margin: 0 auto;
      }

      .timeline-item.active .timeline-dot {
        background-color: #3880ff;
      }

      .timeline-content {
        margin-top: 10px;
      }

      .state-name {
        font-size: 14px;
        font-weight: bold;
        color: #666;
      }

      .timeline-item.active .state-name {
        color: #3880ff;
      }

      .timestamp {
        font-size: 12px;
        color: #999;
        margin-top: 5px;
      }

      @media (max-width: 600px) {
        .timeline {
          flex-direction: column;
          align-items: flex-start;
        }

        .timeline::before {
          top: 0;
          bottom: 0;
          left: 9px;
          width: 4px;
          height: 100%;
          transform: none;
        }

        .timeline-progress {
          top: 0;
          left: 9px;
          width: 4px;
          height: 0;
          transition: height 0.3s ease-in-out;
        }

        .timeline-item {
          text-align: left;
          margin-bottom: 20px;
          padding-left: 40px;
        }

        .timeline-dot {
          position: absolute;
          left: 0;
          top: 0;
        }

        .timeline-content {
          margin-top: 0;
        }
      }
    `,
  ],
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppointmentTimelineComponent implements OnInit {
  @Input() appointment!: Appointment;

  states = ['None', 'Pending', 'Accepted', 'Created', 'Resolved'];
  currentStatus = '';

  constructor() {}

  ngOnInit() {
    this.currentStatus = this.appointment.status;
  }

  isStateActive(state: string): boolean {
    const currentIndex = this.states.indexOf(this.currentStatus);
    const stateIndex = this.states.indexOf(state);
    return stateIndex <= currentIndex;
  }

  getTimestamp(state: string): string | null {
    if (this.appointment.timestamps && this.appointment.timestamps[state]) {
      return new Date(this.appointment.timestamps[state]).toLocaleString();
    }
    return null;
  }

  get progressPercentage(): number {
    if (!this.currentStatus || this.states.indexOf(this.currentStatus) === -1) {
      return 0;
    }
    return (this.states.indexOf(this.currentStatus) / (this.states.length - 1)) * 100;
  }
}
