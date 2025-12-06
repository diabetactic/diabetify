# Critical Security Fixes Required

**Priority:** HIGH
**Deadline:** Before production deployment
**Estimated Time:** 6-8 hours

---

## Overview

This document outlines the **7 critical security issues** identified in the security audit that require immediate remediation. All issues are related to **credential/token logging** which poses a HIPAA/COPPA compliance risk.

---

## Critical Issues to Fix

### 1. Remove Credential Logging in Authentication Error Handlers

**Files to Fix:**

- `src/app/core/services/local-auth.service.ts` (lines 361-370)
- `src/app/core/services/tidepool-auth.service.ts` (lines 423, 474, 527)
- `src/app/core/services/profile.service.ts` (lines 259, 285)
- `src/app/core/services/token-storage.service.ts` (lines 114, 169)

**Current Code (INSECURE):**

```typescript
// local-auth.service.ts (lines 361-370)
console.error('❌ [AUTH] HTTP request failed');
console.error('❌ [AUTH] Error object:', error);
console.error('❌ [AUTH] Error status:', error?.status);
console.error('❌ [AUTH] Error statusText:', error?.statusText);
console.error('❌ [AUTH] Error message:', error?.message);
console.error('❌ [AUTH] Error error:', error?.error);
console.error(
  '❌ [AUTH] Full error JSON:',
  error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'null/undefined'
);
```

**Fixed Code (SECURE):**

```typescript
// Remove all console.error in authentication flows
// Use LoggerService instead with sanitized error objects
this.logger.error('Auth', 'Login failed', this.sanitizeError(error), {
  username,
  baseUrl: this.baseUrl,
  status: error?.status || null,
});
```

---

### 2. Implement Error Sanitization Middleware

**Create New File:** `src/app/core/utils/error-sanitizer.util.ts`

```typescript
/**
 * Sanitize error objects to prevent credential/token leakage in logs
 */
export class ErrorSanitizer {
  private static readonly SENSITIVE_FIELDS = [
    'password',
    'token',
    'credential',
    'authorization',
    'x-auth',
    'access_token',
    'refresh_token',
    'api_key',
    'secret',
  ];

  /**
   * Sanitize error object by redacting sensitive fields
   */
  static sanitize(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
      return error;
    }

    const sanitized = { ...error };

    // Redact top-level fields
    Object.keys(sanitized).forEach(key => {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      }
    });

    // Sanitize nested error object
    if (sanitized['error'] && typeof sanitized['error'] === 'object') {
      sanitized['error'] = this.sanitize(sanitized['error']);
    }

    return sanitized;
  }

  /**
   * Check if field name contains sensitive keywords
   */
  private static isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.SENSITIVE_FIELDS.some(sensitive => lowerField.includes(sensitive));
  }

  /**
   * Sanitize HTTP headers (remove Authorization, X-Auth, etc.)
   */
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    Object.keys(sanitized).forEach(key => {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      }
    });
    return sanitized;
  }
}
```

---

### 3. Update LocalAuthService Error Handling

**File:** `src/app/core/services/local-auth.service.ts`

**Changes Required:**

1. **Import ErrorSanitizer:**

```typescript
import { ErrorSanitizer } from '../utils/error-sanitizer.util';
```

2. **Replace lines 361-373 with:**

```typescript
// SECURE: Log only sanitized error information
this.logger.error('Auth', 'Login failed', ErrorSanitizer.sanitize(error), {
  username,
  baseUrl: this.baseUrl,
  status: error?.status || null,
});
```

3. **Remove line 717 (token expiration warning):**

```typescript
// REMOVE THIS LINE:
console.log('Token will expire soon. User should re-authenticate.');

// REPLACE WITH:
this.logger.info('Auth', 'Token expiring soon', { expiresIn: reminderTime });
```

---

### 4. Update TidepoolAuthService Error Handling

**File:** `src/app/core/services/tidepool-auth.service.ts`

**Changes Required:**

1. **Import ErrorSanitizer:**

```typescript
import { ErrorSanitizer } from '../utils/error-sanitizer.util';
```

2. **Replace line 423:**

```typescript
// OLD (INSECURE):
console.error('Token exchange failed:', error);

// NEW (SECURE):
this.logger.error('TidepoolAuth', 'Token exchange failed', ErrorSanitizer.sanitize(error));
```

3. **Replace line 474:**

```typescript
// OLD (INSECURE):
console.error('Failed to decode ID token:', error);

// NEW (SECURE):
this.logger.error('TidepoolAuth', 'Failed to decode ID token', ErrorSanitizer.sanitize(error));
```

4. **Replace line 527:**

```typescript
// OLD (INSECURE):
console.error('Token refresh failed:', error);

// NEW (SECURE):
this.logger.error('TidepoolAuth', 'Token refresh failed', ErrorSanitizer.sanitize(error));
```

