import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class PlatformDetectorService {
  constructor(private platform: Platform) {}

  /**
   * Get the appropriate API base URL based on the current platform
   * @param defaultUrl The default URL to use (usually localhost:8000)
   * @returns The appropriate base URL for the current platform
   */
  getApiBaseUrl(defaultUrl: string = 'http://localhost:8000'): string {
    // Check if running in Capacitor
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();

      // Android emulator needs special URL to access host machine
      if (platform === 'android') {
        // Check if it's an emulator by looking at the device info
        // Android emulator should use 10.0.2.2 to access host machine
        if (this.isAndroidEmulator()) {
          return 'http://10.0.2.2:8000';
        }
        // Real Android device - use actual server URL
        return this.getProductionUrl() || defaultUrl;
      }

      // iOS simulator can use localhost
      if (platform === 'ios') {
        // Check if it's a simulator
        if (this.isIOSSimulator()) {
          return 'http://localhost:8000';
        }
        // Real iOS device - use actual server URL
        return this.getProductionUrl() || defaultUrl;
      }
    }

    // Web platform - use default URL
    return defaultUrl;
  }

  /**
   * Check if running on Android emulator
   */
  private isAndroidEmulator(): boolean {
    // Check common emulator properties
    const userAgent = navigator.userAgent.toLowerCase();
    const isEmulator =
      userAgent.includes('sdk') ||
      userAgent.includes('emulator') ||
      userAgent.includes('android sdk built for x86') ||
      // Check if running on localhost (common in emulators)
      window.location.hostname === 'localhost' ||
      window.location.hostname === '10.0.2.2';

    return isEmulator;
  }

  /**
   * Check if running on iOS simulator
   */
  private isIOSSimulator(): boolean {
    // Check for simulator indicators
    const userAgent = navigator.userAgent.toLowerCase();
    const isSimulator =
      userAgent.includes('simulator') ||
      // Check if running on localhost (common in simulators)
      window.location.hostname === 'localhost';

    // Additional check: simulators don't have certain device capabilities
    const hasSimulatorTraits =
      !('DeviceMotionEvent' in window) || !('DeviceOrientationEvent' in window);

    return isSimulator || hasSimulatorTraits;
  }

  /**
   * Get production URL from environment or config
   */
  private getProductionUrl(): string | null {
    // This would be configured based on your production environment
    // For now, return null to fall back to default
    // In production, this would return something like 'https://api.diabetactic.com'
    return null;
  }

  /**
   * Get platform-specific configuration
   */
  getPlatformConfig(): {
    platform: string;
    isNative: boolean;
    isWeb: boolean;
    isMobile: boolean;
    isDesktop: boolean;
    baseUrl: string;
  } {
    const isNative = Capacitor.isNativePlatform();
    const platform = isNative ? Capacitor.getPlatform() : 'web';
    const isMobile = this.platform.is('mobile');
    const isDesktop = this.platform.is('desktop');

    return {
      platform,
      isNative,
      isWeb: !isNative,
      isMobile,
      isDesktop,
      baseUrl: this.getApiBaseUrl(),
    };
  }

  /**
   * Log platform information for debugging
   */
  logPlatformInfo(): void {
    const config = this.getPlatformConfig();
    console.log('Platform Configuration:', {
      ...config,
      userAgent: navigator.userAgent,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      port: window.location.port,
    });
  }
}
