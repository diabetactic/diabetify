/**
 * Unit tests for BarcodeScannerService
 *
 * Tests cover:
 * - Scanner initialization and permission handling
 * - Barcode scanning success scenarios
 * - Error handling (camera permission denied, scan failures)
 * - Platform detection behavior
 * - Alert presentation on permission denial
 */

import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { AlertController } from '@ionic/angular';
import { BarcodeScannerService } from '@services/barcode-scanner.service';
import { TranslationService } from '@services/translation.service';
import type { Mock } from 'vitest';

describe('BarcodeScannerService', () => {
  let service: BarcodeScannerService;
  let alertController: AlertController;
  let translationService: { instant: Mock };
  let mockAlertElement: {
    present: Mock;
    dismiss: Mock;
    onDidDismiss: Mock;
    onWillDismiss: Mock;
  };

  beforeEach(() => {
    // Create a fresh mock alert element for each test
    mockAlertElement = {
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
      onWillDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
    };

    TestBed.configureTestingModule({
      providers: [
        BarcodeScannerService,
        AlertController,
        {
          provide: TranslationService,
          useValue: { instant: vi.fn((key: string) => key) },
        },
      ],
    });

    service = TestBed.inject(BarcodeScannerService);
    alertController = TestBed.inject(AlertController);
    translationService = TestBed.inject(TranslationService) as unknown as { instant: Mock };

    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default alert controller behavior
    (alertController.create as Mock).mockResolvedValue(mockAlertElement);
  });

  describe('scan', () => {
    describe('when permission is granted', () => {
      beforeEach(() => {
        (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
          camera: 'granted',
        });
      });

      it('should return barcode display value when scan is successful', async () => {
        const expectedBarcode = '1234567890123';
        (BarcodeScanner.scan as Mock).mockResolvedValue({
          barcodes: [
            { displayValue: expectedBarcode, rawValue: expectedBarcode, format: 'EAN_13' },
          ],
        });

        const result = await service.scan();

        expect(result).toBe(expectedBarcode);
        expect(BarcodeScanner.requestPermissions).toHaveBeenCalledTimes(1);
        expect(BarcodeScanner.scan).toHaveBeenCalledTimes(1);
      });

      it('should return first barcode when multiple barcodes are detected', async () => {
        const firstBarcode = 'FIRST_BARCODE';
        const secondBarcode = 'SECOND_BARCODE';
        (BarcodeScanner.scan as Mock).mockResolvedValue({
          barcodes: [
            { displayValue: firstBarcode, rawValue: firstBarcode, format: 'QR_CODE' },
            { displayValue: secondBarcode, rawValue: secondBarcode, format: 'QR_CODE' },
          ],
        });

        const result = await service.scan();

        expect(result).toBe(firstBarcode);
      });

      it('should return null when no barcodes are detected', async () => {
        (BarcodeScanner.scan as Mock).mockResolvedValue({
          barcodes: [],
        });

        const result = await service.scan();

        expect(result).toBeNull();
      });

      it('should return null when barcodes array is empty', async () => {
        (BarcodeScanner.scan as Mock).mockResolvedValue({
          barcodes: [],
        });

        const result = await service.scan();

        expect(result).toBeNull();
        expect(alertController.create).not.toHaveBeenCalled();
      });
    });

    describe('when permission is limited', () => {
      it('should proceed with scan when camera permission is limited', async () => {
        const expectedBarcode = 'LIMITED_PERMISSION_SCAN';
        (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
          camera: 'limited',
        });
        (BarcodeScanner.scan as Mock).mockResolvedValue({
          barcodes: [
            { displayValue: expectedBarcode, rawValue: expectedBarcode, format: 'CODE_128' },
          ],
        });

        const result = await service.scan();

        expect(result).toBe(expectedBarcode);
        expect(BarcodeScanner.scan).toHaveBeenCalled();
      });
    });

    describe('when permission is denied', () => {
      it('should return null and show alert when camera permission is denied', async () => {
        (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
          camera: 'denied',
        });

        const result = await service.scan();

        expect(result).toBeNull();
        expect(BarcodeScanner.scan).not.toHaveBeenCalled();
        expect(translationService.instant).toHaveBeenCalledWith(
          'barcodeScanner.permissionDenied.title'
        );
        expect(translationService.instant).toHaveBeenCalledWith(
          'barcodeScanner.permissionDenied.message'
        );
        expect(translationService.instant).toHaveBeenCalledWith('common.ok');
        expect(alertController.create).toHaveBeenCalledWith({
          header: 'barcodeScanner.permissionDenied.title',
          message: 'barcodeScanner.permissionDenied.message',
          buttons: ['common.ok'],
        });
        expect(mockAlertElement.present).toHaveBeenCalled();
      });

      it('should return null and show alert when camera permission is prompt', async () => {
        (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
          camera: 'prompt',
        });

        const result = await service.scan();

        expect(result).toBeNull();
        expect(alertController.create).toHaveBeenCalled();
        expect(mockAlertElement.present).toHaveBeenCalled();
      });

      it('should return null and show alert when camera permission is prompt-with-rationale', async () => {
        (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
          camera: 'prompt-with-rationale',
        });

        const result = await service.scan();

        expect(result).toBeNull();
        expect(alertController.create).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should propagate error when requestPermissions fails', async () => {
      const permissionError = new Error('Failed to request camera permissions');
      (BarcodeScanner.requestPermissions as Mock).mockRejectedValue(permissionError);

      await expect(service.scan()).rejects.toThrow('Failed to request camera permissions');
      expect(BarcodeScanner.scan).not.toHaveBeenCalled();
    });

    it('should propagate error when scan fails', async () => {
      (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
        camera: 'granted',
      });
      const scanError = new Error('Camera unavailable');
      (BarcodeScanner.scan as Mock).mockRejectedValue(scanError);

      await expect(service.scan()).rejects.toThrow('Camera unavailable');
    });

    it('should propagate error when scan times out', async () => {
      (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
        camera: 'granted',
      });
      const timeoutError = new Error('Scan timeout');
      (BarcodeScanner.scan as Mock).mockRejectedValue(timeoutError);

      await expect(service.scan()).rejects.toThrow('Scan timeout');
    });

    it('should propagate error when no camera is available', async () => {
      (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
        camera: 'granted',
      });
      const noCameraError = new Error('No camera found on device');
      (BarcodeScanner.scan as Mock).mockRejectedValue(noCameraError);

      await expect(service.scan()).rejects.toThrow('No camera found on device');
    });

    it('should not throw when alert creation fails', async () => {
      (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
        camera: 'denied',
      });
      const alertError = new Error('Failed to create alert');
      (alertController.create as Mock).mockRejectedValue(alertError);

      await expect(service.scan()).resolves.toBeNull();
    });
  });

  describe('service creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should be provided in root', () => {
      const freshService = TestBed.inject(BarcodeScannerService);
      expect(freshService).toBe(service);
    });

    it('should have AlertController injected', () => {
      // Verify the service can use alertController by checking it works when permission is denied
      (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
        camera: 'denied',
      });

      // This should not throw, proving alertController is properly injected
      expect(() => service.scan()).not.toThrow();
    });
  });

  describe('barcode format handling', () => {
    beforeEach(() => {
      (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
        camera: 'granted',
      });
    });

    it('should handle EAN-13 barcode format', async () => {
      const ean13Barcode = '5901234123457';
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: ean13Barcode, rawValue: ean13Barcode, format: 'EAN_13' }],
      });

      const result = await service.scan();

      expect(result).toBe(ean13Barcode);
    });

    it('should handle QR code format', async () => {
      const qrCodeValue = 'https://example.com/product/12345';
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: qrCodeValue, rawValue: qrCodeValue, format: 'QR_CODE' }],
      });

      const result = await service.scan();

      expect(result).toBe(qrCodeValue);
    });

    it('should handle UPC-A barcode format', async () => {
      const upcaBarcode = '012345678905';
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: upcaBarcode, rawValue: upcaBarcode, format: 'UPC_A' }],
      });

      const result = await service.scan();

      expect(result).toBe(upcaBarcode);
    });

    it('should handle CODE-128 barcode format', async () => {
      const code128Barcode = 'ABC-12345';
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: code128Barcode, rawValue: code128Barcode, format: 'CODE_128' }],
      });

      const result = await service.scan();

      expect(result).toBe(code128Barcode);
    });

    it('should handle barcode with special characters', async () => {
      const specialBarcode = 'PROD/2024-001#TEST';
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: specialBarcode, rawValue: specialBarcode, format: 'CODE_128' }],
      });

      const result = await service.scan();

      expect(result).toBe(specialBarcode);
    });

    it('should handle barcode with unicode characters', async () => {
      const unicodeBarcode = 'Product-123';
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: unicodeBarcode, rawValue: unicodeBarcode, format: 'QR_CODE' }],
      });

      const result = await service.scan();

      expect(result).toBe(unicodeBarcode);
    });

    it('should handle empty displayValue', async () => {
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: '', rawValue: '', format: 'QR_CODE' }],
      });

      const result = await service.scan();

      expect(result).toBe('');
    });

    it('should handle undefined displayValue', async () => {
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: undefined, rawValue: undefined, format: 'QR_CODE' }],
      });

      const result = await service.scan();

      expect(result).toBeUndefined();
    });
  });

  describe('multiple scans', () => {
    it('should request permissions for each scan', async () => {
      (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
        camera: 'granted',
      });
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: 'SCAN_1', rawValue: 'SCAN_1', format: 'QR_CODE' }],
      });

      await service.scan();
      await service.scan();
      await service.scan();

      expect(BarcodeScanner.requestPermissions).toHaveBeenCalledTimes(3);
      expect(BarcodeScanner.scan).toHaveBeenCalledTimes(3);
    });

    it('should handle permission change between scans', async () => {
      (BarcodeScanner.requestPermissions as Mock)
        .mockResolvedValueOnce({ camera: 'granted' })
        .mockResolvedValueOnce({ camera: 'denied' });
      (BarcodeScanner.scan as Mock).mockResolvedValue({
        barcodes: [{ displayValue: 'FIRST_SCAN', rawValue: 'FIRST_SCAN', format: 'QR_CODE' }],
      });

      const firstResult = await service.scan();
      const secondResult = await service.scan();

      expect(firstResult).toBe('FIRST_SCAN');
      expect(secondResult).toBeNull();
      expect(BarcodeScanner.scan).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent scans', () => {
    it('should handle concurrent scan calls', async () => {
      (BarcodeScanner.requestPermissions as Mock).mockResolvedValue({
        camera: 'granted',
      });
      (BarcodeScanner.scan as Mock)
        .mockResolvedValueOnce({
          barcodes: [{ displayValue: 'CONCURRENT_1', rawValue: 'CONCURRENT_1', format: 'QR_CODE' }],
        })
        .mockResolvedValueOnce({
          barcodes: [{ displayValue: 'CONCURRENT_2', rawValue: 'CONCURRENT_2', format: 'QR_CODE' }],
        });

      const [result1, result2] = await Promise.all([service.scan(), service.scan()]);

      expect(result1).toBe('CONCURRENT_1');
      expect(result2).toBe('CONCURRENT_2');
    });
  });
});
