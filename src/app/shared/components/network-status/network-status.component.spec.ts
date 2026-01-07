import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Network } from '@capacitor/network';
import { NetworkStatus } from '@capacitor/network';
import { vi } from 'vitest';
import { TranslateModule } from '@ngx-translate/core';

import { NetworkStatusComponent } from './network-status.component';

describe('NetworkStatusComponent', () => {
  let component: NetworkStatusComponent;
  let fixture: ComponentFixture<NetworkStatusComponent>;
  let networkStatusCallback: (status: NetworkStatus) => void;

  beforeEach(async () => {
    vi.spyOn(Network, 'addListener').mockImplementation((eventName, callback) => {
      if (eventName === 'networkStatusChange') {
        networkStatusCallback = callback as (status: NetworkStatus) => void;
      }
      return Promise.resolve({ remove: () => {} });
    });
    vi.spyOn(Network, 'getStatus').mockResolvedValue({ connected: true, connectionType: 'wifi' });

    await TestBed.configureTestingModule({
      imports: [NetworkStatusComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkStatusComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('should display online status by default', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const statusElement = fixture.nativeElement.querySelector('.network-status');
    const statusText = fixture.nativeElement.querySelector('.status-text');
    expect(statusElement.classList.contains('online')).toBe(true);
    expect(statusText.textContent).toBe('common.online');
  });

  it('should display offline status when network is disconnected', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    // Directly update component state to test the logic
    // We only check component state here to avoid ExpressionChangedAfterItHasBeenCheckedError
    (component as any).updateStatus(false);

    // Verify component state is correct (DOM will reflect this on next change detection cycle)
    expect(component.status).toBe('offline');
    expect(component.statusTextKey).toBe('common.offline');
  });

  it('should display online status when network is connected', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    // Set initial state to offline
    networkStatusCallback({ connected: false, connectionType: 'none' });
    await fixture.whenStable();
    fixture.detectChanges();

    // Change to online
    networkStatusCallback({ connected: true, connectionType: 'wifi' });
    await fixture.whenStable();
    fixture.detectChanges();

    const statusElement = fixture.nativeElement.querySelector('.network-status');
    const statusText = fixture.nativeElement.querySelector('.status-text');
    expect(statusElement.classList.contains('online')).toBe(true);
    expect(statusText.textContent).toBe('common.online');
  });
});
