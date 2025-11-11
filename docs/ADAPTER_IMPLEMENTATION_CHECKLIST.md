# API Gateway Adapter - Implementation Checklist

## Overview

This checklist guides you through integrating the API Gateway Adapter Service into your Diabetify mobile app.

## Files Created

- ✅ **Service**: `src/app/core/services/api-gateway-adapter.service.ts` (540 lines)
- ✅ **Tests**: `src/app/core/services/api-gateway-adapter.service.spec.ts` (473 lines)
- ✅ **Main Docs**: `docs/API_GATEWAY_ADAPTER.md` (499 lines)
- ✅ **Summary**: `docs/API_GATEWAY_ADAPTER_SUMMARY.md` (482 lines)
- ✅ **Integration Guide**: `docs/api-reference/ADAPTER_INTEGRATION_EXAMPLE.md` (650 lines)
- ✅ **Architecture**: `docs/api-reference/ADAPTER_ARCHITECTURE_DIAGRAM.md` (600+ lines)

**Total**: ~2,644 lines of production-ready code and documentation

## Phase 1: Installation & Verification (30 minutes)

### 1.1 Verify Files

```bash
# Check service file exists
ls -lh src/app/core/services/api-gateway-adapter.service.ts

# Check test file exists
ls -lh src/app/core/services/api-gateway-adapter.service.spec.ts

# Check documentation exists
ls -lh docs/API_GATEWAY_ADAPTER*.md
ls -lh docs/api-reference/ADAPTER_*.md
```

**Expected output**: All files should exist with sizes ~15-20KB

- [ ] Service file exists
- [ ] Test file exists
- [ ] Documentation files exist

### 1.2 Install Dependencies (if needed)

```bash
# Verify Capacitor Preferences is installed
npm list @capacitor/preferences

# If not installed:
npm install @capacitor/preferences
```

- [ ] Dependencies installed

### 1.3 Run Unit Tests

```bash
# Run adapter tests only
npm test -- --include='**/api-gateway-adapter.service.spec.ts' --watch=false

# Or run all tests
npm test
```

**Expected**: All tests should pass

- [ ] Unit tests pass

### 1.4 TypeScript Compilation

```bash
# Check for TypeScript errors
npx tsc --noEmit
```

**Expected**: No compilation errors

- [ ] TypeScript compiles without errors

## Phase 2: Backend Verification (15 minutes)

### 2.1 Start Backend Services

```bash
# Navigate to API Gateway
cd extServices/api-gateway

# Start the service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected**: Service starts on http://localhost:8000

- [ ] Backend API Gateway running

### 2.2 Test Backend Endpoints

```bash
# Test token endpoint
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Should return:
# {"access_token": "...", "token_type": "bearer"}
```

- [ ] `/token` endpoint works
- [ ] Returns access token

```bash
# Test user profile endpoint (replace TOKEN with actual token)
curl -X GET "http://localhost:8000/users/me" \
  -H "Authorization: Bearer TOKEN"

# Should return user profile
```

- [ ] `/users/me` endpoint works
- [ ] Returns user profile

### 2.3 Verify API Gateway Configuration

Check `src/environments/environment.ts`:

```typescript
backendServices: {
  apiGateway: {
    baseUrl: getBaseUrl(), // Should be http://localhost:8000
  }
}
```

- [ ] API Gateway URL configured correctly

## Phase 3: Integration (1-2 hours)

### Option A: Update LocalAuthService (Recommended)

#### 3.1 Backup Current LocalAuthService

```bash
cp src/app/core/services/local-auth.service.ts \
   src/app/core/services/local-auth.service.ts.backup
