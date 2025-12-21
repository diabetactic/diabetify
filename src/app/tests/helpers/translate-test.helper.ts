/**
 * Translation Test Helper
 *
 * Provides proper TranslateService mock for testing
 */

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

/**
 * Mock Translate Loader for tests
 */
export class MockTranslateLoader implements TranslateLoader {
  getTranslation(_lang: string): Observable<any> {
    return of({});
  }
}

/**
 * Get TranslateModule configured for testing
 */
export function getTranslateModuleForTesting() {
  return TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: MockTranslateLoader,
    },
  });
}

/**
 * Create a properly configured TranslateService mock
 */
export function createTranslateServiceMock(): any {
  const mock = {
    instant: vi.fn().mockImplementation((key: string | string[], _interpolateParams?: object) => {
      if (Array.isArray(key)) {
        const result: any = {};
        key.forEach(k => {
          result[k] = k;
        });
        return result;
      }
      return key;
    }),
    get: vi.fn().mockImplementation((key: string | string[], _interpolateParams?: object) => {
      if (Array.isArray(key)) {
        const result: any = {};
        key.forEach(k => {
          result[k] = k;
        });
        return of(result);
      }
      return of(key);
    }),
    use: vi.fn().mockReturnValue(of({})),
    addLangs: vi.fn(),
    getLangs: vi.fn().mockReturnValue(['en', 'es']),
    getBrowserLang: vi.fn().mockReturnValue('en'),
    getBrowserCultureLang: vi.fn().mockReturnValue('en-US'),
    setDefaultLang: vi.fn(),
    getDefaultLang: vi.fn().mockReturnValue('en'),
    resetLang: vi.fn(),
    reloadLang: vi.fn().mockReturnValue(of({})),
    stream: vi.fn().mockImplementation((key: string | string[]) => {
      if (Array.isArray(key)) {
        const result: any = {};
        key.forEach(k => {
          result[k] = k;
        });
        return of(result);
      }
      return of(key);
    }),
    currentLang: 'en',
    defaultLang: 'en',
    langs: ['en', 'es'],
    onLangChange: of({ lang: 'en', translations: {} } as any),
    onTranslationChange: of({ lang: 'en', translations: {} } as any),
    onDefaultLangChange: of({ lang: 'en', translations: {} } as any),
  };

  return mock;
}
