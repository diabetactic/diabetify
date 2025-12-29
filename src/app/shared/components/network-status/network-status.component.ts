
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network, PluginListenerHandle } from '@capacitor/network';

@Component({
  selector: 'app-network-status',
  template: `
    <div class="network-status" [ngClass]="status">
      <div class="status-dot"></div>
      <div class="status-text">{{ statusText }}</div>
    </div>
  `,
  styles: [`
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
  `],
  standalone: true,
  imports: [CommonModule],
})
export class NetworkStatusComponent implements OnInit, OnDestroy {
  status: 'online' | 'offline' = 'online';
  statusText: string = 'Online';
  private networkListener: PluginListenerHandle;

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
    this.statusText = isConnected ? 'Online' : 'Offline';
  }
}
