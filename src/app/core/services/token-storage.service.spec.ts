// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from '@services/token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TokenStorageService],
    });
    service = TestBed.inject(TokenStorageService);
  });

  describe('sanitizeForLogging (static method)', () => {
    it('should mask tokens and sensitive fields', () => {
      const tokenTests = [
        {
          input: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc',
          expected: '***TOKEN***',
        },
        { input: 'a'.repeat(60), expected: '***TOKEN***' },
        { input: 'hello', expected: 'hello' },
      ];
      tokenTests.forEach(({ input, expected }) => {
        expect(TokenStorageService.sanitizeForLogging(input)).toBe(expected);
      });

      const data = {
        user: {
          name: 'John',
          credentials: {
            accessToken: 'secret',
            password: 'pass123',
            clientSecret: 'very-secret',
          },
        },
        AccessToken: 'secret1',
        REFRESH_TOKEN: 'secret2',
        Password: 'secret3',
        CLIENT_SECRET: 'secret4',
        email: 'test@example.com',
      };

      const sanitized = TokenStorageService.sanitizeForLogging(data) as any;

      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.credentials.accessToken).toBe('***');
      expect(sanitized.user.credentials.password).toBe('***');
      expect(sanitized.user.credentials.clientSecret).toBe('***');
      expect(sanitized.AccessToken).toBe('***');
      expect(sanitized.REFRESH_TOKEN).toBe('***');
      expect(sanitized.Password).toBe('***');
      expect(sanitized.CLIENT_SECRET).toBe('***');
      expect(sanitized.email).toBe('test@example.com');

      expect(TokenStorageService.sanitizeForLogging(null)).toBeNull();
      expect(TokenStorageService.sanitizeForLogging(undefined)).toBeUndefined();
      expect(TokenStorageService.sanitizeForLogging(123)).toBe(123);
      expect(TokenStorageService.sanitizeForLogging(true)).toBe(true);
      expect(TokenStorageService.sanitizeForLogging(['normal', 'password123'])).toEqual({
        '0': 'normal',
        '1': 'password123',
      });
    });
  });

  it('should be injectable', () => {
    expect(service).toBeTruthy();
  });
});
