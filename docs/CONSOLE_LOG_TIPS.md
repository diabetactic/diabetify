# Console Log Management Tips

## Browser DevTools Features

### 1. Filter Messages

- **Filter by level**: Click "Errors", "Warnings", "Info", "Verbose" buttons
- **Text filter**: Use the filter box to search (e.g., type "Backend" to see only backend logs)
- **Regex**: Use `/pattern/` for advanced filtering

### 2. Copy Relevant Bits

- **Right-click** on a log message → "Copy message"
- **Right-click** on an object → "Copy object" (copies as JSON)
- **Store as global variable**: Right-click → "Store as global variable" → use in console

### 3. Group Filtering (We Use This!)

Our app uses `console.group()` for the backend config:

```
🚀 App Configuration
  Backend Mode: MOCK
  ...
```

- Click the arrow to collapse/expand groups
- Only shows what you need

### 4. Preserve Log

- Check "Preserve log" to keep logs across page refreshes
- Useful for debugging navigation issues

### 5. Custom Levels

```javascript
// Filter by custom tags in our app
[INFO] [Init] AppComponent initialized     // Filter: "[Init]"
[INFO] [Config] Backend configuration      // Filter: "[Config]"
```

## VS Code Extensions

### 1. **Debugger for Chrome** (or Edge)

```bash
code --install-extension msjsdiag.debugger-for-chrome
```

- Set breakpoints in VS Code
- See console logs in Debug Console
- Inspect variables inline

### 2. **Angular Language Service**

Already installed - provides IntelliSense

### 3. **Console Ninja** (Premium, but has free tier)

- Shows console.log() output directly in VS Code
- No need to switch to browser

## CLI Tools

### 1. **Angular CLI with Source Maps**

Already enabled - click console errors to jump to TypeScript source

### 2. **Custom Log Service** (We Have This!)

```typescript
// src/app/core/services/logger.service.ts
this.logger.info('Config', 'Backend configuration', { mode, url });
```

- Filter by category: "Config", "Init", "Auth", etc.
- Structured logging with context

### 3. **Chrome Remote Debugging** (for Mobile)

```bash
# Debug Android app
chrome://inspect
# Shows mobile device console in desktop Chrome
```

## Quick Tips

### Copy Only Stack Trace Line You Need

1. Click the error in console
2. Right-click specific line in stack trace
3. "Copy stack trace" or just copy the file:line reference

### Custom Console Filters

In Chrome DevTools console settings (gear icon):

- Hide network messages
- Hide extension messages
- Group similar messages

### Save Console Output

```javascript
// In browser console
copy(console.save()); // Copies all logs to clipboard
```

## Our App's Log Structure

```
🚀 App Configuration          // Group - easy to collapse
  Backend Mode: MOCK          // Styled with %c
  API Gateway: /api
  Production: false

[INFO] [Config] Backend configuration {"mode":"mock",...}  // Structured
```

**Filter by**:

- `Backend` - see only backend-related logs
- `[Config]` - configuration logs
- `[Init]` - initialization logs
- `[Auth]` - authentication logs
