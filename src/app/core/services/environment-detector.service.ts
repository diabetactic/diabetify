import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/**
 * Service to detect runtime environment and adjust configurations accordingly
 * Handles Android emulator special cases (10.0.2.2 for localhost)
 */
@Injectable({
  providedIn: 'root',
})
export class EnvironmentDetectorService {
  private readonly isNativePlatform = Capacitor.isNativePlatform();
  private readonly platform = Capacitor.getPlatform();

  /**
   * Get the appropriate base URL based on the runtime environment
   * @param defaultUrl The default URL to use (typically localhost:port)
   * @returns The adjusted URL for the current platform
   */
  getBaseUrl(defaultUrl: string): string {
    // Android emulator uses 10.0.2.2 to reach host machine's localhost
    if (this.isAndroidEmulator() && defaultUrl.includes('localhost')) {
      return defaultUrl.replace('localhost', '10.0.2.2');
    }

    // iOS simulator can use localhost directly
    // Web development also uses localhost
    return defaultUrl;
  }

  /**
   * Check if running on Android platform (emulator or device)
   */
  isAndroid(): boolean {
    return this.isNativePlatform && this.platform === 'android';
  }

  /**
   * Check if running on iOS platform (simulator or device)
   */
  isIOS(): boolean {
    return this.isNativePlatform && this.platform === 'ios';
  }

  /**
   * Check if running in web browser (not native)
   */
  isWeb(): boolean {
    return !this.isNativePlatform;
  }

  /**
   * Check if running on Android emulator
   * Note: This is a heuristic - we assume emulator if Android platform
   * For more precise detection, would need native plugin
   */
  isAndroidEmulator(): boolean {
    return this.isAndroid();
  }

  /**
   * Get platform-specific API Gateway URL
   */
  getApiGatewayUrl(): string {
    const defaultUrl = 'http://localhost:8000';
    return this.getBaseUrl(defaultUrl);
  }

  /**
   * Get platform-specific Glucoserver URL
   */
  getGlucoserverUrl(): string {
    const defaultUrl = 'http://localhost:8001';
    return this.getBaseUrl(defaultUrl);
  }

  /**
   * Get platform-specific Appointments service URL
   */
  getAppointmentsUrl(): string {
    const defaultUrl = 'http://localhost:8002';
    return this.getBaseUrl(defaultUrl);
  }

  /**
   * Get platform-specific Auth service URL
   */
  getAuthUrl(): string {
    const defaultUrl = 'http://localhost:8003';
    return this.getBaseUrl(defaultUrl);
  }

  /**
   * Get current platform name for logging/debugging
   */
  getPlatformName(): string {
    if (!this.isNativePlatform) {
      return 'web';
    }
    return this.platform;
  }

  /**
   * Check if network security config is needed (Android debug builds)
   */
  needsNetworkSecurityConfig(): boolean {
    return this.isAndroid();
  }
}
