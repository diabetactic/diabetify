/**
 * Icon Test Helper
 *
 * Provides LucideAngularModule with all app icons for testing
 * Import this in tests that render components using Lucide icons
 */
import { LucideAngularModule } from 'lucide-angular';
import { appIcons } from '../../shared/icons/lucide-icons';

/**
 * Get LucideAngularModule configured with all app icons for testing
 *
 * @example
 * TestBed.configureTestingModule({
 *   imports: [MyComponent, getLucideIconsForTesting()],
 * });
 */
export function getLucideIconsForTesting() {
  return LucideAngularModule.pick(appIcons);
}

/**
 * Module metadata for including icons in test imports
 * Use spread operator in imports array
 *
 * @example
 * TestBed.configureTestingModule({
 *   imports: [MyComponent, ...ICON_TEST_IMPORTS],
 * });
 */
export const ICON_TEST_IMPORTS = [LucideAngularModule.pick(appIcons)];
