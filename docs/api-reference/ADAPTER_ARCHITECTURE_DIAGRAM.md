# API Gateway Adapter - Architecture Diagram

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       DIABETACTIC MOBILE APP                      │
│                                                                    │
│  ┌────────────────────┐        ┌──────────────────────┐         │
│  │  Login Component   │        │  Profile Component   │         │
│  │                    │        │                      │         │
│  │  - username input  │        │  - user details      │         │
│  │  - password input  │        │  - update profile    │         │
│  │  - submit button   │        │  - preferences       │         │
│  └─────────┬──────────┘        └──────────┬───────────┘         │
│            │                               │                      │
│            └───────────┬───────────────────┘                      │
│                        │                                          │
│                        ▼                                          │
│            ┌───────────────────────┐                             │
│            │  LocalAuthService     │                             │
│            │                       │                             │
│            │  - login()            │                             │
│            │  - logout()           │                             │
│            │  - getAccessToken()   │                             │
│            │  - refreshToken()     │                             │
│            └───────────┬───────────┘                             │
│                        │                                          │
│                        ▼                                          │
│   ┌────────────────────────────────────────────────────┐        │
│   │      API GATEWAY ADAPTER SERVICE                    │        │
│   │                                                      │        │
│   │  ┌──────────────────────────────────────────────┐  │        │
│   │  │        PATH MAPPING LAYER                     │  │        │
│   │  │                                                │  │        │
│   │  │  /api/auth/login    →  /token                │  │        │
│   │  │  /api/auth/register →  /users/                │  │        │
│   │  │  /api/auth/profile  →  /users/me             │  │        │
│   │  │  /api/auth/refresh  →  CLIENT-SIDE           │  │        │
│   │  └──────────────────────────────────────────────┘  │        │
│   │                                                      │        │
│   │  ┌──────────────────────────────────────────────┐  │        │
│   │  │      TOKEN MANAGEMENT LAYER                   │  │        │
│   │  │                                                │  │        │
│   │  │  • Generate refresh tokens                    │  │        │
│   │  │  • Track expiration times                     │  │        │
│   │  │  • Rotate tokens (max 10 cycles)             │  │        │
│   │  │  • Secure storage (Capacitor Preferences)    │  │        │
│   │  └──────────────────────────────────────────────┘  │        │
│   │                                                      │        │
│   │  ┌──────────────────────────────────────────────┐  │        │
│   │  │      ERROR HANDLING LAYER                     │  │        │
│   │  │                                                │  │        │
│   │  │  • Standardized error codes                   │  │        │
│   │  │  • User-friendly messages                     │  │        │
│   │  │  • Detailed logging                           │  │        │
│   │  │  • Account state validation                   │  │        │
│   │  └──────────────────────────────────────────────┘  │        │
│   │                                                      │        │
│   └──────────────────┬───────────────────────────────────        │
│                      │                                            │
└──────────────────────┼────────────────────────────────────────────┘
                       │
                       │ HTTP Requests
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND API GATEWAY                           │
│                     (FastAPI - Python)                            │
│                                                                    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                  AUTH ROUTES                            │     │
│  │                                                          │     │
│  │  POST /token                                            │     │
│  │  ├─ Accept: username, password (form-encoded)          │     │
│  │  ├─ Call: /users/grantaccess (login microservice)      │     │
│  │  └─ Return: { access_token, token_type }               │     │
│  │                                                          │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                  USER ROUTES                            │     │
│  │                  Prefix: /users                         │     │
│  │                                                          │     │
│  │  GET /users/me                                          │     │
│  │  ├─ Require: Bearer token                              │     │
│  │  ├─ Extract: DNI from JWT                              │     │
│  │  ├─ Call: /users/{id} (login microservice)             │     │
│  │  └─ Return: User profile                               │     │
│  │                                                          │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Request Flow Diagrams

### Login Flow

