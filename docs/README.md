# Diabetactic Documentation

Comprehensive documentation for the Diabetactic mobile health application.

## 📚 Documentation Index

### Getting Started
- **[Main README](../README.md)** - Project overview, quick start, and basic commands
- **[CLAUDE.md](../CLAUDE.md)** - AI agent development guide and MCP server reference
- **[Demo Credentials](./DEMO_CREDENTIALS.md)** - Test accounts and API credentials

### Architecture
- **[Architecture Overview](./architecture/ARCHITECTURE.md)** - System architecture, patterns, and design decisions
- **[External Services](./api-reference/EXTERNAL_SERVICES.md)** - Backend microservices architecture

### Development Guides
- **[Testing Guide](./testing/TESTING_GUIDE.md)** - Comprehensive testing strategies (unit, E2E, mobile)
- **[Translation Guide](./development/TRANSLATION_GUIDE.md)** - i18n implementation and workflow

### API Reference
- **[Tidepool API](./api-reference/TIDEPOOL_API_REFERENCE.md)** - Tidepool integration documentation
- **[Readings Reference](./api-reference/READINGS_REFERENCE.md)** - Glucose readings data model
- **[External Services](./api-reference/EXTERNAL_SERVICES.md)** - Backend microservices API

### Agent Development (Advanced)
- **[Agent Reference](./agent-reference/DIABETIFY_AGENT_REFERENCE.md)** - Claude agent types and workflows
- **[Claude-Flow Guide](./agent-reference/CLAUDE_FLOW_DIABETIFY_GUIDE.md)** - Multi-agent orchestration
- **[SPARC Methodology](./agent-reference/SPARC_ANALYSIS_HEALTHCARE.md)** - Healthcare-focused development methodology

## 🚀 Quick Links

### For Developers
- [Quick Start](../README.md#quick-start)
- [Available Commands](../README.md#available-scripts)
- [Testing Strategy](./testing/TESTING_GUIDE.md)
- [Code Quality](../README.md#code-quality)

### For AI Agents
- [CLAUDE.md Development Rules](../CLAUDE.md)
- [MCP Server Reference](../CLAUDE.md#development-mcp-servers)
- [Agent Orchestration](./agent-reference/CLAUDE_FLOW_DIABETIFY_GUIDE.md)
- [SPARC Workflow](./agent-reference/SPARC_ANALYSIS_HEALTHCARE.md)

### API Integration
- [Tidepool OAuth Integration](./api-reference/TIDEPOOL_API_REFERENCE.md)
- [Backend Services](./api-reference/EXTERNAL_SERVICES.md)
- [Data Models](./api-reference/READINGS_REFERENCE.md)

## 📱 Project Structure

```
diabetactic/
├── src/app/
│   ├── core/          # Services, guards, interceptors
│   ├── shared/        # Reusable components
│   ├── dashboard/     # Main dashboard
│   ├── readings/      # Glucose readings
│   ├── appointments/  # Tele-appointments
│   └── profile/       # User profile
├── docs/              # This documentation
├── playwright/tests/  # E2E tests
├── specs/            # Feature specifications
└── CLAUDE.md         # AI development guide
```

## 🧪 Testing Documentation

- **[Testing Guide](./testing/TESTING_GUIDE.md)** - Complete testing reference
  - Unit testing with Jasmine/Karma
  - E2E testing with Playwright
  - Mobile testing strategies
  - Test isolation and performance

## 🌐 Translation & i18n

- **[Translation Guide](./development/TRANSLATION_GUIDE.md)** - Multi-language support
  - Adding new translations
  - Language detection
  - Testing translations
  - Missing translation detection

## 🏗️ Architecture & Design

- **[Architecture Overview](./architecture/ARCHITECTURE.md)** - System design
  - API Gateway pattern
  - Service architecture
  - Data flow
  - Offline-first strategy

## 🤖 AI Agent Development

For AI-powered development workflows:

1. **Start here**: [CLAUDE.md](../CLAUDE.md)
2. **Agent types**: [Agent Reference](./agent-reference/DIABETIFY_AGENT_REFERENCE.md)
3. **Orchestration**: [Claude-Flow Guide](./agent-reference/CLAUDE_FLOW_DIABETIFY_GUIDE.md)
4. **Methodology**: [SPARC Analysis](./agent-reference/SPARC_ANALYSIS_HEALTHCARE.md)

## 📞 Support

For issues and questions:
- Check the [Testing Guide](./testing/TESTING_GUIDE.md) for test failures
- Review [CLAUDE.md](../CLAUDE.md) troubleshooting section
- See [Architecture docs](./architecture/ARCHITECTURE.md) for design decisions

## 📄 License

This project is proprietary software for healthcare use.
