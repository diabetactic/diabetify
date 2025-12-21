// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { HapticService } from '@services/haptic.service';
import type { Mock } from 'vitest';

// Note: @capacitor/core and @capacitor/haptics are already mocked in test-setup/index.ts

describe('HapticService', () => {
  let service: HapticService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HapticService],
    });

    service = TestBed.inject(HapticService);
    vi.clearAllMocks();
  });

  it('should not call Haptics on web platform', async () => {
    (Capacitor.isNativePlatform as Mock).mockReturnValue(false);
    service = new HapticService();

    const webMethods = [
      { method: 'impact', hapticFn: Haptics.impact },
      { method: 'success', hapticFn: Haptics.notification },
      { method: 'warning', hapticFn: Haptics.notification },
      { method: 'error', hapticFn: Haptics.notification },
      { method: 'selection', hapticFn: Haptics.selectionChanged },
      { method: 'vibrate', hapticFn: Haptics.vibrate },
    ] as const;

    for (const { method } of webMethods) {
      await (service[method] as () => Promise<void>)();
    }

    expect(Haptics.impact).not.toHaveBeenCalled();
    expect(Haptics.notification).not.toHaveBeenCalled();
    expect(Haptics.selectionChanged).not.toHaveBeenCalled();
    expect(Haptics.vibrate).not.toHaveBeenCalled();
  });

  it('should trigger correct impact style on native', async () => {
    (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
    service = new HapticService();
    (Haptics.impact as Mock).mockResolvedValue(undefined);

    const impactStyles = [
      { style: 'light', expected: ImpactStyle.Light },
      { style: 'medium', expected: ImpactStyle.Medium },
      { style: 'heavy', expected: ImpactStyle.Heavy },
    ] as const;

    for (const { style, expected } of impactStyles) {
      vi.clearAllMocks();
      await service.impact(style);
      expect(Haptics.impact).toHaveBeenCalledWith({ style: expected });
    }
  });

  it('should trigger correct notification type on native', async () => {
    (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
    service = new HapticService();
    (Haptics.notification as Mock).mockResolvedValue(undefined);

    const notificationTypes = [
      { method: 'success', expected: NotificationType.Success },
      { method: 'warning', expected: NotificationType.Warning },
      { method: 'error', expected: NotificationType.Error },
    ] as const;

    for (const { method, expected } of notificationTypes) {
      vi.clearAllMocks();
      await service[method]();
      expect(Haptics.notification).toHaveBeenCalledWith({ type: expected });
    }
  });

  it('should trigger selection changed on native', async () => {
    (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
    service = new HapticService();
    (Haptics.selectionChanged as Mock).mockResolvedValue(undefined);

    await service.selection();

    expect(Haptics.selectionChanged).toHaveBeenCalled();
  });

  it('should vibrate with correct duration on native', async () => {
    (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
    service = new HapticService();
    (Haptics.vibrate as Mock).mockResolvedValue(undefined);

    const vibrateDurations = [
      { duration: undefined, expected: 100 },
      { duration: 500, expected: 500 },
    ];

    for (const { duration, expected } of vibrateDurations) {
      vi.clearAllMocks();
      await service.vibrate(duration);
      expect(Haptics.vibrate).toHaveBeenCalledWith({ duration: expected });
    }
  });

  it('should handle all errors gracefully', async () => {
    (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
    service = new HapticService();

    const errorScenarios = [
      {
        mockFn: Haptics.impact,
        serviceFn: () => service.impact(),
        error: new Error('Impact not supported'),
      },
      {
        mockFn: Haptics.notification,
        serviceFn: () => service.success(),
        error: new Error('Notification not available'),
      },
      {
        mockFn: Haptics.notification,
        serviceFn: () => service.warning(),
        error: new Error('Notification not available'),
      },
      {
        mockFn: Haptics.notification,
        serviceFn: () => service.error(),
        error: new Error('Notification not available'),
      },
      {
        mockFn: Haptics.selectionChanged,
        serviceFn: () => service.selection(),
        error: new Error('Selection not supported'),
      },
      {
        mockFn: Haptics.vibrate,
        serviceFn: () => service.vibrate(),
        error: new Error('Permission denied'),
      },
    ];

    for (const { mockFn, serviceFn, error } of errorScenarios) {
      vi.clearAllMocks();
      (mockFn as Mock).mockRejectedValue(error);
      await expect(serviceFn()).resolves.toBeUndefined();
    }
  });

  it('should not log errors to console', async () => {
    (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
    service = new HapticService();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (Haptics.impact as Mock).mockRejectedValue(new Error('Test error'));

    await service.impact();

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should default to light impact when no style specified', async () => {
    (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
    service = new HapticService();
    (Haptics.impact as Mock).mockResolvedValue(undefined);

    await service.impact();

    expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
  });
});
