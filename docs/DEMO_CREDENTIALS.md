# 🔐 Demo Credentials

## Quick Access

Use these credentials to login to the standalone demo mode:

### Primary Login
```
Email: demo@diabetactic.com
Password: demo123
```

### Alternative Login (DNI-based)
```
DNI: 1000
Password: demo123
```

## What You'll Get

After login, you'll have access to:

- ✅ **30 days** of glucose readings (4-6 per day)
- ✅ **3 upcoming** appointments
- ✅ **2 completed** past appointments
- ✅ **Complete** user profile
- ✅ **All features** fully functional
- ✅ **Data persists** across reloads

## Quick Start

```bash
npm start
```

Then login with the credentials above.

## Features Working in Demo Mode

- 📊 View glucose readings and statistics
- ➕ Add new manual readings
- ✏️ Edit existing readings
- 🗑️ Delete readings
- 📅 Book appointments
- 🔄 Sync data (simulated)
- 👤 Update profile
- 📈 View trends and analytics

## Reset Demo Data

If you need to reset to defaults:

```javascript
// In browser console
localStorage.clear();
location.reload();
```

## For More Details

See: `docs/STANDALONE_MODE_GUIDE.md`
