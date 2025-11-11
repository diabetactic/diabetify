# API Gateway Adapter Service

## Overview

The `ApiGatewayAdapterService` is a transparent adapter layer that bridges the gap between the mobile app's expected API paths and the actual backend API Gateway paths. This service fixes path mismatches **without modifying the extServices backend code**.

## Purpose

The mobile app expects certain authentication endpoints (like `/api/auth/login`), but the backend API Gateway uses different paths (like `/token`). This adapter service:

1. **Maps paths**: Translates app-expected paths to actual backend paths
2. **Handles token refresh**: Simulates refresh token functionality (client-side)
3. **Manages token rotation**: Implements secure token rotation logic
4. **Provides backward compatibility**: Maintains consistent API for the app

## Architecture

```
┌─────────────────────┐
│   Mobile App        │
│  (expects /api/auth)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ApiGatewayAdapter   │  ◄─── This layer
│  - Path mapping     │
│  - Token refresh    │
│  - Error handling   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Backend Gateway    │
│  (uses /token,      │
│   /users/me)        │
└─────────────────────┘
```

## Path Mappings

| App Expected Path       | Actual Backend Path | Method | Description              |
|-------------------------|---------------------|--------|--------------------------|
| `/api/auth/login`       | `/token`            | POST   | User login               |
| `/api/auth/register`    | `/users/`           | POST   | User registration        |
| `/api/auth/profile`     | `/users/me`         | GET    | Get user profile         |
| `/api/auth/profile`     | `/users/me`         | PUT    | Update user profile      |
| `/api/auth/refresh`     | *client-side*       | N/A    | Token refresh simulation |
| `/api/auth/logout`      | *client-side*       | N/A    | Clear local tokens       |

## Usage

### 1. Basic Login

```typescript
import { ApiGatewayAdapterService } from '@core/services/api-gateway-adapter.service';

@Component({...})
export class LoginComponent {
  constructor(private adapter: ApiGatewayAdapterService) {}

  async login(username: string, password: string) {
    this.adapter.login(username, password).subscribe({
      next: (response) => {
        console.log('Login successful!');
        console.log('Access Token:', response.access_token);
        console.log('Refresh Token:', response.refresh_token);
        console.log('User:', response.user);

        // Store tokens and navigate
        this.storeAuthData(response);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Login failed:', error.message);

        // Handle specific error codes
        if (error.code === 'ACCOUNT_PENDING') {
          this.showMessage('Your account is pending activation');
        } else if (error.code === 'ACCOUNT_DISABLED') {
          this.showMessage('Your account has been disabled');
        } else if (error.code === 'INVALID_CREDENTIALS') {
          this.showMessage('Invalid username or password');
        }
      }
    });
  }
}
```

### 2. Get User Profile

```typescript
async getProfile(accessToken: string) {
  this.adapter.getProfile(accessToken).subscribe({
    next: (profile) => {
      console.log('User Profile:', profile);
      // profile.dni, profile.name, profile.email, etc.
    },
    error: (error) => {
      if (error.code === 'INVALID_CREDENTIALS') {
        // Token expired, need to refresh or re-login
        this.handleTokenExpired();
      }
    }
  });
}
```

### 3. Token Refresh (Client-Side Simulation)

```typescript
async refreshToken(refreshToken: string) {
  this.adapter.refreshToken(refreshToken).subscribe({
    next: (response) => {
      console.log('Token refreshed!');
      console.log('New Access Token:', response.access_token);
      console.log('New Refresh Token:', response.refresh_token);

      // Update stored tokens
      this.updateAuthData(response);
    },
    error: (error) => {
      if (error.message === 'MAX_REFRESH_EXCEEDED') {
        // User must re-login
        this.router.navigate(['/login']);
      }
    }
  });
}
```

### 4. Check if Token Needs Refresh

```typescript
async checkTokenStatus() {
  const shouldRefresh = await this.adapter.shouldRefreshToken();

  if (shouldRefresh) {
    const tokens = await this.adapter.getStoredTokens();
    if (tokens.refreshToken) {
      this.refreshToken(tokens.refreshToken);
    }
  }
}
```

### 5. Logout

```typescript
async logout() {
  await this.adapter.logout();
  this.router.navigate(['/login']);
}
```

## Response Format

### Login/Register Response

