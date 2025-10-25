# Diabetify

An Ionic Angular mobile application for managing diabetes glucose readings with Tidepool integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm start

# Open in browser at http://localhost:4200
```

## 📋 Table of Contents

- [Technology Stack](#technology-stack)
- [Available Scripts](#available-scripts)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Capacitor Commands](#capacitor-commands)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## 🛠 Technology Stack

- **Framework**: Ionic 8 + Angular 18
- **Mobile Platform**: Capacitor 6.1.0
- **Language**: TypeScript 5.4
- **Testing**: Jasmine + Karma
- **Code Quality**: ESLint + Prettier + Husky

## 📜 Available Scripts

### Development

```bash
npm start              # Start dev server (alias: npm run dev)
npm run dev            # Start dev server with hot reload
npm run watch          # Build with watch mode
```

### Building

```bash
npm run build          # Development build
npm run build:prod     # Production build (optimized)
```

### Testing

```bash
npm test               # Run tests in watch mode
npm run test:watch     # Run tests with watch mode
npm run test:ci        # Run tests once with coverage (for CI)
npm run test:headless  # Run tests in headless Chrome
npm run test:coverage  # Run tests with coverage report
```

### Code Quality

```bash
npm run lint           # Run ESLint
npm run lint:fix       # Run ESLint with auto-fix
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
```

### Capacitor (Mobile)

```bash
npm run cap:sync       # Sync web assets with native platforms
npm run cap:android    # Open Android project in Android Studio
npm run cap:run:android # Build and run on Android device/emulator
npm run cap:copy       # Copy web assets to platforms
npm run cap:update     # Update Capacitor dependencies
```

### Maintenance

```bash
npm run clean          # Clean and reinstall dependencies
npm run update:deps    # Update all dependencies
```

## 🔄 Development Workflow

### 1. Setup

```bash
# Clone the repository
git clone <repository-url>
cd diabetify

# Install dependencies
npm install

# Start development server
npm start
```

### 2. Making Changes

- Code is automatically formatted on commit via Husky pre-commit hooks
- ESLint runs automatically to catch errors
- Make sure tests pass before committing

### 3. Pre-commit Hooks

The project uses Husky + lint-staged to automatically:

- Format code with Prettier
- Fix linting issues with ESLint
- Run on staged files only (fast!)

```bash
# Pre-commit hook runs automatically on git commit
git add .
git commit -m "Your message"  # Formatting & linting happen here
```

### 4. Claude Code Integration

This project is optimized for Claude Code with:

- **Allowed Tools**: Pre-approved npm, git, ionic, ng, and cap commands
- **Tool Permissions**: Configured in `.claude/settings.local.json`
- **Task Management**: Integrated with Task Master AI

## 🧪 Testing

### Running Tests

```bash
# Watch mode (development)
npm test

# Single run (CI)
npm run test:ci

# With coverage report
npm run test:coverage
```

### Test Configuration

- **Framework**: Jasmine + Karma
- **Browsers**: Chrome (dev), ChromeHeadless (CI)
- **Coverage**: HTML + Text + LCOV reports
- **Thresholds**: 50% coverage for statements, branches, functions, lines

### Coverage Reports

After running tests with coverage, open:

```
coverage/diabetify/index.html
```

## ✨ Code Quality

### ESLint

Configuration: `.eslintrc.json`

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Prettier

Configuration: `.prettierrc.json`

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks (Husky)

Automatically runs on `git commit`:

1. **TypeScript/JavaScript files**: Prettier → ESLint
2. **HTML files**: Prettier
3. **JSON/SCSS/Markdown**: Prettier

Configuration: `.husky/pre-commit` + `package.json` (lint-staged section)

## 📱 Capacitor Commands

### Android Development

```bash
# Sync assets and open Android Studio
npm run cap:sync
npm run cap:android

# Or run directly
npm run cap:run:android
```

### Requirements

- **Android Studio**: For Android development
- **Java 17**: Required for Android builds
- **Node.js 20+**: For Capacitor

### Platform Setup

```bash
# Add Android platform
npx cap add android

# Sync after making changes
npm run cap:sync
```

## 📁 Project Structure

```
diabetify/
├── .claude/                 # Claude Code configuration
│   └── settings.local.json  # Tool permissions & hooks
├── .husky/                  # Git hooks
│   └── pre-commit          # Pre-commit hook script
├── .taskmaster/            # Task Master AI configuration
├── src/
│   ├── app/
│   │   ├── dashboard/      # Dashboard feature
│   │   ├── devices/        # Device management
│   │   ├── readings/       # Glucose readings history
│   │   ├── profile/        # User profile
│   │   └── tabs/          # Tab navigation
│   ├── assets/            # Static assets
│   ├── environments/      # Environment configs
│   └── theme/            # Global styles
├── android/              # Android native project
├── www/                  # Build output
├── .prettierrc.json     # Prettier configuration
├── .prettierignore      # Prettier ignore patterns
├── karma.conf.js        # Karma test configuration
├── package.json         # Dependencies & scripts
└── tsconfig.json        # TypeScript configuration
```

## 🎯 Application Architecture

### Tab-Based Navigation

- **Dashboard** (`/tabs/dashboard`): Home view
- **Readings** (`/tabs/readings`): Glucose history
- **Devices** (`/tabs/devices`): Device management (future Tidepool integration)
- **Profile** (`/tabs/profile`): User settings

### Lazy Loading

All feature modules are lazy-loaded for optimal performance.

## 🤝 Contributing

### Workflow

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Commit (pre-commit hooks will run automatically)
5. Push and create a Pull Request

### Code Style

- **TypeScript**: Follow Angular style guide
- **Formatting**: Prettier (runs on commit)
- **Linting**: ESLint (runs on commit)
- **Commits**: Conventional Commits format recommended

### Testing

- Write tests for new features
- Maintain coverage above 50%
- Ensure all tests pass before PR

## 🐛 Troubleshooting

### Common Issues

**Tests failing in CI but passing locally?**

```bash
npm run test:ci
```

**Formatting issues?**

```bash
npm run format
```

**Build errors after pulling?**

```bash
npm run clean
npm install
```

**Android build issues?**

```bash
npm run cap:sync
npm run cap:update
```

### Getting Help

- Check CLAUDE.md for project-specific documentation
- Check `.taskmaster/` for task management details
- Review test logs in `coverage/` directory

## 📝 License

[Add your license here]

## 👥 Team

[Add team information here]