```

- [ ] Backup created

#### 3.2 Import Adapter

Add to `local-auth.service.ts`:

```typescript
import { ApiGatewayAdapterService, AuthResponse } from './api-gateway-adapter.service';
```

- [ ] Adapter imported

#### 3.3 Inject Adapter

Add to constructor:

```typescript
constructor(
  private adapter: ApiGatewayAdapterService,
  // ... other dependencies
) {}
```

- [ ] Adapter injected

#### 3.4 Update Login Method

Replace existing login implementation with:

```typescript
login(username: string, password: string, rememberMe: boolean = false): Observable<LoginResult> {
  return this.adapter.login(username, password).pipe(
    switchMap(authResponse => {
      return from(this.handleAuthResponse(authResponse, rememberMe)).pipe(
        map(() => ({
          success: true,
          user: this.mapAdapterUserToLocalUser(authResponse),
        }))
      );
    }),
    catchError(error => {
      return of({
        success: false,
        error: this.extractAdapterErrorMessage(error),
      });
    })
  );
}
```

- [ ] Login method updated

#### 3.5 Update Other Methods

Update:
- `refreshAccessToken()` - Use `adapter.refreshToken()`
- `logout()` - Call `adapter.logout()`
- `updateProfile()` - Use `adapter.updateProfile()`

- [ ] Refresh method updated
- [ ] Logout method updated
- [ ] Profile update method updated

#### 3.6 Add Helper Methods

Add mapping and error handling methods (see ADAPTER_INTEGRATION_EXAMPLE.md):
- `mapAdapterUserToLocalUser()`
- `extractAdapterErrorMessage()`
- `handleAuthResponse()`

- [ ] Helper methods added

### Option B: Direct Usage in Components

#### 3.7 Import in Login Component

```typescript
import { ApiGatewayAdapterService } from '@core/services/api-gateway-adapter.service';
```

- [ ] Adapter imported in login component

#### 3.8 Update Login Handler

```typescript
onSubmit() {
  this.adapter.login(this.username, this.password).subscribe({
    next: (response) => {
      // Store tokens
      sessionStorage.setItem('access_token', response.access_token);

      // Navigate
      this.router.navigate(['/dashboard']);
    },
    error: (error) => {
      this.errorMessage = this.getErrorMessage(error.code);
    }
  });
}
```

- [ ] Login handler updated

## Phase 4: Testing (2-3 hours)

### 4.1 Manual Testing

#### Test Case 1: Successful Login

1. Start app: `npm start`
2. Navigate to login
3. Enter valid credentials
4. Click login

**Expected**:
- No errors in console
- Token stored
- Redirected to dashboard
- User profile displayed

- [ ] Successful login works

#### Test Case 2: Invalid Credentials

1. Enter wrong password
2. Click login

**Expected**:
- Error message displayed
- Error code: `INVALID_CREDENTIALS`
- User stays on login page

- [ ] Invalid credentials handled

#### Test Case 3: Pending Account

1. Login with pending account (if available)

**Expected**:
- Error message: "Account pending activation"
- Error code: `ACCOUNT_PENDING`

- [ ] Pending account blocked

#### Test Case 4: Network Error

1. Stop backend
2. Try to login

**Expected**:
- Error message: "Network connection error"
- Error code: `NETWORK_ERROR`

- [ ] Network error handled

#### Test Case 5: Token Storage

1. Login successfully
2. Close app
3. Reopen app

**Expected** (on native platforms):
- User still logged in
- Token loaded from storage
- No re-login required

- [ ] Token persistence works

#### Test Case 6: Logout

1. Login
2. Navigate to profile
3. Logout

**Expected**:
- Tokens cleared
- Redirected to login
- Can't access protected routes

- [ ] Logout works

### 4.2 Update Unit Tests

Update existing tests to mock the adapter:

```typescript
beforeEach(() => {
  const adapterSpy = jasmine.createSpyObj('ApiGatewayAdapterService', [
    'login',
    'logout',
    'refreshToken',
    'getProfile'
  ]);

  TestBed.configureTestingModule({
    providers: [
      { provide: ApiGatewayAdapterService, useValue: adapterSpy }
    ]
  });
});
```

- [ ] Unit tests updated
- [ ] All unit tests pass

### 4.3 Update Integration Tests

If you have integration tests, update them to use the adapter.

- [ ] Integration tests updated
- [ ] All integration tests pass

### 4.4 E2E Tests

Update Playwright tests:

```typescript
test('login flow', async ({ page }) => {
  await page.goto('http://localhost:4200/login');

  await page.fill('[data-testid="username"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');

  await expect(page).toHaveURL(/dashboard/);
});
```

- [ ] E2E tests updated
- [ ] All E2E tests pass

## Phase 5: Mobile Testing (2-3 hours)

### 5.1 iOS Testing

```bash
# Sync to iOS
npm run cap:sync

# Open in Xcode
npm run cap:open ios

# Or run directly
npm run cap:run ios
```

**Test on iOS**:
- [ ] Login works
- [ ] Token stored securely
- [ ] App restart preserves login
- [ ] Logout clears tokens
- [ ] Error handling works

### 5.2 Android Testing

```bash
# Sync to Android
npm run cap:sync

# Open in Android Studio
npm run cap:open android

