import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export type AlertType = 'success' | 'info' | 'warning';

@Component({
  selector: 'app-alert-banner',
  templateUrl: './alert-banner.component.html',
  styleUrls: ['./alert-banner.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, TranslateModule],
})
export class AlertBannerComponent {
  @Input() type: AlertType = 'info';
  @Input() message = '';
  @Input() dismissible = false;
  @Output() readonly dismissed = new EventEmitter<void>();

  visible = true;

  static getIconForType(type: AlertType): string {
    switch (type) {
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

  getIcon(): string {
    return AlertBannerComponent.getIconForType(this.type);
  }

  dismiss(): void {
    this.visible = false;
    this.dismissed.emit();
  }
}
