import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Haptic Feedback Service
 * Provides tactile feedback for important user interactions.
 * Falls back gracefully on web/unsupported platforms.
 *
 * Usage:
 * - hapticService.impact() - Light tap for button presses
 * - hapticService.success() - Positive confirmation (good glucose reading)
 * - hapticService.warning() - Attention needed (low/high glucose)
 * - hapticService.error() - Error occurred
 * - hapticService.selection() - Selection changed (toggles, segments)
 */
@Injectable({
  providedIn: 'root',
})
export class HapticService {
  private readonly isNative = Capacitor.isNativePlatform();

  /**
   * Light impact - for button presses, card taps
   */
  async impact(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    if (!this.isNative) return;

    const impactStyle: ImpactStyle =
      style === 'heavy'
        ? ImpactStyle.Heavy
        : style === 'medium'
          ? ImpactStyle.Medium
          : ImpactStyle.Light;

    try {
      await Haptics.impact({ style: impactStyle });
    } catch {
      // Silently fail on unsupported devices
    }
  }

  /**
   * Success notification - for positive actions (good readings, sync complete)
   */
  async success(): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Silently fail on unsupported devices
    }
  }

  /**
   * Warning notification - for attention-needed states (low/high glucose)
   */
  async warning(): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      // Silently fail on unsupported devices
    }
  }

  /**
   * Error notification - for errors and failures
   */
  async error(): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      // Silently fail on unsupported devices
    }
  }

  /**
   * Selection changed - for toggles, segments, pickers
   */
  async selection(): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.selectionChanged();
    } catch {
      // Silently fail on unsupported devices
    }
  }

  /**
   * Vibrate - custom duration (use sparingly)
   */
  async vibrate(duration: number = 100): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.vibrate({ duration });
    } catch {
      // Silently fail on unsupported devices
    }
  }

  /**
   * Check if haptics are available
   */
  get isAvailable(): boolean {
    return this.isNative;
  }
}