# Or run directly
npm run cap:run android
```

**Test on Android**:
- [ ] Login works
- [ ] Token stored securely
- [ ] App restart preserves login
- [ ] Logout clears tokens
- [ ] Error handling works

### 5.3 Device Testing

Test on real devices:

**iOS Device**:
- [ ] iPhone 12+ (iOS 15+)
- [ ] iPad (iOS 15+)

**Android Device**:
- [ ] Samsung Galaxy S20+ (Android 11+)
- [ ] Google Pixel 6+ (Android 12+)

## Phase 6: Performance & Security (1-2 hours)

### 6.1 Performance Testing

Measure performance:

```typescript
// In adapter service
console.time('login');
adapter.login(username, password).subscribe({
  next: () => console.timeEnd('login')
});
```

**Expected**:
- Login: < 1000ms
- Token refresh: < 100ms
- Storage operations: < 50ms

- [ ] Performance meets expectations

### 6.2 Security Review

#### Check Token Storage

```typescript
// Verify tokens are stored securely
const tokens = await adapter.getStoredTokens();
console.log('Access token length:', tokens.accessToken?.length);
console.log('Refresh token length:', tokens.refreshToken?.length);
```

**Expected**:
- Access token: JWT format (~200+ chars)
- Refresh token: 64 hex chars

- [ ] Tokens stored correctly

#### Check Token Expiration

```typescript
const tokens = await adapter.getStoredTokens();
const timeUntilExpiry = tokens.expiresAt! - Date.now();
console.log('Time until expiry (min):', timeUntilExpiry / 60000);
```

**Expected**: ~30 minutes after login

- [ ] Token expiration tracked

#### Check HTTPS

Verify production uses HTTPS:

```typescript
// In environment.prod.ts
apiGateway: {
  baseUrl: 'https://api.diabetactic.com'  // HTTPS only!
}
```

- [ ] Production uses HTTPS

### 6.3 Logging Review

Check logs are working:

```bash
# Enable debug logging
# In environment.ts
logging: {
  logLevel: 'debug'
}

# Check browser console / device logs
```

**Expected**:
- Login attempts logged
- Token refresh logged
- Errors logged with context

- [ ] Logging works correctly

## Phase 7: Documentation (30 minutes)

### 7.1 Update Project Documentation

Update `README.md` with:
- Link to adapter documentation
- Integration notes
- Known issues

- [ ] README updated

### 7.2 Add Code Comments

Ensure your integration code has comments explaining:
- Why adapter is used
- How token refresh works
- Error handling approach

- [ ] Code commented

### 7.3 Create Team Handoff

Document for team:
- What changed
- How to use adapter
- Where to find docs
- Who to contact for issues

- [ ] Team documentation created

## Phase 8: Deployment (1-2 hours)

### 8.1 Staging Deployment

Deploy to staging environment:

```bash
# Build production
npm run build -- --configuration=staging

# Deploy to staging
# (Your deployment process)
```

**Test in staging**:
- [ ] Login works
- [ ] Token refresh works
- [ ] Error handling works
- [ ] Performance acceptable

### 8.2 Production Checklist

Before production:
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Security reviewed
- [ ] Performance tested
- [ ] Documentation complete
- [ ] Team trained
- [ ] Rollback plan ready

### 8.3 Production Deployment

```bash
# Build production
npm run build -- --configuration=production

# Deploy to production
# (Your deployment process)
```

- [ ] Deployed to production

### 8.4 Post-Deployment

Monitor for 24-48 hours:
- [ ] Login success rate
- [ ] Error rate
- [ ] Token refresh rate
- [ ] Performance metrics
- [ ] User feedback

## Phase 9: Monitoring (Ongoing)

### 9.1 Setup Monitoring

Configure monitoring for:
- Login success/failure rates
- Token refresh frequency
- Error codes frequency
- API response times
- Network error rates

- [ ] Monitoring configured

### 9.2 Setup Alerts

Create alerts for:
- Login failure rate > 10%
- Token refresh failure rate > 5%
- Network error rate > 20%
- API response time > 2s

- [ ] Alerts configured

### 9.3 Regular Reviews

Schedule regular reviews:
- Weekly: Check error logs
- Monthly: Review performance
- Quarterly: Security audit

- [ ] Review schedule created

## Troubleshooting Quick Reference

### Issue: Tests not running

**Solution**:
```bash
npm install
rm -rf node_modules/.cache
npm test
```

### Issue: Backend not responding

**Solution**:
```bash
cd extServices/api-gateway
python -m uvicorn app.main:app --reload
```

### Issue: Token not persisting

**Solution**: Check Capacitor Preferences is installed:
```bash
npm list @capacitor/preferences
npm install @capacitor/preferences
```

### Issue: CORS errors

**Solution**: Add CORS middleware to backend:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Success Criteria

✅ **Phase 1-3**: All files created, tests pass, integration complete
✅ **Phase 4**: All test cases pass
✅ **Phase 5**: Works on iOS and Android
✅ **Phase 6**: Performance and security validated
✅ **Phase 7**: Documentation complete
✅ **Phase 8**: Successfully deployed
✅ **Phase 9**: Monitoring active

## Next Steps

After completion:
1. Monitor production for issues
2. Gather user feedback
3. Plan future enhancements
4. Update documentation as needed

## Support

For questions or issues:
- **Documentation**: `docs/API_GATEWAY_ADAPTER.md`
- **Examples**: `docs/api-reference/ADAPTER_INTEGRATION_EXAMPLE.md`
- **Architecture**: `docs/api-reference/ADAPTER_ARCHITECTURE_DIAGRAM.md`

---

**Estimated Total Time**: 8-12 hours
**Recommended Team Size**: 1-2 developers
**Difficulty**: Medium
**Risk Level**: Low (no backend changes)
