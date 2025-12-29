import { vi } from 'vitest';

export const BarcodeScanner = {
  scan: vi.fn(),
  requestPermissions: vi.fn(),
  isSupported: vi.fn(),
  isGoogleBarcodeScannerModuleAvailable: vi.fn(),
  installGoogleBarcodeScannerModule: vi.fn(),
  openSettings: vi.fn(),
  removeAllListeners: vi.fn(),
};
