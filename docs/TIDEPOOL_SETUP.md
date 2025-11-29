# Tidepool Integration Setup Guide

This guide explains how to configure Diabetactic to connect with Tidepool for glucose data synchronization.

## Overview

Diabetactic integrates with Tidepool using OAuth2 Authorization Code Flow with PKCE (Proof Key for Code Exchange). This allows users to securely authenticate with their Tidepool accounts and access their glucose data.

## Prerequisites

- A Tidepool account (create one at https://app.tidepool.org)
- Access to Tidepool Developer Portal (for production client ID)

## How It Works

1. **User taps "Connect to Tidepool"** in the app
2. **App opens Tidepool login page** in an in-app browser
3. **User logs in** with their Tidepool credentials
4. **Tidepool redirects back** to the app with an authorization code
5. **App exchanges code for tokens** (access token, refresh token)
6. **App can now fetch glucose data** using the access token

## Configuration

### Environment Variables

The Tidepool configuration is in `src/environments/environment.ts`:

```typescript
tidepool: {
  // Tidepool API endpoints
  baseUrl: 'https://api.tidepool.org',
  authUrl: 'https://api.tidepool.org/auth',
  dataUrl: 'https://api.tidepool.org/data',

  // OAuth2 Configuration
  clientId: 'diabetactic-mobile-dev',  // Your registered client ID
  redirectUri: 'diabetactic://oauth/callback',
  scopes: 'data:read data:write profile:read',
}
```

### Getting a Client ID

#### For Development/Testing

For development, you can use the demo/sandbox client ID or create one:

1. Visit [Tidepool Developer Portal](https://developer.tidepool.org)
2. Sign in with your Tidepool account
3. Go to "Applications" or "OAuth Apps"
4. Click "Create New Application"
5. Fill in:
   - **Application Name**: Diabetactic (Dev)
   - **Redirect URI**: `diabetactic://oauth/callback`
   - **Scopes**: `data:read data:write profile:read`
6. Copy the generated **Client ID**
7. Update `environment.ts` with your client ID

#### For Production

For production releases:

1. Apply for production API access at Tidepool
2. Submit app information for review
3. Once approved, you'll receive a production client ID
4. Update `environment.prod.ts` with the production client ID

### Redirect URI Setup

The redirect URI must be registered with both Tidepool and your mobile app:

#### Capacitor (iOS/Android)

The custom URL scheme `diabetactic://` is configured in:

**iOS** (`ios/App/App/Info.plist`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.diabetactic.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>diabetactic</string>
    </array>
  </dict>
</array>
```

**Android** (`android/app/src/main/AndroidManifest.xml`):

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="diabetactic" android:host="oauth" android:path="/callback" />
</intent-filter>
```

## Testing the Integration

### Using Mock Mode (No Real Tidepool Account)

For development without a real Tidepool connection:

```typescript
// In environment.ts
const DEV_BACKEND_MODE: BackendMode = 'mock';
```

This uses `TidepoolMockAdapter` which provides:

- Simulated authentication
- Demo glucose readings
- Instant responses

### Testing with Real Tidepool Account

1. Set backend mode to cloud:

   ```typescript
   const DEV_BACKEND_MODE: BackendMode = 'cloud';
   ```

2. Build and run on a real device (OAuth redirect doesn't work in web browser)

3. Tap "Connect to Tidepool" and log in

4. After successful login, you should see your glucose data

### Debugging OAuth Flow

Enable debug logging in the auth service:

```typescript
// In tidepool-auth.service.ts
private readonly enableDebugLogging = true;
```

Check console for:

- Authorization URL being generated
- PKCE challenge/verifier
- Token exchange requests
- Error responses

## Security Notes

### Token Storage

Tokens are stored using platform-native secure storage:

- **iOS**: Keychain
- **Android**: Android KeyStore

This is handled by `@aparajita/capacitor-secure-storage` in `ProfileService`.

### Token Refresh

- Access tokens expire after a set time (usually 1 hour)
- The app automatically refreshes tokens using the refresh token
- If refresh fails, the user must re-authenticate

### PKCE Protection

PKCE prevents authorization code interception attacks:

- Code verifier: Random 43-128 character string
- Code challenge: SHA-256 hash of verifier (base64url encoded)
- Server verifies the code challenge matches the verifier

## Troubleshooting

### "OAuth redirect only works on mobile"

The OAuth flow uses a custom URL scheme (`diabetactic://`) which only works on native mobile apps. For web testing, use mock mode.

### "Invalid client_id"

Your client ID is not registered with Tidepool. Check:

1. Client ID in environment matches what's registered
2. Redirect URI matches exactly (including protocol and path)

### "Token exchange failed"

Common causes:

- Network connectivity issues
- Expired authorization code (codes are single-use and expire quickly)
- Mismatched PKCE verifier

### "Session expired. Please log in again."

The refresh token has expired or been revoked. The user needs to:

1. Tap "Disconnect from Tidepool"
2. Tap "Connect to Tidepool" to re-authenticate

## API Endpoints Used

| Endpoint                 | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `POST /auth/oauth/token` | Exchange code for tokens, refresh tokens |
| `GET /data/{userId}`     | Fetch glucose readings                   |
| `GET /metadata/{userId}` | Get user profile                         |
| `POST /data/{userId}`    | Upload glucose data                      |

## Related Files

- `src/app/core/services/tidepool-auth.service.ts` - OAuth authentication
- `src/app/core/services/tidepool-mock.adapter.ts` - Mock for development
- `src/app/core/services/token-storage.service.ts` - Secure token storage
- `src/app/core/services/profile.service.ts` - Profile with Tidepool connection
- `src/app/core/config/oauth.config.ts` - OAuth configuration
- `src/app/core/utils/pkce.utils.ts` - PKCE utilities
