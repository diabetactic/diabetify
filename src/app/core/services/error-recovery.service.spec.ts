
import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { Network } from '@capacitor/network';
import { NetworkStatus } from '@capacitor/network';

import { ErrorRecoveryService } from './error-recovery.service';

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;
  let toastController: ToastController;
  let networkStatusCallback: (status: NetworkStatus) => void;

  beforeEach(() => {
    const toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);

    spyOn(Network, 'addListener').and.callFake((eventName, callback) => {
        if (eventName === 'networkStatusChange') {
            networkStatusCallback = callback;
        }
        return Promise.resolve({ remove: () => {} });
    });

    TestBed.configureTestingModule({
      providers: [
        ErrorRecoveryService,
        { provide: ToastController, useValue: toastControllerSpy },
      ],
    });

    service = TestBed.inject(ErrorRecoveryService);
    toastController = TestBed.inject(ToastController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show a retry toast', async () => {
    const presentSpy = jasmine.createSpy('present');
    (toastController.create as jasmine.Spy).and.returnValue(Promise.resolve({ present: presentSpy }));

    const retryAction = () => {};
    await service.showRetryToast('Could not save', retryAction);

    expect(toastController.create).toHaveBeenCalledWith(jasmine.objectContaining({
      message: 'Could not save',
      buttons: [
        { text: 'Retry', handler: retryAction },
        { text: 'Dismiss', role: 'cancel' },
      ],
    }));
    expect(presentSpy).toHaveBeenCalled();
  });

  it('should show offline banner when network is disconnected', () => {
    return new Promise<void>(resolve => {
        service.offlineBannerVisible$.subscribe(visible => {
            if(visible) {
                expect(visible).toBe(true);
                resolve();
            }
        });
        networkStatusCallback({ connected: false, connectionType: 'none' });
    });
  });

  it('should hide offline banner when network is connected', () => {
    return new Promise<void>(resolve => {
        // Set initial state to offline
        service.showOfflineBanner();

        service.offlineBannerVisible$.subscribe(visible => {
            if(!visible) {
                expect(visible).toBe(false);
                resolve();
            }
        });
        networkStatusCallback({ connected: true, connectionType: 'wifi' });
    });
  });
});
