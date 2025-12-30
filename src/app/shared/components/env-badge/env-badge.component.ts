import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy } from '@angular/core';

import { environment, BackendMode } from '@env/environment';

/**
 * Environment Badge Component
 * Shows current backend mode (LOCAL/MOCK/CLOUD) for demo visibility.
 * Only visible when devTools are enabled.
 */
@Component({
  selector: 'app-env-badge',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [],
  template: `
    @if (showBadge) {
      <span
        class="env-badge"
        [class.env-badge--mock]="mode === 'mock'"
        [class.env-badge--local]="mode === 'local'"
        [class.env-badge--cloud]="mode === 'cloud'"
        [attr.aria-label]="'Backend mode: ' + mode"
        role="status"
      >
        {{ modeLabel }}
      </span>
    }
  `,
  styles: [
    `
      .env-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-radius: 4px;
        white-space: nowrap;
      }

      .env-badge--mock {
        background-color: #fef3c7;
        color: #92400e;
      }

      .env-badge--local {
        background-color: #dbeafe;
        color: #1e40af;
      }

      .env-badge--cloud {
        background-color: #d1fae5;
        color: #065f46;
      }

      :host-context([data-theme='dark']) .env-badge--mock {
        background-color: #78350f;
        color: #fef3c7;
      }

      :host-context([data-theme='dark']) .env-badge--local {
        background-color: #1e3a8a;
        color: #dbeafe;
      }

      :host-context([data-theme='dark']) .env-badge--cloud {
        background-color: #064e3b;
        color: #d1fae5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvBadgeComponent {
  readonly mode: BackendMode = environment.backendMode;
  readonly showBadge = environment.features?.showEnvBadge ?? false;

  get modeLabel(): string {
    switch (this.mode) {
      case 'mock':
        return 'MOCK';
      case 'local':
        return 'LOCAL';
      case 'cloud':
        return 'CLOUD';
      default:
        return 'UNKNOWN';
    }
  }
}
