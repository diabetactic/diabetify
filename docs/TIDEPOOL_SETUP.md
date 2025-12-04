# Tidepool Authentication Setup

Diabetactic uses Tidepool **only for user authentication** - to obtain a user ID (and optionally email). Glucose data is managed by the Diabetactic backend, not synced from Tidepool.

## How It Works

1. User taps "Connect to Tidepool" in the app
2. App opens Tidepool login page in an in-app browser
3. User logs in with their Tidepool credentials
4. Tidepool redirects back with an authorization code
5. App exchanges code for tokens and extracts user ID
6. User ID can be used for identification purposes

## Configuration

### Environment Variables

In `src/environments/environment.ts`:

```typescript
tidepool: {
  baseUrl: 'https://api.tidepool.org',
  authUrl: 'https://api.tidepool.org/auth',
  clientId: 'diabetactic-mobile-dev',
  redirectUri: 'diabetactic://oauth/callback',
  scopes: 'profile:read',
}
```

### Redirect URI Setup

The custom URL scheme `diabetactic://` is configured in:

**Android** (`android/app/src/main/AndroidManifest.xml`):

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="diabetactic" android:host="oauth" android:path="/callback" />
</intent-filter>
```

## Usage

```typescript
// In your component or service
import { TidepoolAuthService } from '@core/services/tidepool-auth.service';

constructor(private tidepoolAuth: TidepoolAuthService) {}

async connectTidepool() {
  const result = await this.tidepoolAuth.login();
  if (result.success) {
    console.log('Tidepool User ID:', result.userId);
    console.log('Email:', result.email);
  }
}
```

## Testing

For development without a real Tidepool connection, use mock mode:

```typescript
// In environment.ts
const DEV_BACKEND_MODE: BackendMode = 'mock';
```

## Security

- OAuth2/PKCE protects the authorization flow
- Tokens stored securely via Capacitor SecureStorage
- Only `profile:read` scope needed (no data access)

## Related Files

- `src/app/core/services/tidepool-auth.service.ts` - OAuth authentication
- `src/app/core/config/oauth.config.ts` - OAuth configuration
- `src/app/core/utils/pkce.utils.ts` - PKCE utilities
