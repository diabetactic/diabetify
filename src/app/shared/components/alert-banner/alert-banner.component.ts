import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export type AlertType = 'success' | 'info' | 'warning';

@Component({
  selector: 'app-alert-banner',
  templateUrl: './alert-banner.component.html',
  styleUrls: ['./alert-banner.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class AlertBannerComponent {
  @Input() type: AlertType = 'info';
  @Input() message: string = '';
  @Input() dismissible: boolean = false;
  @Output() dismissed = new EventEmitter<void>();

  visible: boolean = true;

  getIcon(): string {
    switch (this.type) {
      case 'success':
        return 'check_circle';
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }

  dismiss(): void {
    this.visible = false;
    this.dismissed.emit();
  }
}
