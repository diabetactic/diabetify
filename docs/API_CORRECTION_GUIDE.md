# API Correction Guide

Use this guide to fix the `api-gateway.service.ts` file.

## 1. Remove Legacy Endpoints

**Target:** `src/app/core/services/api-gateway.service.ts`

**Action:** Delete the following blocks from `API_ENDPOINTS`:

```typescript
  // DELETE THIS BLOCK
  [
    'glucoserver.readings.list',
    {
      service: ExternalService.GLUCOSERVER,
      path: '/v1/readings',
      // ...
    },
  ],
  // DELETE THIS BLOCK
  [
    'glucoserver.readings.create',
    {
      // ... path: '/v1/readings' ...
    },
  ],
```

**Reasoning:**
The backend `glucoserver` exposes `/readings` (relative to itself), but the `api-gateway` (on port 8000) mounts it at `/glucose`.
Therefore, the correct path is `/glucose/mine` (or `/glucose/readings` depending on controller).
The `extservices.glucose.mine` key correctly maps to `/glucose/mine`.

## 2. Verify Active Endpoints

Ensure these keys exist and matches the schema:

| Key                             | Path                 | Method | Notes                |
| :------------------------------ | :------------------- | :----- | :------------------- |
| `extservices.glucose.mine`      | `/glucose/mine`      | GET    | List user readings   |
| `extservices.glucose.create`    | `/glucose/create`    | POST   | Create reading       |
| `extservices.appointments.mine` | `/appointments/mine` | GET    | List appointments    |
| `auth.token`                    | `/token`             | POST   | Login (Form Encoded) |

## 3. Postman Fixes

**Target:** `postman/diabetactic.postman_collection.json`

**Action:** Find & Replace

- `8004` -> `8000`
- `application/json` (in Auth body) -> `application/x-www-form-urlencoded`

**Example Auth Body Update:**

```json
"body": {
  "mode": "urlencoded",
  "urlencoded": [
    { "key": "username", "value": "12345678A", "type": "text" },
    { "key": "password", "value": "password", "type": "text" }
  ]
}
```