```typescript
interface AuthResponse {
  access_token: string;           // JWT access token
  refresh_token: string | null;   // Client-side refresh token
  token_type: string;              // 'bearer'
  expires_in: number;              // Token lifetime in seconds (1800 = 30 min)
  user: {
    id: string;                    // User DNI
    email: string;                 // User email
    firstName: string;             // First name
    lastName: string;              // Last name
    role: 'patient' | 'doctor' | 'admin';
    accountState: 'pending' | 'active' | 'disabled';
  };
}
```

### User Profile Response

```typescript
interface BackendUserProfile {
  dni: string;                     // User ID (DNI)
  name: string;                    // First name
  surname: string;                 // Last name
  blocked: boolean;                // Is account blocked
  email: string;                   // Email address
  state?: 'pending' | 'active' | 'disabled';
  tidepool?: string | null;        // Tidepool integration ID
  hospital_account: string;        // Hospital account ID
  times_measured: number;          // Number of measurements
  streak: number;                  // Current streak
  max_streak: number;              // Maximum streak
}
```

## Error Handling

The adapter provides standardized error codes:

| Error Code               | Description                               | HTTP Status |
|--------------------------|-------------------------------------------|-------------|
| `INVALID_CREDENTIALS`    | Wrong username/password                   | 401         |
| `ACCOUNT_PENDING`        | Account awaiting activation               | N/A         |
| `ACCOUNT_DISABLED`       | Account has been disabled                 | 403         |
| `USER_NOT_FOUND`         | User does not exist                       | 404         |
| `VALIDATION_ERROR`       | Invalid input data                        | 422         |
| `SERVER_ERROR`           | Internal server error                     | 500         |
| `NETWORK_ERROR`          | Network connection failed                 | 0           |
| `INVALID_REFRESH_TOKEN`  | Refresh token is invalid                  | N/A         |
| `MAX_REFRESH_EXCEEDED`   | Too many refresh cycles, re-login needed  | N/A         |
| `REFRESH_IN_PROGRESS`    | Concurrent refresh attempt detected       | N/A         |

### Error Handling Example

```typescript
this.adapter.login(username, password).subscribe({
  error: (error) => {
    // Access error code
    console.log('Error code:', error.code);

    // Access error message
    console.log('Error message:', error.message);

    // Access original error (if available)
    console.log('Original error:', error.originalError);

    // Handle specific errors
    switch (error.code) {
      case 'ACCOUNT_PENDING':
        this.showPendingAccountDialog();
        break;
      case 'ACCOUNT_DISABLED':
        this.showDisabledAccountDialog();
        break;
      case 'INVALID_CREDENTIALS':
        this.showInvalidCredentialsMessage();
        break;
      default:
        this.showGenericError(error.message);
    }
  }
});
```

## Token Management

### Token Storage

Tokens are stored securely using Capacitor Preferences:

- **Native platforms** (iOS/Android): Always stored
- **Web platform**: Not stored by adapter (handle in app layer)

Storage keys (internal):
- `adapter_access_token`
- `adapter_refresh_token`
- `adapter_token_expires_at`
- `adapter_user_profile`
- `adapter_rotation_count`

### Token Lifecycle

```
┌─────────────┐
│  Login      │
└──────┬──────┘
       │
       ▼
┌─────────────┐     Token expires in 5 min
│  Token      │────────────────┐
│  Active     │                │
└─────────────┘                ▼
       │              ┌─────────────────┐
       │              │ Auto-refresh    │
       │              │ (if enabled)    │
       │              └────────┬────────┘
       │                       │
       │                       ▼
       │              ┌─────────────────┐
       │              │ Rotate tokens   │
       │              └────────┬────────┘
       │                       │
       ▼                       ▼
┌─────────────┐      ┌─────────────────┐
│  Expired    │      │ Continue (1-10  │
│  (Re-login) │      │ rotations max)  │
└─────────────┘      └─────────────────┘
```

### Token Refresh Configuration

```typescript
const REFRESH_CONFIG = {
  TOKEN_LIFETIME: 30 * 60 * 1000,      // 30 minutes (matches backend)
  REFRESH_THRESHOLD: 5 * 60 * 1000,    // Refresh if < 5 minutes remaining
  MAX_ROTATION_COUNT: 10,               // Max refresh cycles before re-login
};
```

