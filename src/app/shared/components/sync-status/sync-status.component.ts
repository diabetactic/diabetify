import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network } from '@capacitor/network';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { db } from '../../../core/services/database.service';

type SyncState = 'online' | 'offline' | 'pending';

/**
 * Sync Status Indicator Component
 * Shows network connectivity and pending sync items.
 * Showcases offline-first architecture during demos.
 */
@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <span
      class="sync-status"
      [class.sync-status--online]="state === 'online'"
      [class.sync-status--offline]="state === 'offline'"
      [class.sync-status--pending]="state === 'pending'"
      [attr.aria-label]="ariaLabel"
      role="status"
      [title]="tooltip"
    >
      <span class="sync-status__dot"></span>
      @if (state === 'pending') {
        <span class="sync-status__count">{{ pendingCount }}</span>
      }
    </span>
  `,
  styles: [
    `
      .sync-status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: 600;
        border-radius: 12px;
        white-space: nowrap;
      }

      .sync-status__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }

      .sync-status__count {
        font-size: 9px;
        line-height: 1;
      }

      .sync-status--online {
        background-color: rgba(34, 197, 94, 0.15);
      }

      .sync-status--online .sync-status__dot {
        background-color: #22c55e;
        box-shadow: 0 0 4px #22c55e;
      }

      .sync-status--offline {
        background-color: rgba(239, 68, 68, 0.15);
      }

      .sync-status--offline .sync-status__dot {
        background-color: #ef4444;
        animation: none;
      }

      .sync-status--pending {
        background-color: rgba(234, 179, 8, 0.15);
      }

      .sync-status--pending .sync-status__dot {
        background-color: #eab308;
        animation: pulse 1s infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      :host-context([data-theme='dark']) .sync-status--online {
        background-color: rgba(34, 197, 94, 0.25);
      }

      :host-context([data-theme='dark']) .sync-status--offline {
        background-color: rgba(239, 68, 68, 0.25);
      }

      :host-context([data-theme='dark']) .sync-status--pending {
        background-color: rgba(234, 179, 8, 0.25);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncStatusComponent implements OnInit, OnDestroy {
  state: SyncState = 'online';
  pendingCount = 0;
  private destroy$ = new Subject<void>();
  private networkListener: ReturnType<typeof Network.addListener> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.checkNetworkStatus();
    this.setupNetworkListener();
    this.checkPendingSyncItems();

    // Poll for pending items every 30 seconds
    const interval = setInterval(() => this.checkPendingSyncItems(), 30000);
    this.destroy$.subscribe(() => clearInterval(interval));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.networkListener?.then(listener => listener.remove());
  }

  private async checkNetworkStatus(): Promise<void> {
    try {
      const status = await Network.getStatus();
      this.updateState(status.connected);
    } catch {
      // Assume online if Network plugin fails (web fallback)
      this.updateState(navigator.onLine);
    }
  }

  private setupNetworkListener(): void {
    this.networkListener = Network.addListener('networkStatusChange', status => {
      this.updateState(status.connected);
      if (status.connected) {
        this.checkPendingSyncItems();
      }
    });

    // Web fallback listeners
    window.addEventListener('online', () => this.updateState(true));
    window.addEventListener('offline', () => this.updateState(false));
  }

  private async checkPendingSyncItems(): Promise<void> {
    try {
      const count = await db.syncQueue.count();
      this.pendingCount = count;
      this.updateStateBasedOnPending();
    } catch {
      this.pendingCount = 0;
    }
    this.cdr.markForCheck();
  }

  private updateState(isOnline: boolean): void {
    if (!isOnline) {
      this.state = 'offline';
    } else if (this.pendingCount > 0) {
      this.state = 'pending';
    } else {
      this.state = 'online';
    }
    this.cdr.markForCheck();
  }

  private updateStateBasedOnPending(): void {
    if (this.state !== 'offline') {
      this.state = this.pendingCount > 0 ? 'pending' : 'online';
    }
  }

  get ariaLabel(): string {
    switch (this.state) {
      case 'online':
        return 'Connected and synced';
      case 'offline':
        return 'Offline - data saved locally';
      case 'pending':
        return `${this.pendingCount} items pending sync`;
      default:
        return 'Sync status';
    }
  }

  get tooltip(): string {
    switch (this.state) {
      case 'online':
        return 'All data synced';
      case 'offline':
        return 'Working offline';
      case 'pending':
        return `${this.pendingCount} pending`;
      default:
        return '';
    }
  }
}