```
┌────────────┐                                    ┌─────────────────┐
│   User     │                                    │  Mobile App     │
└──────┬─────┘                                    └────────┬────────┘
       │                                                    │
       │ 1. Enter username & password                      │
       │─────────────────────────────────────────────────>│
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │  Adapter        │
       │                                          │  .login()       │
       │                                          └────────┬────────┘
       │                                                    │
       │                                          2. POST /token
       │                                          (form-encoded)
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │  Backend        │
       │                                          │  /token         │
       │                                          └────────┬────────┘
       │                                                    │
       │                                          3. Validate creds
       │                                          Generate JWT
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │  Return token   │
       │                                          │  { access_token }│
       │                                          └────────┬────────┘
       │                                                    │
       │                                          4. GET /users/me
       │                                          (Bearer token)
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │  Backend        │
       │                                          │  /users/me      │
       │                                          └────────┬────────┘
       │                                                    │
       │                                          5. Return profile
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │  Adapter        │
       │                                          │  - Generate     │
       │                                          │    refresh_token│
       │                                          │  - Store tokens │
       │                                          │  - Map user data│
       │                                          └────────┬────────┘
       │                                                    │
       │ 6. Success! Navigate to dashboard                 │
       │<─────────────────────────────────────────────────│
       │                                                    │
```

### Token Refresh Flow (Client-Side)

```
┌────────────┐                                    ┌─────────────────┐
│   App      │                                    │  Adapter        │
└──────┬─────┘                                    └────────┬────────┘
       │                                                    │
       │ 1. Token expires in < 5 min                       │
       │────────────────────────────────────────────────>  │
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │ shouldRefresh   │
       │                                          │ Token()?        │
       │                                          │ → true          │
       │                                          └────────┬────────┘
       │                                                    │
       │ 2. refreshToken(refresh_token)                    │
       │────────────────────────────────────────────────>  │
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │ Validate:       │
       │                                          │ - Token match?  │
       │                                          │ - Rotation < 10?│
       │                                          │ - Profile exist?│
       │                                          └────────┬────────┘
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │ Generate new:   │
       │                                          │ - access_token  │
       │                                          │ - refresh_token │
       │                                          │ - expires_at    │
       │                                          └────────┬────────┘
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │ Update storage: │
       │                                          │ - New tokens    │
       │                                          │ - Rotation + 1  │
       │                                          └────────┬────────┘
       │                                                    │
       │ 3. Return new AuthResponse                        │
       │<────────────────────────────────────────────────  │
       │                                                    │
       │ 4. Continue with new token                        │
       │                                                    │
```

### Error Handling Flow

```
┌────────────┐                                    ┌─────────────────┐
│   User     │                                    │  Adapter        │
└──────┬─────┘                                    └────────┬────────┘
       │                                                    │
       │ 1. Login with wrong password                      │
       │────────────────────────────────────────────────>  │
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │ POST /token     │
       │                                          └────────┬────────┘
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │ Backend         │
       │                                          │ 401 Unauthorized│
       │                                          └────────┬────────┘
       │                                                    │
       │                                          ┌────────▼────────┐
       │                                          │ handleAuthError │
       │                                          │ - status: 401   │
       │                                          │ - code: INVALID │
       │                                          │         _CREDS  │
       │                                          └────────┬────────┘
       │                                                    │
       │ 2. Error: INVALID_CREDENTIALS                     │
       │    "Invalid username or password"                 │
       │<────────────────────────────────────────────────  │
       │                                                    │
       │ 3. Display error message                          │
       │                                                    │
```

## Component Relationships