## Integration with Existing Services

### Option 1: Update LocalAuthService to Use Adapter

```typescript
// src/app/core/services/local-auth.service.ts

import { ApiGatewayAdapterService } from './api-gateway-adapter.service';

@Injectable({ providedIn: 'root' })
export class LocalAuthService {
  constructor(
    private adapter: ApiGatewayAdapterService,
    // ... other dependencies
  ) {}

  login(username: string, password: string): Observable<LoginResult> {
    return this.adapter.login(username, password).pipe(
      map(authResponse => ({
        success: true,
        user: this.mapToLocalUser(authResponse.user),
      })),
      tap(result => {
        // Store auth state
        this.updateAuthState(result.user, authResponse.access_token);
      }),
      catchError(error => {
        return of({
          success: false,
          error: this.extractErrorMessage(error),
        });
      })
    );
  }

  private mapToLocalUser(user: any): LocalUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      accountState: user.accountState,
      // ... map other fields
    };
  }
}
```

### Option 2: Direct Usage in Components

```typescript
// src/app/login/login.page.ts

import { ApiGatewayAdapterService } from '@core/services/api-gateway-adapter.service';

@Component({...})
export class LoginPage {
  constructor(
    private adapter: ApiGatewayAdapterService,
    private router: Router
  ) {}

  onSubmit() {
    this.adapter.login(this.username, this.password).subscribe({
      next: (response) => {
        // Store tokens
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);

        // Navigate to dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }
}
```

## Testing

### Unit Tests

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiGatewayAdapterService } from './api-gateway-adapter.service';

describe('ApiGatewayAdapterService', () => {
  let service: ApiGatewayAdapterService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiGatewayAdapterService]
    });

    service = TestBed.inject(ApiGatewayAdapterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should login successfully', (done) => {
    service.login('test@example.com', 'password').subscribe(response => {
      expect(response.access_token).toBeTruthy();
      expect(response.user.email).toBe('test@example.com');
      done();
    });

    // Mock token request
    const tokenReq = httpMock.expectOne(req => req.url.includes('/token'));
    tokenReq.flush({ access_token: 'mock_token', token_type: 'bearer' });

    // Mock profile request
    const profileReq = httpMock.expectOne(req => req.url.includes('/users/me'));
    profileReq.flush({
      dni: '123',
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      state: 'active'
    });
  });
});
```

### Integration Tests

See `api-gateway-adapter.service.spec.ts` for comprehensive test coverage.

## Security Considerations

1. **Token Storage**: Uses Capacitor Preferences for secure storage on native platforms
2. **Token Rotation**: Implements rotation to limit exposure
3. **Max Rotations**: Forces re-login after 10 refresh cycles
4. **Client-Side Refresh**: Refresh tokens are client-generated (not from backend)
5. **No Backend Modification**: Backend remains unchanged and secure

### Security Best Practices

- Always use HTTPS in production
- Never log tokens in production
- Clear tokens on logout
- Implement token expiry checks
- Handle token expiration gracefully
- Use secure storage APIs (Capacitor Preferences)

## Troubleshooting

### Issue: "No access token received"

**Cause**: Backend didn't return `access_token` in response

**Solution**: Check backend logs, verify `/token` endpoint is working

### Issue: "ACCOUNT_PENDING" error

**Cause**: User account is in pending state

**Solution**: Contact admin to activate account

### Issue: "MAX_REFRESH_EXCEEDED" error

**Cause**: Too many token refresh cycles

**Solution**: User must log in again

### Issue: "Network connection error"

**Cause**: Backend is unreachable

**Solution**: Check backend is running, verify network connectivity

## Future Enhancements

1. **Backend Refresh Support**: When backend implements refresh tokens, update adapter
2. **Biometric Auth**: Add biometric authentication support
3. **SSO Integration**: Add single sign-on support
4. **Multi-Factor Auth**: Add MFA support
5. **Token Revocation**: Implement token revocation API

## References

- [FastAPI OAuth2 Documentation](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Capacitor Preferences API](https://capacitorjs.com/docs/apis/preferences)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

## Changelog

### Version 1.0.0 (2025-01-07)

- Initial implementation
- Path mapping for auth endpoints
- Client-side token refresh simulation
- Token rotation with max cycles
- Comprehensive error handling
- Secure token storage
- Full test coverage
