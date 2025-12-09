import { Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '../app-icon/app-icon.component';

export type ErrorSeverity = 'error' | 'warning' | 'info';

@Component({
  selector: 'app-error-banner',
  templateUrl: './error-banner.component.html',
  styleUrls: ['./error-banner.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, TranslateModule, AppIconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ErrorBannerComponent {
  @Input() message: string = '';
  @Input() severity: ErrorSeverity = 'error';
  @Input() dismissible: boolean = true;
  @Input() retryable: boolean = false;
  @Input() retryText: string = 'common.retry';
  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly retry = new EventEmitter<void>();

  get severityClass(): string {
    switch (this.severity) {
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'alert-error';
    }
  }

  get iconName(): string {
    switch (this.severity) {
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert-triangle';
      case 'info':
        return 'info';
      default:
        return 'alert-circle';
    }
  }

  onDismiss(): void {
    this.dismissed.emit();
  }

  onRetry(): void {
    this.retry.emit();
  }
}
