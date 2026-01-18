import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network } from '@capacitor/network';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-offline-banner',
  template: `
    @if (!isOnline) {
      <div class="offline-banner animate-slide-in-down">
        <app-icon name="cloud-off" class="text-lg text-white"></app-icon>
        <span class="text-sm font-medium">{{ 'common.offlineMode' | translate }}</span>
      </div>
    }
  `,
  styles: [
    `
      .offline-banner {
        background-color: var(--ion-color-medium);
        color: white;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: fixed;
        top: 0; /* Will sit under safe area if applied correctly or over content */
        left: 0;
        right: 0;
        z-index: 9999;
        padding-top: max(8px, env(safe-area-inset-top)); /* Respect notch */
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .animate-slide-in-down {
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
        }
        to {
          transform: translateY(0);
        }
      }
    `,
  ],
  standalone: true,
  imports: [CommonModule, TranslateModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  isOnline = true;
  private networkListener?: PluginListenerHandle;

  constructor(private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    const status = await Network.getStatus();
    this.isOnline = status.connected;
    this.cdr.markForCheck();

    this.networkListener = await Network.addListener('networkStatusChange', status => {
      this.isOnline = status.connected;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    if (this.networkListener) {
      this.networkListener.remove();
    }
  }
}
