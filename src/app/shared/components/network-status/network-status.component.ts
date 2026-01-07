import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  OnDestroy,
  NgZone,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network } from '@capacitor/network';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-network-status',
  template: `
    <div class="network-status" [ngClass]="status" data-testid="network-status">
      <div class="status-dot"></div>
      <div class="status-text">{{ statusTextKey | translate }}</div>
    </div>
  `,
  styles: [
    `
      .network-status {
        display: flex;
        align-items: center;
        padding: 0.5rem;
        border-radius: 0.5rem;
      }
      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 0.5rem;
      }
      .network-status.online .status-dot {
        background-color: green;
      }
      .network-status.offline .status-dot {
        background-color: red;
      }
    `,
  ],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkStatusComponent implements OnInit, OnDestroy {
  status: 'online' | 'offline' = 'online';
  statusTextKey: 'common.online' | 'common.offline' = 'common.online';
  private networkListener: Awaited<ReturnType<typeof Network.addListener>> | undefined;
  private cdr = inject(ChangeDetectorRef);

  constructor(private zone: NgZone) {}

  async ngOnInit() {
    this.networkListener = await Network.addListener('networkStatusChange', status => {
      this.zone.run(() => {
        this.updateStatus(status.connected);
      });
    });
    const initialStatus = await Network.getStatus();
    this.zone.run(() => {
      this.updateStatus(initialStatus.connected);
    });
  }

  ngOnDestroy() {
    if (this.networkListener) {
      this.networkListener.remove();
    }
  }

  private updateStatus(isConnected: boolean) {
    this.status = isConnected ? 'online' : 'offline';
    this.statusTextKey = isConnected ? 'common.online' : 'common.offline';
    this.cdr.markForCheck();
  }
}
