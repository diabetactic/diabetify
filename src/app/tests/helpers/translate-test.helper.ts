/**
 * Translation Test Helper
 *
 * Provides proper TranslateService mock for testing
 */

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

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
    instant: jest.fn().mockImplementation((key: string | string[], _interpolateParams?: object) => {
      if (Array.isArray(key)) {
        const result: any = {};
        key.forEach(k => {
          result[k] = k;
        });
        return result;
      }
      return key;
    }),
    get: jest.fn().mockImplementation((key: string | string[], _interpolateParams?: object) => {
      if (Array.isArray(key)) {
        const result: any = {};
        key.forEach(k => {
          result[k] = k;
        });
        return of(result);
      }
      return of(key);
    }),
    use: jest.fn().mockReturnValue(of({})),
    addLangs: jest.fn(),
    getLangs: jest.fn().mockReturnValue(['en', 'es']),
    getBrowserLang: jest.fn().mockReturnValue('en'),
    getBrowserCultureLang: jest.fn().mockReturnValue('en-US'),
    setDefaultLang: jest.fn(),
    getDefaultLang: jest.fn().mockReturnValue('en'),
    resetLang: jest.fn(),
    reloadLang: jest.fn().mockReturnValue(of({})),
    stream: jest.fn().mockImplementation((key: string | string[]) => {
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
