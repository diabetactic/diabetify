/**
 * Translation Test Helper
 *
 * Provides proper TranslateService mock for testing
 */

import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
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
export function createTranslateServiceMock(): jasmine.SpyObj<TranslateService> {
  const mock = jasmine.createSpyObj<TranslateService>(
    'TranslateService',
    [
      'instant',
      'get',
      'use',
      'addLangs',
      'getLangs',
      'getBrowserLang',
      'getBrowserCultureLang',
      'setDefaultLang',
      'getDefaultLang',
      'resetLang',
      'reloadLang',
      'stream',
    ],
    {
      currentLang: 'en',
      defaultLang: 'en',
      langs: ['en', 'es'],
      onLangChange: of({ lang: 'en', translations: {} } as any),
      onTranslationChange: of({ lang: 'en', translations: {} } as any),
      onDefaultLangChange: of({ lang: 'en', translations: {} } as any),
    }
  );

  // Setup default behaviors
  mock.instant.and.callFake((key: string | string[], _interpolateParams?: object) => {
    if (Array.isArray(key)) {
      const result: any = {};
      key.forEach(k => {
        result[k] = k;
      });
      return result;
    }
    return key;
  });

  mock.get.and.callFake((key: string | string[], _interpolateParams?: object) => {
    if (Array.isArray(key)) {
      const result: any = {};
      key.forEach(k => {
        result[k] = k;
      });
      return of(result);
    }
    return of(key);
  });

  mock.use.and.returnValue(of({}));
  mock.addLangs.and.stub();
  mock.getLangs.and.returnValue(['en', 'es']);
  mock.getBrowserLang.and.returnValue('en');
  mock.getBrowserCultureLang.and.returnValue('en-US');
  mock.setDefaultLang.and.stub();
  mock.getDefaultLang.and.returnValue('en');
  mock.resetLang.and.stub();
  mock.reloadLang.and.returnValue(of({}));
  mock.stream.and.callFake((key: string | string[]) => {
    if (Array.isArray(key)) {
      const result: any = {};
      key.forEach(k => {
        result[k] = k;
      });
      return of(result);
    }
    return of(key);
  });

  return mock;
}
