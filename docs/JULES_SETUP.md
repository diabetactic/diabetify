# Jules Environment Setup Guide

This document explains how to configure Jules (Google AI Agent) for the Diabetactic project.

## Quick Start

1. Visit https://jules.google.com
2. Sign in with Google account
3. Connect GitHub account
4. Select `diabetactic` repository
5. Choose branch (default: `master`)
6. Configure environment (see below)

## Environment Configuration

### Option 1: Auto-Detection (Recommended)

Jules automatically detects the project setup by reading:
- `AGENTS.md` (in repo root) ✅ Already configured
- `package.json` for Node.js projects ✅ Present
- `README.md` for general guidance ✅ Available

**No additional setup needed!** Jules will:
1. Detect Node.js 20.x requirement
2. Run `npm install` automatically
3. Understand Angular/Ionic stack from AGENTS.md

### Option 2: Custom Setup Script

If you need more control, add a setup script in the Jules web UI:

```bash
#!/bin/bash
# Jules environment setup for Diabetactic

echo "🚀 Setting up Diabetactic for Jules..."

# Install dependencies
npm install

# Verify setup
npm run test:ci

echo "✅ Diabetactic ready for development!"
```

### Option 3: Environment Snapshot (Fastest)

For complex projects, create a snapshot:

1. Click "Run and Snapshot" in Jules UI
2. Jules runs setup script once
3. Snapshot saved for future tasks
4. Future tasks start instantly from snapshot

## Environment Variables

Configure in Jules web UI under "Environment Variables":

```env
TIDEPOOL_API_URL=https://api.tidepool.org
TIDEPOOL_CLIENT_ID=your-client-id-here
NODE_ENV=development
JULES_ENV=true
```

**Note**: For security, add sensitive keys via Jules UI, not in code.

## Pre-installed Tools in Jules

Jules VMs come with these tools pre-installed:

### Python
- uv 0.7.13
- black 25.1.0
- mypy 1.16.1
- pytest 8.4.0
- ruff 0.12.0
- pyenv (multiple versions)

### Node.js ✅ (What we use)
- node v18.20.8, v20.19.2, v22.16.0 ✅
- nvm (node version manager)
- npm 11.4.2 ✅
- yarn 1.22.22
- pnpm 10.12.1
- eslint v9.29.0 ✅
- prettier 3.5.3 ✅
- chromedriver 137.0.7151.70 ✅ (for E2E tests)

## Verification

After Jules sets up the environment, verify with:

```bash
# Check Node.js version
node -v  # Should be 20.x or 22.x

# Check npm
npm -v

# Verify Angular CLI
npx ng version

# Run tests
npm run test:ci
```

## Common Tasks for Jules

### Bug Fixes
```
"Fix the authentication timeout issue in TidepoolAuthService"
```

### Feature Development
```
"Add a glucose trend indicator to the dashboard page using Tailwind v4"
```

### Testing
```
"Add unit tests for the ReadingsService, covering all methods"
```

### Documentation
```
"Add JSDoc comments to all public methods in DatabaseService"
```

### Code Review
```
"Review the latest changes in src/app/profile and suggest improvements"
```

### Translation
```
"Add Spanish translations for the new appointment feature"
```

## File Selection

Use Jules' file selector to target specific files:

- **Single file**: `src/app/core/services/tidepool-auth.service.ts`
- **Multiple files**: Select via UI checkboxes
- **Directory**: `src/app/appointments/`

## Memory System

Jules remembers your preferences across tasks:

- **Code style**: "Always use Tailwind v4, not Angular Material"
- **Testing**: "Include both unit and E2E tests"
- **Translations**: "Always add both English and Spanish"
- **Formatting**: "Use Prettier with our config"

Set preferences once, Jules applies them to all future tasks.

## Notifications

Enable browser notifications to know when Jules completes tasks:

1. Allow notifications when prompted
2. Or: Settings → Notifications → Enable
3. Get notified when:
   - Task completes
   - Needs your input
   - Encounters errors

## Best Practices

### 1. Clear, Specific Prompts
✅ Good:
```
"Migrate the settings page from Angular Material to Tailwind v4,
following the pattern used in the dashboard page"
```

❌ Too vague:
```
"Update the UI"
```

### 2. Reference Examples
```
"Add a glucose chart component similar to the readings chart,
but showing trends over the last 7 days"
```