```
┌────────────────────────────────────────────────────────────────┐
│                      MOBILE APP LAYER                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Login Page   │  │ Profile Page │  │ Dashboard    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │ LocalAuthService│                           │
│                    │                 │                           │
│                    │ Uses Adapter    │                           │
│                    └───────┬─────────┘                           │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                      ADAPTER LAYER                               │
│                            │                                     │
│              ┌─────────────▼──────────────┐                     │
│              │ ApiGatewayAdapterService    │                     │
│              │                              │                     │
│              │ ┌──────────────────────────┐│                     │
│              │ │ Path Mapper              ││                     │
│              │ └──────────────────────────┘│                     │
│              │                              │                     │
│              │ ┌──────────────────────────┐│                     │
│              │ │ Token Manager            ││                     │
│              │ │ - Generation             ││                     │
│              │ │ - Storage                ││                     │
│              │ │ - Rotation               ││                     │
│              │ └──────────────────────────┘│                     │
│              │                              │                     │
│              │ ┌──────────────────────────┐│                     │
│              │ │ Error Handler            ││                     │
│              │ │ - Code mapping           ││                     │
│              │ │ - User messages          ││                     │
│              │ └──────────────────────────┘│                     │
│              │                              │                     │
│              └─────────────┬────────────────┘                     │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ HTTP
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                      BACKEND LAYER                               │
│                            │                                     │
│              ┌─────────────▼──────────────┐                     │
│              │    API Gateway (FastAPI)    │                     │
│              │                              │                     │
│              │  /token        /users/me    │                     │
│              │                              │                     │
│              └─────────────┬────────────────┘                     │
│                            │                                     │
│                   ┌────────┴────────┐                            │
│                   │                 │                            │
│         ┌─────────▼────────┐  ┌────▼─────────┐                 │
│         │ Login Service    │  │ User Service │                 │
│         │ (Microservice)   │  │ (Microservice)│                 │
│         └──────────────────┘  └──────────────┘                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Token Storage Structure

```
┌────────────────────────────────────────────────────────────────┐
│               CAPACITOR PREFERENCES (SECURE)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Key: adapter_access_token                                 │  │
│  │ Value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."         │  │
│  │ Type: JWT (Backend-generated)                             │  │
│  │ Lifetime: 30 minutes                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Key: adapter_refresh_token                                │  │
│  │ Value: "a1b2c3d4e5f6..."                                  │  │
│  │ Type: Random 64-char hex (Client-generated)               │  │
│  │ Lifetime: Until rotation or logout                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Key: adapter_token_expires_at                             │  │
│  │ Value: "1704644400000"                                    │  │
│  │ Type: Unix timestamp (milliseconds)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Key: adapter_user_profile                                 │  │
│  │ Value: {"id":"12345","email":"...","firstName":"..."}     │  │
│  │ Type: JSON string                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Key: adapter_rotation_count                               │  │
│  │ Value: "3"                                                │  │
│  │ Type: Number (0-10)                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ LAYER 1: Transport Security                              │  │
│  │ - HTTPS in production                                    │  │
│  │ - TLS 1.3                                                │  │
│  │ - Certificate pinning (optional)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ LAYER 2: Authentication                                   │  │
│  │ - JWT tokens (backend-signed)                            │  │
│  │ - 30-minute token lifetime                               │  │
│  │ - Secure password hashing (bcrypt)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ LAYER 3: Token Management                                │  │
│  │ - Token rotation (max 10 cycles)                         │  │
│  │ - Client-side refresh simulation                         │  │
│  │ - Expiration tracking                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ LAYER 4: Secure Storage                                  │  │
│  │ - Capacitor Preferences (encrypted on native)            │  │
│  │ - Keychain (iOS) / KeyStore (Android)                    │  │
│  │ - No web storage for sensitive data                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ LAYER 5: Account State                                   │  │
│  │ - Pending validation                                     │  │
│  │ - Disabled account blocking                              │  │
│  │ - Active status checking                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## Conclusion

This architecture provides:
- ✅ **Separation of Concerns**: Clean layer separation
- ✅ **Path Abstraction**: App independent of backend paths
- ✅ **Token Security**: Secure storage and rotation
- ✅ **Error Resilience**: Comprehensive error handling
- ✅ **Maintainability**: Easy to update when backend changes
- ✅ **Testability**: Each layer can be tested independently
- ✅ **Performance**: Minimal overhead, efficient caching
