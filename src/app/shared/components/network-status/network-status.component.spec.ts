
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Network } from '@capacitor/network';
import { NetworkStatus } from '@capacitor/network';

import { NetworkStatusComponent } from './network-status.component';

describe('NetworkStatusComponent', () => {
  let component: NetworkStatusComponent;
  let fixture: ComponentFixture<NetworkStatusComponent>;
  let networkStatusCallback: (status: NetworkStatus) => void;

  beforeEach(async () => {
    spyOn(Network, 'addListener').and.callFake((eventName, callback) => {
        if (eventName === 'networkStatusChange') {
            networkStatusCallback = callback;
        }
        return Promise.resolve({ remove: () => {} });
    });
    spyOn(Network, 'getStatus').and.resolveTo({ connected: true, connectionType: 'wifi' });

    await TestBed.configureTestingModule({
      imports: [CommonModule, NetworkStatusComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display online status by default', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const statusElement = fixture.nativeElement.querySelector('.network-status');
    const statusText = fixture.nativeElement.querySelector('.status-text');
    expect(statusElement.classList.contains('online')).toBe(true);
    expect(statusText.textContent).toBe('Online');
  }));

  it('should display offline status when network is disconnected', fakeAsync(() => {
    networkStatusCallback({ connected: false, connectionType: 'none' });
    tick();
    fixture.detectChanges();
    const statusElement = fixture.nativeElement.querySelector('.network-status');
    const statusText = fixture.nativeElement.querySelector('.status-text');
    expect(statusElement.classList.contains('offline')).toBe(true);
    expect(statusText.textContent).toBe('Offline');
  }));

  it('should display online status when network is connected', fakeAsync(() => {
    // Set initial state to offline
    networkStatusCallback({ connected: false, connectionType: 'none' });
    tick();
    fixture.detectChanges();

    // Change to online
    networkStatusCallback({ connected: true, connectionType: 'wifi' });
    tick();
    fixture.detectChanges();

    const statusElement = fixture.nativeElement.querySelector('.network-status');
    const statusText = fixture.nativeElement.querySelector('.status-text');
    expect(statusElement.classList.contains('online')).toBe(true);
    expect(statusText.textContent).toBe('Online');
  }));
});