### 3. Specify Test Requirements
```
"Fix the bug in appointments sync AND add tests to prevent regression"
```

### 4. Mention Mobile Considerations
```
"Add swipe gesture support for deleting readings (mobile-friendly)"
```

## Limitations

### What Jules Can Do
- ✅ Read, write, and modify code
- ✅ Run tests and linting
- ✅ Understand AGENTS.md context
- ✅ Work asynchronously in background
- ✅ Create PRs for review

### What Jules Cannot Do
- ❌ Build mobile apps (no Android SDK/Xcode)
- ❌ Run `npm run cap:sync` (needs mobile SDK)
- ❌ Test on real devices
- ❌ Access local files outside repo
- ❌ Install system packages beyond pre-installed

**Solution**: For mobile tasks, Jules can prepare code, then note in PR:
```
"Note: Run 'npm run cap:sync' locally and test on devices"
```

## Debugging Jules Tasks

### If Setup Fails

1. **Check setup script output** in Jules UI logs
2. **Verify Node version**: Must be 20.x or 22.x
3. **Check package.json**: Ensure no platform-specific scripts
4. **Review AGENTS.md**: Make sure it's up to date

### If Tests Fail

```bash
# Jules runs this automatically:
npm run test:ci

# If failing, check:
- karma.conf.js (headless Chrome config)
- Test files for async issues
- Dependencies installed correctly
```

### If Build Fails

```bash
# Jules may try to build
npm run build

# Common issues:
- Missing environment variables
- TypeScript errors
- Missing dependencies
```

## Integration with Claude Code

You can start with Jules, then continue locally:

1. **Jules**: Create initial implementation
2. **Jules**: Push to branch, create PR
3. **Local**: Pull branch
4. **Claude Code**: Continue development
5. **Local**: Test on mobile devices

## Example Workflow

### Task: Migrate Profile Page to Tailwind v4

**Prompt to Jules**:
```
Please migrate the profile page to Tailwind v4 following these requirements:

1. Replace all Angular Material components with Tailwind classes
2. Follow the pattern used in the dashboard page (see src/app/dashboard)
3. Maintain dark mode support
4. Keep the same functionality and layout
5. Update both component.ts and component.html files
6. Ensure all tests still pass
7. Add Spanish translations if needed

Reference files:
- src/app/dashboard/dashboard.component.html (for Tailwind patterns)
- src/app/profile/profile.component.ts
- src/app/profile/profile.component.html
```

**Jules will**:
1. Read AGENTS.md for project context
2. Study dashboard page Tailwind patterns
3. Migrate profile page
4. Run tests
5. Create PR for review

**You review**:
1. Check PR on GitHub
2. Test locally if needed
3. Merge when satisfied

## Resources

- **Jules Documentation**: https://jules.google/docs/
- **Jules Awesome Prompts**: https://github.com/google-labs-code/jules-awesome-list
- **Jules Status**: https://julesstatus.statuspage.io/
- **AGENTS.md Spec**: https://agents.md/

## Quick Reference

| Action | Command/Prompt |
|--------|----------------|
| Setup snapshot | Click "Run and Snapshot" in UI |
| Set env vars | Jules UI → Environment Variables |
| Target files | Use file selector in UI |
| Review plan | Always review before approving |
| Check status | View task progress in UI |
| Get notified | Enable browser notifications |
| Create PR | Automatic after task completion |

## Support

If Jules encounters issues:

1. **Check status page**: https://julesstatus.statuspage.io/
2. **Review logs**: In Jules UI task output
3. **Verify setup**: AGENTS.md is correct
4. **Ask Jules**: "What went wrong?" for diagnostics

## Configuration Summary

✅ **Already Configured**:
- AGENTS.md in repo root
- package.json with all dependencies
- Web-compatible test setup (Karma headless)
- Pre-commit hooks (Husky)
- TypeScript configuration
- Linting and formatting rules

🎯 **Jules will auto-detect**:
- Node.js 20.x requirement
- Angular/Ionic framework
- npm as package manager
- Test and lint commands
- Build process

⚡ **Optional optimizations**:
- Add custom setup script for faster runs
- Create environment snapshot for instant start
- Configure environment variables in UI
- Set preferences in Jules memory

---

**Last Updated**: 2025-11-11
**Diabetactic Version**: Angular 20 + Ionic 8 + Capacitor 6