---

### 5. Update ProfileService Error Handling

**File:** `src/app/core/services/profile.service.ts`

**Changes Required:**

1. **Import ErrorSanitizer:**

```typescript
import { ErrorSanitizer } from '../utils/error-sanitizer.util';
```

2. **Replace line 259:**

```typescript
// OLD (INSECURE):
console.error('Failed to set Tidepool credentials:', error);

// NEW (SECURE):
this.logger.error('Profile', 'Failed to set Tidepool credentials', ErrorSanitizer.sanitize(error));
```

3. **Replace line 285:**

```typescript
// OLD (INSECURE):
console.error('Failed to get Tidepool credentials:', error);

// NEW (SECURE):
this.logger.error('Profile', 'Failed to get Tidepool credentials', ErrorSanitizer.sanitize(error));
```

---

### 6. Update TokenStorageService Error Handling

**File:** `src/app/core/services/token-storage.service.ts`

**Changes Required:**

1. **Import ErrorSanitizer:**

```typescript
import { ErrorSanitizer } from '../utils/error-sanitizer.util';
```

2. **Replace line 114:**

```typescript
// OLD (INSECURE):
console.error('Failed to retrieve refresh token');

// NEW (SECURE):
this.logger.error('TokenStorage', 'Failed to retrieve refresh token');
```

3. **Replace line 169:**

```typescript
// OLD (INSECURE):
console.error('Failed to clear tokens');

// NEW (SECURE):
this.logger.error('TokenStorage', 'Failed to clear tokens');
```

---

### 7. Disable Console Logging in Production

**File:** `src/environments/environment.prod.ts`

**Add Configuration:**

```typescript
export const environment = {
  production: true,
  logging: {
    enableConsole: false, // ← ADD THIS
    enableApiLogging: false, // ← ADD THIS
    logLevel: 'error' as 'debug' | 'info' | 'warn' | 'error',
  },
  // ... rest of config
};
```

**File:** `src/app/core/services/logger.service.ts`

**Update to respect environment flag:**

```typescript
import { environment } from '../../../environments/environment';

// In each logging method (debug, info, warn, error):
if (!environment.logging.enableConsole) {
  return; // Skip console output in production
}
```

---

### 8. Remove Demo Credentials Logging (Low Priority)

**File:** `src/app/core/services/demo-data.service.ts`

**Change line 508:**

```typescript
// OLD:
console.log('✅ Demo credentials: demo@diabetactic.com / demo123');

// NEW:
this.logger.info('DemoData', 'Demo mode active');
```

---

## Verification Steps

After implementing fixes, verify security with these steps:

1. **Run the app in development mode:**

   ```bash
   ENV=cloud npm start
   ```

2. **Open browser DevTools Console**

3. **Attempt login with invalid credentials**

4. **Verify NO sensitive data in console:**
   - ❌ No passwords logged
   - ❌ No tokens logged
   - ❌ No "Full error JSON" with credentials
   - ✅ Only sanitized error messages

5. **Check production build:**

   ```bash
   npm run build:prod
   ```

   - ✅ No console.log/error in production bundles (except LoggerService)

6. **Test logout:**
   - ✅ All tokens cleared from storage
   - ✅ IndexedDB cleared
   - ✅ No sensitive data in console

---

## Testing Checklist

- [ ] ErrorSanitizer utility created and tested
- [ ] LocalAuthService updated with sanitized error logging
- [ ] TidepoolAuthService updated with sanitized error logging
- [ ] ProfileService updated with sanitized error logging
- [ ] TokenStorageService updated with sanitized error logging
- [ ] Production environment disables console logging
- [ ] Demo credentials logging removed
- [ ] Manual testing: no credentials in console during login errors
- [ ] Manual testing: no tokens in console during token refresh errors
- [ ] Production build: console.log/error removed (except LoggerService)

---

## Estimated Timeline

| Task                          | Time          | Priority     |
| ----------------------------- | ------------- | ------------ |
| Create ErrorSanitizer utility | 1 hour        | Critical     |
| Update LocalAuthService       | 1 hour        | Critical     |
| Update TidepoolAuthService    | 30 min        | Critical     |
| Update ProfileService         | 30 min        | Critical     |
| Update TokenStorageService    | 30 min        | Critical     |
| Disable production console    | 30 min        | Critical     |
| Testing & verification        | 2-3 hours     | Critical     |
| **TOTAL**                     | **6-8 hours** | **Critical** |

---

## Success Criteria

✅ **Zero credentials/tokens logged to console**
✅ **All errors sanitized before logging**
✅ **Production console logging disabled**
✅ **HIPAA/COPPA compliance achieved**
✅ **Security audit passes with no critical issues**

---

**Document Created:** 2025-12-06
**Priority:** HIGH
**Status:** PENDING IMPLEMENTATION
