// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { HapticService } from '@services/haptic.service';

// Mock Capacitor
jest.mock('@capacitor/core');
jest.mock('@capacitor/haptics');

describe('HapticService', () => {
  let service: HapticService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HapticService],
    });

    service = TestBed.inject(HapticService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should detect native platform on init', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      const newService = new HapticService();

      expect(newService.isAvailable).toBe(true);
    });

    it('should detect web platform on init', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      const newService = new HapticService();

      expect(newService.isAvailable).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true on native platform', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      const newService = new HapticService();

      expect(newService.isAvailable).toBe(true);
    });

    it('should return false on web platform', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      const newService = new HapticService();

      expect(newService.isAvailable).toBe(false);
    });
  });

  describe('impact', () => {
    describe('on native platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        service = new HapticService();
        (Haptics.impact as jest.Mock).mockResolvedValue(undefined);
      });

      it('should trigger light impact by default', async () => {
        await service.impact();

        expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
      });

      it('should trigger light impact when specified', async () => {
        await service.impact('light');

        expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
      });

      it('should trigger medium impact', async () => {
        await service.impact('medium');

        expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Medium });
      });

      it('should trigger heavy impact', async () => {
        await service.impact('heavy');

        expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Heavy });
      });

      it('should handle errors silently', async () => {
        (Haptics.impact as jest.Mock).mockRejectedValue(new Error('Not supported'));

        await expect(service.impact()).resolves.not.toThrow();
      });
    });

    describe('on web platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
        service = new HapticService();
      });

      it('should not call Haptics on web', async () => {
        await service.impact();

        expect(Haptics.impact).not.toHaveBeenCalled();
      });

      it('should not throw error on web', async () => {
        await expect(service.impact()).resolves.not.toThrow();
      });
    });
  });

  describe('success', () => {
    describe('on native platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        service = new HapticService();
        (Haptics.notification as jest.Mock).mockResolvedValue(undefined);
      });

      it('should trigger success notification', async () => {
        await service.success();

        expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
      });

      it('should handle errors silently', async () => {
        (Haptics.notification as jest.Mock).mockRejectedValue(new Error('Not supported'));

        await expect(service.success()).resolves.not.toThrow();
      });
    });

    describe('on web platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
        service = new HapticService();
      });

      it('should not call Haptics on web', async () => {
        await service.success();

        expect(Haptics.notification).not.toHaveBeenCalled();
      });
    });
  });

  describe('warning', () => {
    describe('on native platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        service = new HapticService();
        (Haptics.notification as jest.Mock).mockResolvedValue(undefined);
      });

      it('should trigger warning notification', async () => {
        await service.warning();

        expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Warning });
      });

      it('should handle errors silently', async () => {
        (Haptics.notification as jest.Mock).mockRejectedValue(new Error('Not supported'));

        await expect(service.warning()).resolves.not.toThrow();
      });
    });

    describe('on web platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
        service = new HapticService();
      });

      it('should not call Haptics on web', async () => {
        await service.warning();

        expect(Haptics.notification).not.toHaveBeenCalled();
      });
    });
  });

  describe('error', () => {
    describe('on native platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        service = new HapticService();
        (Haptics.notification as jest.Mock).mockResolvedValue(undefined);
      });

      it('should trigger error notification', async () => {
        await service.error();

        expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Error });
      });

      it('should handle errors silently', async () => {
        (Haptics.notification as jest.Mock).mockRejectedValue(new Error('Not supported'));

        await expect(service.error()).resolves.not.toThrow();
      });
    });

    describe('on web platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
        service = new HapticService();
      });

      it('should not call Haptics on web', async () => {
        await service.error();

        expect(Haptics.notification).not.toHaveBeenCalled();
      });
    });
  });

  describe('selection', () => {
    describe('on native platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        service = new HapticService();
        (Haptics.selectionChanged as jest.Mock).mockResolvedValue(undefined);
      });

      it('should trigger selection changed', async () => {
        await service.selection();

        expect(Haptics.selectionChanged).toHaveBeenCalled();
      });

      it('should handle errors silently', async () => {
        (Haptics.selectionChanged as jest.Mock).mockRejectedValue(new Error('Not supported'));

        await expect(service.selection()).resolves.not.toThrow();
      });
    });

    describe('on web platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
        service = new HapticService();
      });

      it('should not call Haptics on web', async () => {
        await service.selection();

        expect(Haptics.selectionChanged).not.toHaveBeenCalled();
      });
    });
  });

  describe('vibrate', () => {
    describe('on native platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        service = new HapticService();
        (Haptics.vibrate as jest.Mock).mockResolvedValue(undefined);
      });

      it('should vibrate with default duration', async () => {
        await service.vibrate();

        expect(Haptics.vibrate).toHaveBeenCalledWith({ duration: 100 });
      });

      it('should vibrate with custom duration', async () => {
        await service.vibrate(500);

        expect(Haptics.vibrate).toHaveBeenCalledWith({ duration: 500 });
      });

      it('should handle errors silently', async () => {
        (Haptics.vibrate as jest.Mock).mockRejectedValue(new Error('Not supported'));

        await expect(service.vibrate()).resolves.not.toThrow();
      });
    });

    describe('on web platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
        service = new HapticService();
      });

      it('should not call Haptics on web', async () => {
        await service.vibrate();

        expect(Haptics.vibrate).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      service = new HapticService();
    });

    it('should handle impact errors gracefully', async () => {
      (Haptics.impact as jest.Mock).mockRejectedValue(new Error('Device not supported'));

      await expect(service.impact()).resolves.toBeUndefined();
    });

    it('should handle notification errors gracefully', async () => {
      (Haptics.notification as jest.Mock).mockRejectedValue(new Error('Not available'));

      await expect(service.success()).resolves.toBeUndefined();
      await expect(service.warning()).resolves.toBeUndefined();
      await expect(service.error()).resolves.toBeUndefined();
    });

    it('should handle selection errors gracefully', async () => {
      (Haptics.selectionChanged as jest.Mock).mockRejectedValue(new Error('Not supported'));

      await expect(service.selection()).resolves.toBeUndefined();
    });

    it('should handle vibrate errors gracefully', async () => {
      (Haptics.vibrate as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.vibrate()).resolves.toBeUndefined();
    });

    it('should not log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (Haptics.impact as jest.Mock).mockRejectedValue(new Error('Test error'));

      await service.impact();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
