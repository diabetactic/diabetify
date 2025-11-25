# 🤖 Diabetactic Agent Reference Guide

## Comprehensive Guide to 65+ Claude-Flow Agents for Healthcare App Development

This reference guide catalogs all available agents with a focus on Angular/TypeScript/Ionic development for the Diabetactic healthcare application.

---

## 📊 Quick Reference: Agents by Diabetactic Use Case

| **Use Case** | **Primary Agents** | **Supporting Agents** |
|--------------|-------------------|----------------------|
| **Feature Development** | `coder`, `mobile-dev`, `backend-dev` | `planner`, `researcher`, `api-docs` |
| **Code Review** | `reviewer`, `code-analyzer` | `security-analyzer`, `code-review-swarm` |
| **Testing** | `tester`, `unit-test-specialist` | `integration-tester`, `e2e-automation` |
| **Architecture** | `system-architect`, `architecture` | `sparc-coordinator`, `refactoring-specialist` |
| **DevOps** | `cicd-engineer`, `deployment-coordinator` | `infrastructure-specialist`, `monitoring-specialist` |
| **Performance** | `perf-analyzer`, `performance-benchmarker` | `code-analyzer`, `refactoring-specialist` |
| **GitHub Workflows** | `pr-manager`, `workflow-automation` | `release-manager`, `issue-tracker` |
| **Multi-Agent Tasks** | `hierarchical-coordinator`, `task-orchestrator` | `mesh-coordinator`, `adaptive-coordinator` |

---

## 🎯 Priority Agents for Diabetactic Development

### Top 10 Most Useful Agents

1. **`coder`** - TypeScript/Angular implementation
2. **`mobile-dev`** - Ionic/Capacitor mobile features
3. **`tester`** - Jasmine/Karma unit tests
4. **`reviewer`** - Code quality & security
5. **`backend-dev`** - API integration & services
6. **`system-architect`** - Service orchestration design
7. **`api-docs`** - OpenAPI documentation
8. **`e2e-automation`** - Playwright integration tests
9. **`pr-manager`** - GitHub PR automation
10. **`sparc-coordinator`** - SPARC TDD workflows

---

## 📁 Category 1: Core Development Agents (5 agents)

### 🔧 `coder` - Implementation Specialist

**PRIMARY USE**: Angular components, TypeScript services, Ionic pages

**Key Capabilities**:
- TypeScript/JavaScript code generation
- Angular component creation (standalone + module-based)
- Ionic UI implementation
- RxJS observable patterns
- API integration with HttpClient
- Dexie/IndexedDB operations

**Diabetactic Examples**:
```bash
# Create new glucose reading component
Task("Frontend Coder", "Create standalone Angular component for manual glucose entry with form validation. Use Ionic form components, reactive forms, and GlucoseReading model. Include unit tests.", "coder")

# Implement service orchestration pattern
Task("Service Developer", "Refactor appointment booking to use ServiceOrchestrator saga pattern. Add compensating transactions for rollback and retry logic with exponential backoff.", "coder")

# Add Capacitor plugin integration
Task("Mobile Integration", "Integrate Capacitor Camera plugin for profile photo upload. Add Android permissions, platform detection, and error handling.", "coder")
```

**Best For**:
- New feature implementation
- Service layer development
- Component refactoring
- Bug fixes
- API integration

---

### 👀 `reviewer` - Quality Assurance

**PRIMARY USE**: Code reviews, security audits, best practices enforcement

**Key Capabilities**:
- TypeScript strict mode compliance
- Angular best practices validation
- Security vulnerability detection (XSS, injection attacks)
- RxJS anti-pattern detection
- Performance optimization recommendations
- Accessibility (a11y) review

**Diabetactic Examples**:
```bash
# Review authentication flow
Task("Security Reviewer", "Review UnifiedAuthService for security vulnerabilities. Check token storage, refresh logic, XSS prevention, and PKCE implementation. Verify HIPAA compliance patterns.", "reviewer")

# Code quality audit
Task("Quality Auditor", "Analyze ReadingsService for anti-patterns: memory leaks, unsubscribed observables, N+1 queries, and sync status handling. Recommend refactoring.", "reviewer")

# Accessibility review
Task("A11y Specialist", "Review appointments UI for WCAG 2.1 AA compliance. Check ARIA labels, keyboard navigation, color contrast, and screen reader support.", "reviewer")
```

**Best For**:
- Pre-merge code reviews
- Security audits
- Architecture reviews
- Performance optimization
- Compliance checks (HIPAA, GDPR)

---

### 🧪 `tester` - Test Creation

**PRIMARY USE**: Jasmine/Karma unit tests, Playwright E2E tests

**Key Capabilities**:
- Unit test generation (Jasmine)
- Test builders and factories
- Service mock creation (`jasmine.createSpyObj`)
- DOM testing utilities
- Integration test patterns
- Coverage analysis (90%+ target)

**Diabetactic Examples**:
```bash
# Create unit tests for new feature
Task("Unit Test Engineer", "Write comprehensive Jasmine tests for AppointmentDetailPage. Mock AppointmentService, test async data loading, error states, and video call launch. Use fakeAsync + tick. Target 95% coverage.", "tester")

# E2E test suite
Task("E2E Automation", "Create Playwright test suite for glucose reading workflow: login → add manual reading → verify list update → check statistics. Test both online/offline modes.", "tester")

# Test refactoring
Task("Test Maintainer", "Refactor readings.page.spec.ts to use TestBuilders (GlucoseReadingBuilder, StatisticsBuilder). Remove test duplication and improve readability.", "tester")
```

**Best For**:
- Unit test creation
- E2E test automation
- Test refactoring
- Coverage improvement
- Test utilities

---

### 📋 `planner` - Strategic Planning

**PRIMARY USE**: Feature planning, task decomposition, sprint planning

**Key Capabilities**:
- Strategic project planning
- Task breakdown (epic → story → task)
- Timeline estimation
- Risk assessment
- Resource allocation
- Dependency mapping

**Diabetactic Examples**:
```bash
# Feature planning
Task("Sprint Planner", "Plan implementation of tele-appointment video call feature. Break down into tasks: UI components, video SDK integration, backend API, testing, documentation. Estimate 2-week sprint.", "planner")

# Migration planning
Task("Migration Strategist", "Create migration plan from module-based to standalone components. Prioritize by dependency order, estimate effort, identify risks, plan rollback strategy.", "planner")

# Technical debt assessment
Task("Debt Analyzer", "Analyze technical debt in src/app/core/services/. Categorize by severity, estimate remediation effort, prioritize by business impact. Create 3-sprint roadmap.", "planner")
```

**Best For**:
- Sprint planning
- Feature breakdown
- Migration planning
- Risk assessment
- Timeline estimation

---

### 🔍 `researcher` - Information Gathering

**PRIMARY USE**: Technology research, best practices discovery, problem investigation

**Key Capabilities**:
- Technology evaluation (libraries, frameworks)
- Best practices research
- Architecture pattern investigation
- Security research (OWASP, HIPAA)
- Performance optimization techniques
- Documentation research

**Diabetactic Examples**:
```bash
# Library evaluation
Task("Tech Researcher", "Research Tidepool API integration best practices. Compare OAuth flow implementations, analyze rate limits, evaluate sync strategies, recommend client library.", "researcher")

# Best practices
Task("Pattern Scout", "Research Angular 20 + Ionic 8 best practices for healthcare apps. Focus on: offline-first patterns, secure data storage, HIPAA compliance, accessibility.", "researcher")

# Problem investigation
Task("Issue Investigator", "Research IndexedDB sync conflicts in Dexie. Analyze conflict resolution strategies, evaluate CRDT patterns, recommend solution for glucose reading sync.", "researcher")
```

**Best For**:
- Library evaluation
- Pattern research
- Problem investigation
- Compliance research
- Performance research

---

## 📁 Category 2: Mobile & Domain Specialists (8 agents)

### 📱 `mobile-dev` - Mobile Application Development

**PRIMARY USE**: Ionic/Capacitor mobile features, native integrations

**Key Capabilities**:
- Ionic 8 UI development
- Capacitor 6 plugin integration
- Android/iOS platform-specific code
- Mobile performance optimization
- App store deployment preparation
- Device API integration (Camera, Storage, Network)

**Diabetactic Examples**:
```bash
# Capacitor plugin integration
Task("Mobile Developer", "Integrate Capacitor Background Fetch for glucose sync. Add Android/iOS permissions, implement background task, handle network errors, test on device.", "mobile-dev")

# Platform-specific features
Task("Native Integration", "Implement Android health data sharing via Health Connect API. Add Capacitor plugin, request permissions, sync glucose readings, handle conflicts.", "mobile-dev")

# Offline-first mobile
Task("Offline Specialist", "Optimize offline-first patterns for mobile. Implement request queuing, background sync, conflict resolution, and user feedback. Test on 3G/offline.", "mobile-dev")
```

**Best For**:
- Capacitor plugin integration
- Native features (Camera, Storage, Network)
- Mobile UI optimization
- Platform-specific code
- App deployment

---

### ⚙️ `backend-dev` - Server Development

**PRIMARY USE**: API integration, microservices communication, backend service development

**Key Capabilities**:
- REST/GraphQL API integration
- Microservices architecture
- Authentication/authorization (OAuth, JWT)
- Database design (PostgreSQL, MongoDB)
- API gateway patterns
- Service orchestration

**Diabetactic Examples**:
```bash
# API Gateway integration
Task("Backend Engineer", "Implement ApiGatewayService request routing. Add service health checks, circuit breaker pattern, request caching with TTL, automatic retry with backoff.", "backend-dev")

# Service orchestration
Task("Orchestration Developer", "Design saga pattern for appointment booking with glucose sharing. Implement compensating transactions, idempotency, and distributed tracing.", "backend-dev")

# Authentication service
Task("Auth Developer", "Refactor UnifiedAuthService to support multi-provider auth (local + Tidepool + future OAuth providers). Add token refresh, session management, and secure storage.", "backend-dev")
```

**Best For**:
- API integration
- Service orchestration
- Authentication systems
- Microservices design
- Backend refactoring

---

### 🏛️ `system-architect` - High-Level System Design

**PRIMARY USE**: Architecture design, service patterns, scalability planning

**Key Capabilities**:
- System architecture design
- Scalability planning
- Technology stack evaluation
- Integration pattern design
- Performance architecture
- Data flow modeling

**Diabetactic Examples**:
```bash
# Service architecture
Task("Solution Architect", "Design unified data sync architecture across Tidepool, Glucoserver, and local IndexedDB. Define sync strategy, conflict resolution, and error handling patterns.", "system-architect")

# Scalability design
Task("Scale Architect", "Architect multi-tenant backend for Diabetactic enterprise. Design database sharding, API rate limiting, caching strategy, and monitoring infrastructure.", "system-architect")

# Migration architecture
Task("Migration Architect", "Design migration from monolithic services to event-driven microservices. Define service boundaries, event schema, communication patterns, and rollback strategy.", "system-architect")
```

**Best For**:
- Architecture design
- Service patterns
- Migration planning
- Scalability design
- System modeling

---

### 📚 `api-docs` - API Documentation

**PRIMARY USE**: OpenAPI specs, API documentation, code examples

**Key Capabilities**:
- OpenAPI 3.0 specification generation
- API documentation creation
- Interactive documentation (Swagger UI)
- Code example generation (TypeScript)
- Postman collection creation
- API versioning documentation

**Diabetactic Examples**:
```bash
# OpenAPI generation
Task("API Documenter", "Generate OpenAPI 3.0 spec for ApiGatewayService endpoints. Document all services (Auth, Glucoserver, Appointments), request/response schemas, error codes, and examples.", "api-docs")

# Integration guide
Task("Integration Writer", "Create developer guide for external API integration. Include authentication flow, rate limits, error handling, code examples (TypeScript/Python), and troubleshooting.", "api-docs")

# Service documentation
Task("Service Documenter", "Document ServiceOrchestrator saga patterns. Explain compensating transactions, retry logic, circuit breaker, and monitoring. Include sequence diagrams and examples.", "api-docs")
```

**Best For**:
- API documentation
- OpenAPI specs
- Integration guides
- Code examples
- Developer onboarding

---

### 🧬 `ml-developer` - Machine Learning

**PRIMARY USE**: Predictive models, data analysis, ML pipelines (future features)

**Key Capabilities**:
- Machine learning model development
- Data pipeline creation
- Glucose prediction models
- Anomaly detection
- Model training/optimization
- ML deployment (TensorFlow.js)

**Diabetactic Examples**:
```bash
# Glucose prediction
Task("ML Engineer", "Build glucose prediction model using historical readings. Train LSTM model, deploy with TensorFlow.js, integrate into dashboard, show confidence intervals.", "ml-developer")

# Anomaly detection
Task("Anomaly Specialist", "Create anomaly detection for unusual glucose patterns. Use isolation forest, detect hypoglycemia risks, generate alerts, integrate with notification system.", "ml-developer")

# Pattern analysis
Task("Data Scientist", "Analyze glucose patterns to identify meal impact, exercise effects, and medication response. Generate insights dashboard with visualizations.", "ml-developer")
```

**Best For**:
- Predictive features
- Pattern analysis
- Anomaly detection
- Data insights
- ML integration

---

### 🔒 `security-analyzer` - Security Analysis

**PRIMARY USE**: HIPAA compliance, vulnerability scanning, security audits

**Key Capabilities**:
- Security vulnerability scanning
- HIPAA/GDPR compliance assessment
- Threat modeling
- Penetration testing
- Security best practices enforcement
- Secure coding review

**Diabetactic Examples**:
```bash
# HIPAA compliance audit
Task("HIPAA Auditor", "Audit Diabetactic for HIPAA compliance. Review PHI storage (IndexedDB encryption), API security (TLS, auth), audit logging, and access controls. Generate compliance report.", "security-analyzer")

# Vulnerability assessment
Task("Security Tester", "Perform security assessment: XSS testing, SQL injection, authentication bypass, token security, API rate limiting. Test in demo and production modes.", "security-analyzer")

# Secure storage review
Task("Encryption Specialist", "Review sensitive data storage. Audit: password hashing (bcrypt), token storage (Capacitor SecureStorage), PHI encryption at rest, secure key management.", "security-analyzer")
```

**Best For**:
- HIPAA compliance
- Security audits
- Vulnerability scanning
- Penetration testing
- Encryption review

---

### 🚀 `cicd-engineer` - CI/CD Pipeline Management

**PRIMARY USE**: GitHub Actions, automated testing, deployment automation

**Key Capabilities**:
- CI/CD pipeline design
- GitHub Actions workflows
- Automated testing (unit, E2E)
- Build optimization
- Deployment strategies (blue-green, canary)
- Environment management

**Diabetactic Examples**:
```bash
# CI/CD pipeline
Task("DevOps Engineer", "Create GitHub Actions workflow: lint → test → build → deploy. Add parallel jobs, caching (node_modules), E2E tests, and deployment to staging/production.", "cicd-engineer")

# Test automation
Task("Test Automation", "Optimize test pipeline: parallel Karma tests, Playwright E2E with video artifacts, coverage reporting (Codecov), and failure notifications (Slack).", "cicd-engineer")

# Mobile deployment
Task("Mobile CI/CD", "Create Capacitor Android build pipeline: sync → build → sign → upload to Play Store internal testing. Add automated screenshots and changelog generation.", "cicd-engineer")
```

**Best For**:
- CI/CD pipelines
- Test automation
- Build optimization
- Deployment automation
- Mobile releases

---

### 🎨 `production-validator` - Production Validation

**PRIMARY USE**: Pre-release validation, smoke testing, production readiness

**Key Capabilities**:
- Production environment validation
- Smoke testing
- Performance validation
- Security assessment
- Deployment verification
- Rollback testing

**Diabetactic Examples**:
```bash
# Production readiness
Task("Release Validator", "Validate production readiness: smoke tests, performance benchmarks (<3s page load), security scan, backup verification, rollback test. Generate checklist.", "production-validator")

# Performance validation
Task("Performance Tester", "Validate production performance: API latency (<200ms), bundle size (<2MB), Lighthouse score (>90), mobile performance, offline mode.", "production-validator")

# Security validation
Task("Security Validator", "Run pre-release security checks: dependency audit, HIPAA compliance, penetration test, API security, certificate validation, and security headers.", "production-validator")
```

**Best For**:
- Production validation
- Smoke testing
- Performance checks
- Security validation
- Release readiness

---

## 📁 Category 3: Testing & Quality Assurance (7 agents)

### 🧪 `unit-test-specialist` - Unit Testing

**PRIMARY USE**: Comprehensive Jasmine/Karma unit tests

**Key Capabilities**:
- Unit test generation (Jasmine)
- Test coverage optimization (90%+)
- Test maintainability patterns
- Assertion strategies
- Mock creation (`jasmine.createSpyObj`)
- Test performance optimization

**Diabetactic Examples**:
```bash
# Comprehensive unit tests
Task("Unit Test Expert", "Create exhaustive unit tests for ServiceOrchestrator. Test all saga patterns, compensating transactions, retry logic, error handling, and edge cases. Target 100% coverage.", "unit-test-specialist")

# Test refactoring
Task("Test Refactorer", "Refactor all service tests to use test builders (GlucoseReadingBuilder, AppointmentBuilder, UserProfileBuilder). Eliminate duplication, improve readability.", "unit-test-specialist")

# Mock optimization
Task("Mock Engineer", "Create comprehensive service mocks for integration tests. Build reusable mock factories for ReadingsService, AppointmentService, AuthService with realistic data.", "unit-test-specialist")
```

**Best For**:
- Unit test creation
- Test coverage improvement
- Test refactoring
- Mock creation
- Test utilities

---

### 🔗 `integration-tester` - Integration Testing

**PRIMARY USE**: Component integration, service integration, API testing

**Key Capabilities**:
- Integration test design
- API integration testing
- Service integration validation
- Database integration testing
- Multi-component testing
- Contract testing

**Diabetactic Examples**:
```bash
# Service integration tests
Task("Integration Engineer", "Create integration tests for appointment booking flow: AuthService → AppointmentService → ApiGateway → backend. Test success, failure, retry, and rollback scenarios.", "integration-tester")

# API contract tests
Task("Contract Tester", "Implement API contract tests for all ApiGatewayService endpoints. Validate request/response schemas, error codes, authentication, and rate limiting.", "integration-tester")

# Database integration
Task("DB Integration Tester", "Test Dexie database integration: schema migrations, CRUD operations, sync logic, conflict resolution, and IndexedDB quota handling.", "integration-tester")
```

**Best For**:
- Service integration
- API testing
- Database testing
- Contract testing
- Multi-component tests

---

### 🎭 `e2e-automation` - End-to-End Testing

**PRIMARY USE**: Playwright E2E tests, user journey validation

**Key Capabilities**:
- E2E test automation (Playwright)
- User journey testing
- Cross-browser testing
- Mobile testing (Android/iOS emulator)
- Visual regression testing
- Performance testing

**Diabetactic Examples**:
```bash
# E2E test suite
Task("E2E Engineer", "Create comprehensive Playwright E2E suite: login → dashboard → add reading → view statistics → book appointment → logout. Test desktop + mobile viewports.", "e2e-automation")

# Critical path testing
Task("Critical Path Tester", "Implement E2E tests for critical user journeys: first-time onboarding, glucose tracking, appointment booking, emergency alert. Include error scenarios.", "e2e-automation")

# Visual regression
Task("Visual Tester", "Set up Playwright visual regression testing. Capture screenshots of all pages, detect UI regressions, integrate with CI/CD, review and approve changes.", "e2e-automation")
```

**Best For**:
- E2E automation
- User journey testing
- Visual regression
- Cross-browser testing
- Mobile testing

---

### 🎯 `tdd-london-swarm` - London-Style TDD

**PRIMARY USE**: Outside-in TDD, mock-based testing, behavior specification

**Key Capabilities**:
- Outside-in TDD approach
- Mock-based testing
- Behavior specification (BDD)
- Test isolation
- Design emergence
- Refactoring support

**Diabetactic Examples**:
```bash
# TDD feature development
Task("TDD Coach", "Implement glucose export feature using London-style TDD. Start with acceptance test (E2E), work inward to component/service tests, drive design through tests.", "tdd-london-swarm")

# Refactoring with tests
Task("TDD Refactorer", "Refactor ReadingsService using TDD. Write characterization tests first, refactor to extract sync logic, verify behavior unchanged, improve design.", "tdd-london-swarm")

# Mock-based testing
Task("Mock-First Developer", "Implement appointment booking with mock-first TDD. Define interfaces via mocks, drive design through tests, implement last. Verify all mocks converted to real implementations.", "tdd-london-swarm")
```

**Best For**:
- TDD workflows
- Outside-in development
- Mock-based testing
- Design emergence
- Refactoring safety

---

### 🔍 `code-analyzer` - Code Analysis

**PRIMARY USE**: Static analysis, complexity metrics, technical debt

**Key Capabilities**:
- Static code analysis (ESLint, TSLint)
- Code complexity assessment (cyclomatic complexity)
- Technical debt identification
- Refactoring recommendations
- Code smell detection
- Dependency analysis

**Diabetactic Examples**:
```bash
# Code quality analysis
Task("Code Analyzer", "Analyze src/app/core/services/ for code quality issues. Report: cyclomatic complexity (>10), method length (>50 lines), class size (>500 lines), duplicated code (>5%).", "code-analyzer")

# Technical debt report
Task("Debt Analyst", "Generate technical debt report: identify anti-patterns (Promise-Observable mixing, unsubscribed observables, N+1 queries), estimate remediation effort, prioritize by impact.", "code-analyzer")

# Dependency audit
Task("Dependency Auditor", "Audit npm dependencies: identify outdated packages (Angular 20, Ionic 8), security vulnerabilities, unused dependencies, and breaking changes in upgrades.", "code-analyzer")
```

**Best For**:
- Code quality analysis
- Technical debt assessment
- Refactoring planning
- Dependency audits
- Complexity metrics

---

### ⚡ `perf-analyzer` - Performance Analysis

**PRIMARY USE**: Performance bottlenecks, optimization recommendations

**Key Capabilities**:
- Performance bottleneck identification
- Resource usage analysis (CPU, memory, network)
- Bundle size optimization
- Lazy loading analysis
- Change detection optimization
- Lighthouse audits

**Diabetactic Examples**:
```bash
# Performance audit
Task("Performance Engineer", "Audit Diabetactic performance: bundle size analysis, lazy loading opportunities, change detection optimization, API request batching, IndexedDB query optimization.", "perf-analyzer")

# Mobile performance
Task("Mobile Performance", "Optimize mobile performance: reduce initial load (<3s), optimize images, implement virtual scrolling for lists, lazy load Ionic components, cache API responses.", "perf-analyzer")

# Memory leak detection
Task("Memory Profiler", "Detect and fix memory leaks: unsubscribed observables, circular references, event listener cleanup, component destruction, and IndexedDB cursor management.", "perf-analyzer")
```

**Best For**:
- Performance optimization
- Bottleneck identification
- Bundle size reduction
- Memory leak detection
- Mobile optimization

---

### 📊 `performance-benchmarker` - Performance Testing

**PRIMARY USE**: Performance benchmarks, load testing, stress testing

**Key Capabilities**:
- Performance benchmark creation
- Load testing execution
- Stress testing coordination
- Performance regression detection
- Benchmark reporting
- Baseline establishment

**Diabetactic Examples**:
```bash
# Performance benchmarks
Task("Benchmark Engineer", "Create performance benchmarks: API latency (p50/p95/p99), page load time, IndexedDB query time, sync duration, memory usage. Establish baselines and regression thresholds.", "performance-benchmarker")

# Load testing
Task("Load Tester", "Perform load testing: simulate 1000 concurrent users, test API rate limits, database connection pooling, IndexedDB concurrent access, and error handling under load.", "performance-benchmarker")

# Mobile benchmarks
Task("Mobile Benchmarker", "Benchmark mobile performance on real devices: startup time, frame rate (60fps target), battery usage, network efficiency, and offline mode performance.", "performance-benchmarker")
```

**Best For**:
- Performance benchmarks
- Load testing
- Stress testing
- Regression detection
- Baseline establishment

---

## 📁 Category 4: GitHub & Repository Management (12 agents)

### 🔀 `pr-manager` - Pull Request Management

**PRIMARY USE**: Automated PR creation, review coordination, merge automation

**Key Capabilities**:
- Automated PR creation and updates
- Multi-reviewer coordination
- Conflict resolution assistance
- Review assignment optimization
- Merge strategy enforcement
- PR template management

**Diabetactic Examples**:
```bash
# Automated PR workflow
Task("PR Manager", "Create PR for glucose export feature: generate title/description from commits, assign reviewers (code owner + 2 team members), apply labels (feature, backend), run CI checks.", "pr-manager")

# PR review coordination
Task("Review Coordinator", "Coordinate PR reviews: assign security reviewer for auth changes, performance reviewer for DB queries, mobile reviewer for Capacitor changes, track approvals.", "pr-manager")

# Merge automation
Task("Merge Manager", "Automate PR merges: check all CI passed, 2+ approvals, no conflicts, squash commits, auto-generate changelog, post-merge cleanup (delete branch).", "pr-manager")
```

**Best For**:
- PR automation
- Review coordination
- Merge management
- CI/CD integration
- Branch cleanup

---

### 👁️ `code-review-swarm` - Multi-Agent Code Review

**PRIMARY USE**: Distributed code review, specialized review coordination

**Key Capabilities**:
- Multi-agent review coordination
- Specialized review assignment (security, performance, a11y)
- Code quality assessment
- Security vulnerability scanning
- Review consensus building
- Automated code suggestions

**Diabetactic Examples**:
```bash
# Comprehensive code review
Task("Review Swarm", "Review appointment booking PR: Security agent checks auth, Performance agent analyzes queries, Quality agent reviews tests, Mobile agent checks Capacitor integration. Aggregate findings.", "code-review-swarm")

# Specialized review
Task("Expert Review Team", "HIPAA compliance review: Security agent audits PHI handling, Compliance agent checks audit logging, Privacy agent reviews data access controls, generate compliance report.", "code-review-swarm")

# Automated suggestions
Task("Review Automation", "Generate automated review suggestions: ESLint fixes, type improvements, refactoring opportunities, test coverage gaps, documentation improvements. Create review comments.", "code-review-swarm")
```

**Best For**:
- Comprehensive reviews
- Specialized expertise
- Multi-agent coordination
- Automated suggestions
- Quality enforcement

---

### 📋 `issue-tracker` - Issue Management

**PRIMARY USE**: Intelligent issue tracking, prioritization, assignment

**Key Capabilities**:
- Issue classification and prioritization
- Automated issue assignment
- Progress tracking and reporting
- Issue relationship mapping (duplicates, dependencies)
- Resolution coordination
- Milestone tracking

**Diabetactic Examples**:
```bash
# Issue triage
Task("Issue Triager", "Triage new GitHub issues: classify by type (bug/feature/question), prioritize by severity, assign to team members based on expertise, apply labels, estimate effort.", "issue-tracker")

# Bug tracking
Task("Bug Coordinator", "Track critical bugs: monitor status, escalate blockers, coordinate fixes across teams, track regression tests, verify resolution, update stakeholders.", "issue-tracker")

# Milestone management
Task("Milestone Manager", "Manage v2.0 milestone: track progress (10/25 issues closed), identify blockers, coordinate cross-team dependencies, generate status report, adjust timeline.", "issue-tracker")
```

**Best For**:
- Issue triage
- Prioritization
- Assignment automation
- Progress tracking
- Milestone management

---

### 🚀 `release-manager` - Release Coordination

**PRIMARY USE**: Release planning, changelog generation, deployment coordination

**Key Capabilities**:
- Release planning and scheduling
- Automated changelog generation (conventional commits)
- Deployment coordination (staging → production)
- Rollback management
- Version management (semantic versioning)
- Release notes generation

**Diabetactic Examples**:
```bash
# Release coordination
Task("Release Coordinator", "Coordinate v2.1.0 release: generate changelog from commits, create release notes, tag version, deploy to staging, run smoke tests, deploy to production, notify team.", "release-manager")

# Mobile release
Task("Mobile Release Manager", "Coordinate Android release: bump version, update changelog, build signed APK, upload to Play Store internal testing, submit for review, monitor crash reports.", "release-manager")

# Hotfix release
Task("Hotfix Manager", "Coordinate emergency hotfix v2.0.1: cherry-pick fix to release branch, run regression tests, fast-track review, deploy to production, post-mortem analysis.", "release-manager")
```

**Best For**:
- Release planning
- Changelog automation
- Deployment coordination
- Version management
- Hotfix coordination

---

### 🤖 `workflow-automation` - GitHub Actions Automation

**PRIMARY USE**: GitHub Actions workflows, CI/CD automation

**Key Capabilities**:
- Workflow design and optimization
- Action marketplace integration
- CI/CD pipeline management
- Secret management
- Workflow debugging
- Scheduled workflow automation

**Diabetactic Examples**:
```bash
# CI/CD workflow
Task("Workflow Engineer", "Create GitHub Actions CI/CD: lint → test (unit + E2E) → build → deploy. Add parallel jobs, caching, Playwright artifacts, coverage reports, deployment to Vercel.", "workflow-automation")

# Automated testing
Task("Test Automation", "Create test workflows: run Karma on PR, Playwright nightly, visual regression on staging deploy, performance benchmarks weekly, security scan monthly.", "workflow-automation")

# Release automation
Task("Release Automation", "Automate release workflow: bump version on merge to main, generate changelog, create GitHub release, build mobile apps, deploy web app, notify Slack.", "workflow-automation")
```

**Best For**:
- CI/CD pipelines
- Test automation
- Release automation
- Scheduled tasks
- Workflow optimization

---

### 🏗️ `repo-architect` - Repository Architecture

**PRIMARY USE**: Repository structure, branching strategy, governance

**Key Capabilities**:
- Repository structure design (monorepo, multi-repo)
- Branching strategy optimization (Git Flow, trunk-based)
- Workflow template creation
- CI/CD pipeline design
- Repository governance (CODEOWNERS, branch protection)
- Documentation structure

**Diabetactic Examples**:
```bash
# Repository structure
Task("Repo Designer", "Design monorepo structure for Diabetactic: web app, mobile app, backend services, shared libraries. Define workspace configuration, dependency management, build orchestration.", "repo-architect")

# Branching strategy
Task("Branch Strategist", "Optimize branching strategy: main (production), develop (staging), feature branches, hotfix workflow. Define merge rules, PR templates, branch protection, auto-delete.", "repo-architect")

# Governance
Task("Governance Manager", "Set up repository governance: CODEOWNERS (services → backend team, UI → frontend team), branch protection (2 approvals, CI passed), PR templates, issue templates.", "repo-architect")
```

**Best For**:
- Repository design
- Branching strategy
- Governance setup
- Monorepo management
- Documentation structure

---

### 📊 `project-board-sync` - Project Board Management

**PRIMARY USE**: GitHub Projects automation, progress tracking

**Key Capabilities**:
- Project board automation
- Card movement coordination (todo → in progress → done)
- Progress visualization
- Milestone tracking
- Team coordination
- Burndown charts

**Diabetactic Examples**:
```bash
# Project board automation
Task("Board Manager", "Automate GitHub Projects: move cards on PR status (draft → review → merged), auto-add issues to backlog, link PRs to cards, track milestone progress.", "project-board-sync")

# Sprint management
Task("Sprint Coordinator", "Manage sprint board: track 2-week sprint progress (15/20 points completed), identify blockers, generate burndown chart, plan next sprint, retrospective notes.", "project-board-sync")

# Roadmap tracking
Task("Roadmap Manager", "Track product roadmap: Q1 milestone (8/12 features completed), Q2 planning, dependency tracking across teams, stakeholder updates, risk assessment.", "project-board-sync")
```

**Best For**:
- Project automation
- Sprint management
- Progress tracking
- Milestone coordination
- Team visibility

---

### 🔄 `sync-coordinator` - Multi-Repository Synchronization

**PRIMARY USE**: Cross-repository coordination, dependency tracking

**Key Capabilities**:
- Multi-repo synchronization
- Dependency tracking (shared libraries, APIs)
- Cross-repo issue linking
- Unified release coordination
- Repository relationship management
- Dependency updates

**Diabetactic Examples**:
```bash
# Monorepo coordination
Task("Sync Manager", "Coordinate extServices submodule updates: track API changes, update Diabetactic client, coordinate deployments, test integration, version compatibility.", "sync-coordinator")

# Cross-repo releases
Task("Release Syncer", "Coordinate cross-repo release: backend v2.0 → update API client → update Diabetactic → deploy staging → integration tests → production deployment.", "sync-coordinator")

# Dependency management
Task("Dependency Coordinator", "Manage shared dependencies: Angular 20 upgrade across repos, coordinate breaking changes, update lockfiles, test integrations, coordinate releases.", "sync-coordinator")
```

**Best For**:
- Multi-repo coordination
- Submodule management
- Dependency tracking
- Cross-repo releases
- Integration coordination

---

### 🔨 `swarm-issue` - Swarm-Based Issue Resolution

**PRIMARY USE**: Complex issue resolution with multi-agent coordination

**Key Capabilities**:
- Swarm-based problem solving
- Issue decomposition
- Parallel resolution strategies
- Resource coordination
- Solution integration
- Knowledge sharing

**Diabetactic Examples**:
```bash
# Complex bug resolution
Task("Issue Swarm", "Resolve complex sync bug: Research agent investigates root cause, Coder agent implements fix, Tester agent creates regression tests, Reviewer agent validates, documenter writes post-mortem.", "swarm-issue")

# Performance issue
Task("Performance Swarm", "Fix dashboard performance: Analyzer identifies bottlenecks, Backend dev optimizes API, Frontend dev optimizes rendering, Tester benchmarks improvements.", "swarm-issue")

# Security issue
Task("Security Swarm", "Resolve security vulnerability: Security analyst assesses impact, Coder patches vulnerability, Tester validates fix, Compliance agent verifies HIPAA compliance, Release manager coordinates hotfix.", "swarm-issue")
```

**Best For**:
- Complex issues
- Multi-disciplinary problems
- Performance issues
- Security vulnerabilities
- Coordinated fixes

---

### 🔀 `swarm-pr` - Swarm-Based PR Management

**PRIMARY USE**: Complex PR handling with multi-agent review

**Key Capabilities**:
- Distributed PR review
- Parallel development coordination
- Merge conflict resolution
- Quality assurance coordination
- Integration testing
- Review consensus

**Diabetactic Examples**:
```bash
# Large PR review
Task("PR Swarm", "Review large refactoring PR (50 files): Code analyzer reviews structure, Security analyst checks vulnerabilities, Performance analyst benchmarks, Tester validates tests, Reviewer approves.", "swarm-pr")

# Multi-team PR
Task("Coordinated Review", "Coordinate cross-team PR: Backend team reviews API changes, Frontend team reviews client updates, Mobile team checks Capacitor integration, Consensus on merge.", "swarm-pr")

# Conflict resolution
Task("Conflict Resolver", "Resolve complex merge conflicts: Analyzer identifies conflicts, Coder proposes resolution strategies, Tester validates merged code, Reviewer approves resolution.", "swarm-pr")
```

**Best For**:
- Large PRs
- Complex reviews
- Cross-team coordination
- Conflict resolution
- Consensus building

---

### 🌐 `multi-repo-swarm` - Multi-Repository Swarm Coordination

**PRIMARY USE**: Large-scale repository management, distributed development

**Key Capabilities**:
- Multi-repository coordination
- Distributed development management
- Cross-repo dependency tracking
- Unified build coordination
- Release synchronization
- Monorepo management

**Diabetactic Examples**:
```bash
# Monorepo coordination
Task("Monorepo Swarm", "Coordinate Diabetactic ecosystem: web app, mobile app, backend services (auth, appointments, glucoserver), API gateway. Manage dependencies, build order, releases.", "multi-repo-swarm")

# Distributed feature
Task("Feature Swarm", "Implement cross-repo feature (glucose export): Backend adds export endpoint, API gateway routes request, Diabetactic adds UI, coordinate testing and deployment.", "multi-repo-swarm")

# Architecture migration
Task("Migration Swarm", "Migrate from submodules to monorepo: Plan migration, restructure repos, update CI/CD, test builds, coordinate team training, phased rollout.", "multi-repo-swarm")
```

**Best For**:
- Monorepo management
- Cross-repo features
- Distributed teams
- Architecture migrations
- Unified releases

---

## 📁 Category 5: Swarm Coordination & Consensus (12 agents)

### 👑 `hierarchical-coordinator` - Queen-Led Coordination

**PRIMARY USE**: Centralized command and control for large projects

**Key Capabilities**:
- Centralized decision making
- Task delegation and oversight
- Resource allocation management
- Quality control and validation
- Strategic direction setting
- Priority management

**Diabetactic Examples**:
```bash
# Large feature coordination
Task("Queen Coordinator", "Coordinate tele-appointment feature: Assign architect for design, backend/frontend developers for implementation, testers for validation, reviewer for quality. Track progress and resolve blockers.", "hierarchical-coordinator")

# Release coordination
Task("Release Queen", "Coordinate v2.0 release: Delegate tasks to teams (backend, frontend, mobile, QA), monitor progress, resolve conflicts, enforce quality gates, approve release.", "hierarchical-coordinator")

# Crisis management
Task("Crisis Coordinator", "Manage production incident: Assign security team to investigation, backend team to fix, mobile team to deploy hotfix, communication team to stakeholders, post-mortem team.", "hierarchical-coordinator")
```

**Best For**:
- Large projects (10+ agents)
- Complex features
- Release coordination
- Crisis management
- Strategic planning

**Topology**: Best for 5-15 agents with clear hierarchy

---

### 🕸️ `mesh-coordinator` - Peer-to-Peer Coordination

**PRIMARY USE**: Distributed coordination without central authority

**Key Capabilities**:
- Peer-to-peer task coordination
- Distributed decision making
- Load balancing across agents
- Fault tolerance through redundancy
- Adaptive task redistribution
- Democratic consensus

**Diabetactic Examples**:
```bash
# Collaborative development
Task("Mesh Network", "Coordinate refactoring: All agents (coder, reviewer, tester, documenter) collaborate as peers. Share knowledge, make decisions collectively, balance workload dynamically.", "mesh-coordinator")

# Research project
Task("Peer Researchers", "Research glucose prediction models: Multiple researchers explore different approaches (LSTM, Random Forest, XGBoost) in parallel, share findings, converge on best solution.", "mesh-coordinator")

# Code review
Task("Peer Review", "Distribute code review: Multiple reviewers (security, performance, quality, accessibility) review PR independently, share findings peer-to-peer, reach consensus.", "mesh-coordinator")
```

**Best For**:
- Collaborative work (3-8 agents)
- Research projects
- Peer reviews
- Exploratory work
- Democratic decision-making

**Topology**: Best for 3-8 agents with equal authority

---

### 🔄 `adaptive-coordinator` - Dynamic Topology Management

**PRIMARY USE**: Adaptive coordination based on workload and conditions

**Key Capabilities**:
- Dynamic topology adjustment (mesh ↔ hierarchical)
- Real-time load balancing
- Performance-based agent selection
- Automatic scaling decisions
- Context-aware coordination
- Bottleneck detection and resolution

**Diabetactic Examples**:
```bash
# Dynamic feature development
Task("Adaptive Manager", "Coordinate glucose export feature: Start with mesh for research, switch to hierarchical for implementation, adapt based on complexity and team size. Auto-scale agents as needed.", "adaptive-coordinator")

# Performance optimization
Task("Adaptive Optimizer", "Optimize Diabetactic performance: Dynamically assign performance analyzers to bottlenecks, scale analyzer team based on complexity, switch coordination strategy as problems are resolved.", "adaptive-coordinator")

# Sprint execution
Task("Sprint Adapter", "Manage sprint execution: Adapt coordination based on workload (50% completion → add agents, blocker detected → switch to hierarchical crisis mode, approaching deadline → optimize parallelization).", "adaptive-coordinator")
```

**Best For**:
- Variable workloads
- Complex projects (strategy changes)
- Performance optimization
- Sprint execution
- Uncertain scope

**Topology**: Dynamically adapts between mesh, hierarchical, ring based on conditions

---

### 🧠 `collective-intelligence-coordinator` - Hive-Mind Coordination

**PRIMARY USE**: Collective intelligence and shared knowledge

**Key Capabilities**:
- Shared knowledge base management
- Collective decision making
- Distributed learning and adaptation
- Consensus-based planning
- Emergent intelligence coordination
- Pattern recognition across agents

**Diabetactic Examples**:
```bash
# Knowledge sharing
Task("Hive Mind", "Build shared knowledge base: All agents contribute learnings (patterns, anti-patterns, solutions) to collective memory. Enable emergent intelligence for problem-solving.", "collective-intelligence-coordinator")

# Emergent architecture
Task("Collective Designer", "Design service architecture collectively: All agents propose patterns, share constraints, learn from each other's proposals, emerge with optimal design through consensus.", "collective-intelligence-coordinator")

# Continuous learning
Task("Learning Collective", "Implement continuous learning: Agents share success/failure patterns, adapt strategies based on collective experience, improve decision-making over time.", "collective-intelligence-coordinator")
```

**Best For**:
- Knowledge-intensive projects
- Learning systems
- Emergent design
- Pattern recognition
- Collective intelligence

**Topology**: All agents share memory and learn collectively

---

### 💾 `swarm-memory-manager` - Distributed Memory Coordination

**PRIMARY USE**: Persistent memory and knowledge management

**Key Capabilities**:
- Distributed memory coordination
- Knowledge persistence and retrieval
- Cross-agent information sharing
- Memory consistency management
- Historical data management
- Context preservation

**Diabetactic Examples**:
```bash
# Knowledge persistence
Task("Memory Manager", "Manage swarm memory: Store API contracts, design decisions, test patterns, refactoring strategies. Enable agents to retrieve relevant knowledge for tasks.", "swarm-memory-manager")

# Context sharing
Task("Context Coordinator", "Share context across agents: Store glucose data model decisions, authentication flow, sync strategy. Enable new agents to access historical context immediately.", "swarm-memory-manager")

# Learning history
Task("History Keeper", "Maintain learning history: Record successful patterns (saga implementation, offline sync, error handling), enable agents to learn from past decisions.", "swarm-memory-manager")
```

**Best For**:
- Long-running projects
- Knowledge sharing
- Context preservation
- Learning systems
- Multi-session coordination

**Topology**: Works with any topology to provide shared memory

---

### ⚖️ `byzantine-coordinator` - Byzantine Fault Tolerance

**PRIMARY USE**: Fault tolerance in adversarial conditions

**Key Capabilities**:
- Byzantine fault tolerance (BFT) implementation
- Malicious agent detection
- Secure consensus protocols
- Network partition handling
- Security threat mitigation
- Trust management

**Diabetactic Examples**:
```bash
# Secure coordination
Task("BFT Coordinator", "Coordinate security-critical tasks with BFT: Multiple agents validate auth implementation independently, detect malicious suggestions, reach secure consensus on approval.", "byzantine-coordinator")

# Distributed validation
Task("Secure Validator", "Validate production deployment: Multiple agents verify independently (no collusion possible), detect tampering, reach consensus on deployment approval. Tolerate up to f faulty agents.", "byzantine-coordinator")

# Consensus in untrusted environment
Task("Trust Manager", "Manage untrusted agent environment: Detect malicious code suggestions, validate responses against multiple sources, require supermajority (2f+1) consensus for critical decisions.", "byzantine-coordinator")
```

**Best For**:
- Security-critical tasks
- Untrusted environments
- High-reliability systems
- Financial/healthcare data
- Distributed validation

**Topology**: Requires 3f+1 agents to tolerate f Byzantine failures

---

### 🗳️ `raft-manager` - Leader Election

**PRIMARY USE**: Raft consensus algorithm implementation

**Key Capabilities**:
- Leader election management
- Log replication coordination
- Consensus state management
- Failure detection and recovery
- Cluster membership management
- Strong consistency guarantees

**Diabetactic Examples**:
```bash
# Leader-based coordination
Task("Raft Manager", "Coordinate with Raft consensus: Elect leader for task coordination, replicate decisions to followers, maintain strong consistency, handle leader failures with re-election.", "raft-manager")

# State machine replication
Task("Consensus Manager", "Replicate application state: Leader coordinates state changes (feature flags, configuration), replicate to all agents, guarantee consistency even with failures.", "raft-manager")

# Distributed lock management
Task("Lock Coordinator", "Manage distributed locks: Leader grants exclusive access to shared resources (database migrations, deployment slots), prevent conflicts, release locks on failure.", "raft-manager")
```

**Best For**:
- Strong consistency needs
- Leader-based coordination
- State replication
- Distributed locking
- Configuration management

**Topology**: One leader, multiple followers (odd number of agents: 3, 5, 7)

---

### 💬 `consensus-builder` - Decision-Making Coordination

**PRIMARY USE**: Multi-agent consensus and decision making

**Key Capabilities**:
- Voting protocol coordination
- Quorum management
- Conflict resolution
- Decision aggregation
- Consensus threshold management
- Deadlock prevention

**Diabetactic Examples**:
```bash
# Architecture decisions
Task("Consensus Builder", "Build consensus on architecture: Multiple architects propose designs, vote on options (weighted by expertise), require 2/3 majority, resolve conflicts through discussion.", "consensus-builder")

# Code review consensus
Task("Review Consensus", "Coordinate review consensus: Multiple reviewers vote on PR approval (approve/request changes/reject), require majority approval, manage dissenting opinions.", "consensus-builder")

# Release approval
Task("Release Consensus", "Build release consensus: QA, security, product teams vote on release readiness, require unanimous approval, track objections and resolutions.", "consensus-builder")
```

**Best For**:
- Democratic decisions
- Architecture choices
- Review approvals
- Release decisions
- Conflict resolution

**Topology**: Works with any topology for voting and consensus

---

### 🔢 `quorum-manager` - Quorum Management

**PRIMARY USE**: Quorum-based decision making

**Key Capabilities**:
- Quorum size determination (N/2 + 1)
- Voting coordination
- Majority decision enforcement
- Member availability tracking
- Quorum recovery management
- Timeout handling

**Diabetactic Examples**:
```bash
# Quorum-based approvals
Task("Quorum Manager", "Manage quorum approvals: Track agent availability (5/7 available), require quorum (3+ votes) for decisions, timeout if quorum not reached (24h), handle agent failures.", "quorum-manager")

# Distributed validation
Task("Validation Quorum", "Coordinate validation quorum: 5 validators review security changes, require 3+ approvals (quorum), track votes, enforce timeout, re-vote if quorum lost.", "quorum-manager")

# High-availability coordination
Task("HA Coordinator", "Ensure high-availability decisions: Maintain agent pool (7 agents), require quorum (4+) for critical operations, handle temporary failures, guarantee progress with majority.", "quorum-manager")
```

**Best For**:
- High-availability systems
- Majority-based decisions
- Failure tolerance
- Distributed validation
- Critical operations

**Topology**: Requires N agents where quorum = N/2 + 1 (typically 5-9 agents)

---

### 📣 `gossip-coordinator` - Gossip Protocol Management

**PRIMARY USE**: Information dissemination and coordination

**Key Capabilities**:
- Gossip protocol implementation
- Information spreading coordination
- Network topology maintenance
- Rumor tracking and verification
- Epidemic-style communication
- Eventually consistent updates

**Diabetactic Examples**:
```bash
# Information spreading
Task("Gossip Manager", "Spread configuration changes: Agent receives update → gossips to random peers → peers gossip further → eventually all agents updated. Track propagation, detect missing agents.", "gossip-coordinator")

# Service discovery
Task("Discovery Coordinator", "Coordinate service discovery: Agents gossip about available services (API endpoints, feature flags), maintain eventually consistent view, handle node failures.", "gossip-coordinator")

# Metric aggregation
Task("Metrics Gossiper", "Aggregate metrics via gossip: Agents share performance metrics, gossip to peers, compute global aggregates (average response time), eventually consistent view.", "gossip-coordinator")
```

**Best For**:
- Large-scale systems (100+ agents)
- Eventually consistent updates
- Service discovery
- Metric aggregation
- Decentralized coordination

**Topology**: Each agent communicates with random peers (fanout=3-5)

---

### 🔗 `crdt-synchronizer` - Conflict-Free Replicated Data Types

**PRIMARY USE**: Distributed data synchronization

**Key Capabilities**:
- CRDT implementation and management
- Conflict-free data synchronization
- Eventual consistency coordination
- Merge operation management
- Distributed state reconciliation
- Causal ordering

**Diabetactic Examples**:
```bash
# Distributed state sync
Task("CRDT Coordinator", "Synchronize agent state with CRDTs: Use G-Counter for metrics, LWW-Register for configuration, OR-Set for task lists. Enable conflict-free merges, eventual consistency.", "crdt-synchronizer")

# Collaborative editing
Task("Collaborative Sync", "Coordinate collaborative document editing: Use Sequence CRDT for concurrent edits, resolve conflicts automatically, maintain causal ordering, guarantee convergence.", "crdt-synchronizer")

# Distributed configuration
Task("Config Synchronizer", "Sync configuration across agents: Use CRDT map for feature flags, enable concurrent updates, merge without conflicts, propagate changes eventually.", "crdt-synchronizer")
```

**Best For**:
- Distributed state management
- Collaborative editing
- Conflict-free updates
- Eventual consistency
- Offline-first systems

**Topology**: Peer-to-peer with CRDT merge logic

---

### 🔒 `security-manager` - Security Coordination

**PRIMARY USE**: Security and access control management

**Key Capabilities**:
- Access control enforcement (RBAC)
- Security policy management
- Threat detection and response
- Encryption key management
- Audit trail maintenance
- Compliance enforcement (HIPAA, GDPR)

**Diabetactic Examples**:
```bash
# Access control
Task("Security Coordinator", "Manage agent access control: Enforce RBAC (reviewer can approve, coder cannot merge), validate permissions before operations, audit all access, prevent privilege escalation.", "security-manager")

# Security policy enforcement
Task("Policy Enforcer", "Enforce security policies: All code changes require security review, PHI access requires audit logging, encryption required for sensitive data, compliance checks before release.", "security-manager")

# Threat detection
Task("Threat Detector", "Detect security threats: Monitor agent behavior for anomalies (unusual API calls, excessive permissions), alert on suspicious activity, quarantine compromised agents.", "security-manager")
```

**Best For**:
- Security-critical systems
- Healthcare/financial apps (HIPAA/PCI)
- Access control
- Compliance enforcement
- Threat detection

**Topology**: Works with any topology to enforce security policies

---

## 📁 Category 6: SPARC Methodology (4 agents)

### 📋 `specification` - SPARC Specification Phase

**PRIMARY USE**: Requirements specification and analysis

**Key Capabilities**:
- Requirements gathering and analysis
- User story creation
- Acceptance criteria definition
- Specification documentation
- Stakeholder communication
- Domain modeling

**Diabetactic Examples**:
```bash
# Feature specification
Task("Specification Agent", "Specify glucose export feature: Define requirements (formats: PDF/CSV/Excel, date range, include statistics), acceptance criteria, user stories, data privacy requirements (HIPAA).", "specification")

# Architecture requirements
Task("Requirements Analyst", "Specify tele-appointment requirements: Video call integration (WebRTC), appointment scheduling, reminder notifications, HIPAA-compliant recording, browser/mobile support.", "specification")

# Domain modeling
Task("Domain Modeler", "Model glucose management domain: Define entities (Reading, Appointment, UserProfile), relationships, business rules (time-in-range calculation), constraints.", "specification")
```

**Best For**:
- Feature planning (SPARC Phase 1)
- Requirements gathering
- User stories
- Domain modeling
- Acceptance criteria

**SPARC Phase**: Specification (S)

---

### 💭 `pseudocode` - SPARC Pseudocode Phase

**PRIMARY USE**: Algorithm design and pseudocode creation

**Key Capabilities**:
- Algorithm design
- Pseudocode generation
- Logic flow documentation
- Complexity analysis (time/space)
- Implementation planning
- Edge case identification

**Diabetactic Examples**:
```bash
# Algorithm design
Task("Pseudocode Designer", "Design glucose statistics algorithm: Calculate average, median, standard deviation, coefficient of variation, time-in-range. Handle edge cases (empty data, single reading), optimize for performance (O(n)).", "pseudocode")

# Complex workflow
Task("Workflow Designer", "Design appointment booking with glucose sharing workflow: Check user auth → validate appointment slot → book appointment → share glucose data → handle rollback on failure. Document compensating transactions.", "pseudocode")

# Data structure design
Task("Structure Designer", "Design IndexedDB sync queue: FIFO queue for offline operations, priority handling (critical operations first), conflict detection, retry logic, eventual consistency guarantees.", "pseudocode")
```

**Best For**:
- Algorithm design (SPARC Phase 2)
- Logic planning
- Complexity analysis
- Edge case identification
- Implementation planning

**SPARC Phase**: Pseudocode (P)

---

### 🏗️ `architecture` - SPARC Architecture Phase

**PRIMARY USE**: System architecture and design

**Key Capabilities**:
- System architecture design
- Component interaction design
- Interface definition
- Technology selection
- Architecture documentation (C4 diagrams)
- Pattern selection

**Diabetactic Examples**:
```bash
# Service architecture
Task("System Architect", "Design service orchestration architecture: ServiceOrchestrator coordinates ApiGatewayService, AuthService, ReadingsService. Define interfaces, error handling, transaction boundaries, monitoring.", "architecture")

# Data architecture
Task("Data Architect", "Design data sync architecture: IndexedDB (local) ↔ ApiGateway ↔ Backend. Define sync strategy (last-write-wins), conflict resolution, batch operations, offline queue.", "architecture")

# Integration architecture
Task("Integration Architect", "Design external API integration: ApiGatewayService routes to Tidepool, Glucoserver, Appointments. Define circuit breaker, retry logic, caching strategy, fallback.", "architecture")
```

**Best For**:
- System design (SPARC Phase 3)
- Component architecture
- Integration patterns
- Technology selection
- Architecture documentation

**SPARC Phase**: Architecture (A)

---

### 🔧 `refinement` - SPARC Refinement Phase

**PRIMARY USE**: Design refinement and optimization

**Key Capabilities**:
- Design refinement
- Performance optimization
- Security enhancement
- Scalability improvement
- Quality validation
- Implementation preparation

**Diabetactic Examples**:
```bash
# Performance refinement
Task("Performance Refiner", "Refine glucose statistics calculation: Optimize algorithm (memoization, incremental calculation), reduce memory usage (streaming), batch IndexedDB queries, lazy load data.", "refinement")

# Security refinement
Task("Security Refiner", "Refine authentication flow: Add PKCE for OAuth, implement token rotation, secure token storage (Capacitor SecureStorage), add rate limiting, CSRF protection.", "refinement")

# Scalability refinement
Task("Scale Refiner", "Refine data sync for scale: Batch API requests (100 readings per call), implement pagination, add compression, optimize IndexedDB indexes, handle large datasets (10k+ readings).", "refinement")
```

**Best For**:
- Design optimization (SPARC Phase 4)
- Performance tuning
- Security hardening
- Scalability improvements
- Implementation preparation

**SPARC Phase**: Refinement (R)

---

## 📁 Category 7: Templates & Automation (9+ agents)

### 🔨 `base-template-generator` - Template Generation

**PRIMARY USE**: Project templates, scaffolding, boilerplate generation

**Key Capabilities**:
- Project template generation
- Angular/Ionic scaffold creation
- Boilerplate code generation
- Configuration template creation
- Documentation templates
- Generator automation

**Diabetactic Examples**:
```bash
# Component template
Task("Template Generator", "Generate Ionic page template: Create standalone component with routing, form, service injection, error handling, loading state, unit tests. Include TypeScript interfaces and SCSS.", "base-template-generator")

# Service template
Task("Service Scaffolder", "Generate service template: Create Angular service with API integration, error handling, loading state (BehaviorSubject), retry logic, unit tests with mocks.", "base-template-generator")

# Test template
Task("Test Generator", "Generate test template: Create Jasmine test suite with setup (mocks, spies), test cases (happy path, errors, edge cases), teardown, and code coverage target (90%).", "base-template-generator")
```

**Best For**:
- Project scaffolding
- Component generation
- Service templates
- Test boilerplate
- Documentation templates

---

### 🤖 `automation-smart-agent` - Smart Automation

**PRIMARY USE**: Intelligent automation and workflow creation

**Key Capabilities**:
- Workflow automation
- Task automation
- Process optimization
- Rule-based automation
- Intelligent scheduling
- Auto-remediation

**Diabetactic Examples**:
```bash
# CI/CD automation
Task("Smart Automator", "Automate CI/CD workflow: Detect changes → run affected tests → auto-fix linting → build → deploy to staging → smoke test → notify team. Auto-rollback on failure.", "automation-smart-agent")

# Code maintenance
Task("Maintenance Automator", "Automate code maintenance: Weekly dependency updates, security patches, unused import cleanup, test coverage reports, performance benchmarks, GitHub issue creation.", "automation-smart-agent")

# Release automation
Task("Release Automator", "Automate release workflow: Detect merge to main → bump version → generate changelog → run full test suite → deploy → create GitHub release → notify stakeholders.", "automation-smart-agent")
```

**Best For**:
- CI/CD automation
- Maintenance tasks
- Release workflows
- Monitoring automation
- Auto-remediation

---

### 🎬 `coordinator-swarm-init` - Swarm Initialization

**PRIMARY USE**: Swarm setup and initialization

**Key Capabilities**:
- Swarm topology setup (hierarchical, mesh, ring, star)
- Agent configuration
- Communication channel setup
- Resource allocation
- Initial task distribution
- Health check setup

**Diabetactic Examples**:
```bash
# Hierarchical swarm setup
Task("Swarm Initializer", "Initialize hierarchical swarm for release: Queen coordinator, architect (design), backend/frontend developers (implementation), testers (validation), reviewer (quality). Setup communication, resource allocation.", "coordinator-swarm-init")

# Mesh swarm setup
Task("Mesh Initializer", "Initialize mesh swarm for research: 5 researcher agents explore glucose prediction models in parallel. Setup peer-to-peer communication, shared memory, result aggregation.", "coordinator-swarm-init")

# Adaptive swarm setup
Task("Adaptive Initializer", "Initialize adaptive swarm for sprint: Start with 3 agents, auto-scale based on workload (max 10), switch topology as needed (mesh → hierarchical), monitor performance.", "coordinator-swarm-init")
```

**Best For**:
- Swarm initialization
- Topology setup
- Agent configuration
- Communication setup
- Resource planning

---

### 📝 `implementer-sparc-coder` - SPARC Implementation

**PRIMARY USE**: SPARC-based code implementation (Completion phase)

**Key Capabilities**:
- SPARC methodology implementation
- Code generation from specifications
- Test-driven development (TDD)
- Iterative development
- Quality assurance
- Documentation generation

**Diabetactic Examples**:
```bash
# SPARC implementation
Task("SPARC Implementer", "Implement glucose export feature using SPARC: Follow specification (S), implement algorithm (P), use architecture (A), apply refinements (R), code with TDD (C). Generate tests and docs.", "implementer-sparc-coder")

# TDD implementation
Task("TDD Implementer", "Implement appointment booking with TDD: Write acceptance test (E2E) → component tests → service tests → implement code to pass tests → refactor → document. Follow SPARC.", "implementer-sparc-coder")

# Iterative development
Task("Iterative Developer", "Implement service orchestrator iteratively: Iteration 1 (basic saga), Iteration 2 (compensating transactions), Iteration 3 (retry logic), Iteration 4 (monitoring). Follow SPARC phases.", "implementer-sparc-coder")
```

**Best For**:
- SPARC Completion phase (C)
- TDD implementation
- Iterative development
- Quality-focused coding
- Documentation generation

**SPARC Phase**: Completion (C)

---

### 💾 `memory-coordinator` - Memory Management

**PRIMARY USE**: Distributed memory coordination

**Key Capabilities**:
- Memory pool management
- Data consistency coordination
- Cache management
- Persistence strategies
- Memory optimization
- Cross-agent knowledge sharing

**Diabetactic Examples**:
```bash
# Shared knowledge
Task("Memory Manager", "Manage shared knowledge: Store API contracts, design decisions, refactoring patterns, test utilities. Enable agents to access relevant knowledge for tasks.", "memory-coordinator")

# Context preservation
Task("Context Manager", "Preserve project context: Store glucose data model, authentication flow, sync strategy, service patterns. Enable new agents to get up to speed quickly.", "memory-coordinator")

# Learning history
Task("Learning Manager", "Maintain learning history: Record successful implementations (saga pattern, offline sync), failed approaches, refactoring strategies. Enable agents to learn from past.", "memory-coordinator")
```

**Best For**:
- Knowledge sharing
- Context preservation
- Learning systems
- Multi-session coordination
- Agent onboarding

---

### 🎯 `orchestrator-task` - Task Orchestration

**PRIMARY USE**: Complex task coordination and management

**Key Capabilities**:
- Task decomposition (epic → story → task)
- Dependency management
- Resource scheduling
- Progress tracking
- Result aggregation
- Parallel execution

**Diabetactic Examples**:
```bash
# Feature orchestration
Task("Task Orchestrator", "Orchestrate tele-appointment feature: Break into tasks (UI, video integration, backend API, tests). Manage dependencies (UI depends on API), schedule agents, track progress, aggregate results.", "orchestrator-task")

# Parallel execution
Task("Parallel Orchestrator", "Orchestrate parallel refactoring: Assign 5 coders to refactor different services simultaneously (ReadingsService, AppointmentService, AuthService, ProfileService, SyncService). Coordinate, avoid conflicts.", "orchestrator-task")

# Dependency management
Task("Dependency Manager", "Manage task dependencies: Backend API → Frontend client → Mobile integration → E2E tests. Schedule in order, handle blockers, track critical path, optimize parallelization.", "orchestrator-task")
```

**Best For**:
- Complex tasks (10+ subtasks)
- Dependency management
- Parallel execution
- Progress tracking
- Resource scheduling

---

### 📊 `performance-analyzer` - Performance Analysis

**PRIMARY USE**: System and application performance analysis

**Key Capabilities**:
- Performance profiling
- Bottleneck identification
- Resource utilization analysis (CPU, memory, network)
- Optimization recommendations
- Performance reporting
- Trend analysis

**Diabetactic Examples**:
```bash
# Performance profiling
Task("Performance Profiler", "Profile Diabetactic performance: Analyze page load time, bundle size, API latency, IndexedDB query time, rendering performance. Identify bottlenecks, recommend optimizations.", "performance-analyzer")

# Resource analysis
Task("Resource Analyzer", "Analyze resource usage: CPU usage (change detection), memory usage (observables), network usage (API calls), battery usage (mobile). Optimize high-usage areas.", "performance-analyzer")

# Trend analysis
Task("Trend Analyzer", "Analyze performance trends: Track performance metrics over time (daily builds), detect regressions, identify improvements, forecast future performance, alert on anomalies.", "performance-analyzer")
```

**Best For**:
- Performance analysis
- Bottleneck identification
- Resource optimization
- Trend analysis
- Performance monitoring

---

### 🔄 `sparc-coordinator` - SPARC Coordination

**PRIMARY USE**: SPARC methodology coordination

**Key Capabilities**:
- SPARC phase coordination (S → P → A → R → C)
- Process orchestration
- Quality gate management
- Milestone tracking
- Deliverable coordination
- Phase transition management

**Diabetactic Examples**:
```bash
# SPARC workflow
Task("SPARC Coordinator", "Coordinate SPARC workflow for glucose export: Phase S (specify requirements) → Phase P (design algorithm) → Phase A (architecture) → Phase R (refine) → Phase C (implement with TDD). Manage transitions.", "sparc-coordinator")

# Quality gates
Task("Gate Manager", "Manage SPARC quality gates: Specification complete (acceptance criteria defined) → Pseudocode reviewed (complexity analyzed) → Architecture approved (patterns validated) → Refinement done (optimized) → Code passes tests (90% coverage).", "sparc-coordinator")

# Multi-feature coordination
Task("Multi-Feature SPARC", "Coordinate SPARC for multiple features: Glucose export (in Phase C), Appointment booking (in Phase A), Profile settings (in Phase S). Manage dependencies, resource allocation, timeline.", "sparc-coordinator")
```

**Best For**:
- SPARC workflows
- Quality gate management
- Phase coordination
- Multi-feature projects
- Methodology enforcement

---

### 🚚 `migration-plan` - Migration Planning

**PRIMARY USE**: System and data migration planning

**Key Capabilities**:
- Migration strategy development
- Risk assessment
- Timeline planning
- Resource allocation
- Rollback planning
- Data migration planning

**Diabetactic Examples**:
```bash
# Angular migration
Task("Migration Planner", "Plan Angular 20 migration: Assess breaking changes, estimate effort, plan phased rollout (dev → staging → production), define rollback strategy, identify risks (deprecated APIs).", "migration-plan")

# Standalone migration
Task("Component Migration Planner", "Plan module → standalone migration: Prioritize by dependency order (leaf components first), estimate effort (50 components × 2h), plan testing strategy, coordinate with team.", "migration-plan")

# Data migration
Task("Data Migration Planner", "Plan IndexedDB schema migration: Version 2 → 3 (add sync metadata), write migration script, test with production data snapshot, plan rollback, monitor post-migration.", "migration-plan")
```

**Best For**:
- Migration planning
- Risk assessment
- Timeline estimation
- Rollback strategies
- Data migrations

---

## 🔄 Agent Coordination Patterns

### Pattern 1: Hierarchical (Queen-Led)

**Structure**:
```
Queen (hierarchical-coordinator)
├── Architect (system-architect)
├── Workers
│   ├── Coder (coder)
│   ├── Backend Dev (backend-dev)
│   └── Mobile Dev (mobile-dev)
├── Quality
│   ├── Reviewer (reviewer)
│   └── Tester (tester)
└── Specialist
    └── Security (security-analyzer)
```

**Best For**: Large projects (10+ agents), complex features, release coordination

**Example**:
```bash
# Initialize hierarchical swarm
mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 10 }

# Spawn agents via Task tool
Task("Queen Coordinator", "Coordinate tele-appointment feature. Delegate to teams.", "hierarchical-coordinator")
Task("System Architect", "Design video call architecture.", "system-architect")
Task("Backend Developer", "Implement appointment API.", "backend-dev")
Task("Frontend Developer", "Implement UI components.", "coder")
Task("Mobile Developer", "Integrate Capacitor video plugin.", "mobile-dev")
Task("Tester", "Create comprehensive test suite.", "tester")
Task("Reviewer", "Review code quality and security.", "reviewer")
Task("Security Analyst", "Audit HIPAA compliance.", "security-analyzer")
```

---

### Pattern 2: Mesh (Peer-to-Peer)

**Structure**:
```
All agents coordinate directly (no hierarchy):
coder ↔ reviewer ↔ tester ↔ planner
  ↕       ↕       ↕       ↕
researcher ↔ backend-dev ↔ mobile-dev
```

**Best For**: Collaborative work (3-8 agents), research projects, peer reviews

**Example**:
```bash
# Initialize mesh swarm
mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }

# Spawn peer agents via Task tool
Task("Research Agent 1", "Research LSTM models for glucose prediction.", "researcher")
Task("Research Agent 2", "Research Random Forest models.", "researcher")
Task("Research Agent 3", "Research XGBoost models.", "researcher")
Task("Data Analyst", "Analyze glucose dataset patterns.", "code-analyzer")
Task("ML Developer", "Implement best model.", "ml-developer")
Task("Evaluator", "Benchmark all models.", "performance-benchmarker")
```

---

### Pattern 3: Adaptive (Dynamic)

**Structure**:
```
Coordinator (adaptive-coordinator)
├── Dynamic Agent Pool (mesh or hierarchical based on load)
├── Load Balancer (automatic)
├── Performance Monitor (performance-benchmarker)
└── Auto-scaling Logic (add/remove agents)
```

**Best For**: Variable workloads, complex projects, uncertain scope

**Example**:
```bash
# Initialize adaptive swarm
mcp__claude-flow__swarm_init { topology: "adaptive", maxAgents: 15, strategy: "adaptive" }

# Spawn adaptive coordinator via Task tool
Task("Adaptive Manager", "Manage sprint execution. Start with mesh for research, switch to hierarchical for implementation. Auto-scale based on workload (current: 3 agents, max: 15). Monitor performance and adjust topology.", "adaptive-coordinator")

# Agents are spawned dynamically by the adaptive coordinator
```

---

### Pattern 4: Ring (Sequential Processing)

**Structure**:
```
Agent 1 → Agent 2 → Agent 3 → Agent 4 → Agent 1
(Each agent processes and passes to next)
```

**Best For**: Pipeline processing, sequential workflows, data transformation

**Example**:
```bash
# Initialize ring swarm
mcp__claude-flow__swarm_init { topology: "ring", maxAgents: 5 }

# Spawn pipeline agents via Task tool
Task("Specification Agent", "Define requirements. Pass to pseudocode agent.", "specification")
Task("Pseudocode Agent", "Design algorithm. Pass to architecture agent.", "pseudocode")
Task("Architecture Agent", "Design system. Pass to refinement agent.", "architecture")
Task("Refinement Agent", "Optimize design. Pass to implementation agent.", "refinement")
Task("Implementation Agent", "Code with TDD. Pass to specification agent for next feature.", "implementer-sparc-coder")
```

---

## 🎯 Agent Selection Workflow

### Step 1: Identify Task Type

**Development Tasks**:
- **Feature**: `planner` → `system-architect` → `coder` → `tester` → `reviewer`
- **Bug Fix**: `code-analyzer` → `coder` → `tester` → `reviewer`
- **Refactoring**: `refactoring-specialist` → `coder` → `tester` → `reviewer`
- **Performance**: `perf-analyzer` → `coder` → `performance-benchmarker` → `reviewer`

**Testing Tasks**:
- **Unit Tests**: `unit-test-specialist`
- **Integration Tests**: `integration-tester`
- **E2E Tests**: `e2e-automation`
- **TDD Workflow**: `tdd-london-swarm`

**Architecture Tasks**:
- **System Design**: `system-architect` → `architecture` (SPARC)
- **Migration**: `migration-plan` → `system-architect`
- **Service Design**: `backend-dev` + `system-architect`

**GitHub Tasks**:
- **PR Management**: `pr-manager` or `code-review-swarm`
- **Release**: `release-manager` + `cicd-engineer`
- **Issue Triage**: `issue-tracker`
- **Automation**: `workflow-automation`

---

### Step 2: Choose Coordination Pattern

**Small Task (1-3 agents)**: No coordinator, direct agent spawning

**Medium Task (4-8 agents)**: Mesh or hierarchical

**Large Task (9+ agents)**: Hierarchical or adaptive

**Research Task**: Mesh or collective-intelligence

**Security-Critical**: Byzantine or Raft

---

### Step 3: Spawn Agents Concurrently

**ALWAYS use Claude Code's Task tool for parallel agent execution**:

```bash
# ✅ CORRECT: Batch all agents in single message
[Single Message]:
  Task("Agent 1", "Full instructions...", "agent-type-1")
  Task("Agent 2", "Full instructions...", "agent-type-2")
  Task("Agent 3", "Full instructions...", "agent-type-3")
  Task("Agent 4", "Full instructions...", "agent-type-4")
  Task("Agent 5", "Full instructions...", "agent-type-5")

  TodoWrite { todos: [8-10 todos] }

  Write "file1.ts"
  Write "file2.ts"
  Write "file3.ts"

# ❌ WRONG: Sequential agent spawning
Message 1: Task("Agent 1")
Message 2: Task("Agent 2")
Message 3: Task("Agent 3")
```

---

## 📊 Diabetactic Agent Priority Matrix

### Tier 1: Essential Agents (Use Daily)

| Agent | Use Case | Frequency |
|-------|----------|-----------|
| `coder` | Feature implementation | Daily |
| `tester` | Unit test creation | Daily |
| `reviewer` | Code review | Daily |
| `mobile-dev` | Ionic/Capacitor features | Daily |
| `backend-dev` | API integration | Daily |

### Tier 2: Regular Agents (Use Weekly)

| Agent | Use Case | Frequency |
|-------|----------|-----------|
| `system-architect` | Architecture design | Weekly |
| `e2e-automation` | E2E test creation | Weekly |
| `pr-manager` | PR automation | Weekly |
| `perf-analyzer` | Performance optimization | Weekly |
| `api-docs` | API documentation | Weekly |

### Tier 3: Specialized Agents (Use As Needed)

| Agent | Use Case | Frequency |
|-------|----------|-----------|
| `security-analyzer` | Security audits | Bi-weekly |
| `ml-developer` | ML features | Monthly |
| `migration-plan` | Migrations | As needed |
| `production-validator` | Pre-release validation | Per release |
| `cicd-engineer` | CI/CD optimization | Monthly |

### Tier 4: Coordination Agents (Use for Complex Tasks)

| Agent | Use Case | Frequency |
|-------|----------|-----------|
| `hierarchical-coordinator` | Large features | As needed |
| `sparc-coordinator` | SPARC workflows | As needed |
| `code-review-swarm` | Complex reviews | As needed |
| `adaptive-coordinator` | Variable workloads | As needed |

---

## 🚀 Quick Start Examples

### Example 1: Implement New Feature

```bash
# Single message with all agents
[Glucose Export Feature]:

  # Planning
  Task("Feature Planner", "Plan glucose export feature: break into tasks (UI, API, tests), estimate timeline (1 week), identify risks (data privacy, large files). Create implementation roadmap.", "planner")

  # Architecture
  Task("Solution Architect", "Design export architecture: define export formats (PDF/CSV/Excel), API endpoints, data transformation, file generation, download mechanism. Document architecture.", "system-architect")

  # Implementation
  Task("Backend Developer", "Implement export API: POST /api/export with date range, format parameter. Generate file, return download URL. Add rate limiting, validation, error handling.", "backend-dev")

  Task("Frontend Developer", "Implement export UI: Add export button to readings page, date range picker, format selector, progress indicator, download handler. Use Ionic components.", "coder")

  Task("Mobile Developer", "Integrate Capacitor Filesystem: Save exported file to device storage, handle permissions, add share functionality, test on Android.", "mobile-dev")

  # Testing
  Task("Unit Test Engineer", "Create unit tests: API service tests (mock HTTP), component tests (mock API), test all formats, error handling, edge cases. Target 95% coverage.", "tester")

  Task("E2E Engineer", "Create E2E test: Login → open readings → select date range → export CSV → verify download → logout. Test on desktop + mobile.", "e2e-automation")

  # Quality
  Task("Code Reviewer", "Review export implementation: Check data privacy (PHI handling), performance (large datasets), error handling, accessibility, HIPAA compliance.", "reviewer")

  Task("Security Auditor", "Security review: Audit export for data leaks, authentication, authorization, rate limiting, file access controls. Verify HIPAA compliance.", "security-analyzer")

  # Documentation
  Task("API Documenter", "Document export API: OpenAPI spec, request/response examples, error codes, rate limits, usage guide. Update developer docs.", "api-docs")

  # Todos (batch all together)
  TodoWrite { todos: [
    {content: "Plan export feature", status: "in_progress", activeForm: "Planning export feature"},
    {content: "Design architecture", status: "pending", activeForm: "Designing architecture"},
    {content: "Implement API", status: "pending", activeForm: "Implementing API"},
    {content: "Implement UI", status: "pending", activeForm: "Implementing UI"},
    {content: "Mobile integration", status: "pending", activeForm: "Integrating mobile"},
    {content: "Unit tests", status: "pending", activeForm: "Writing unit tests"},
    {content: "E2E tests", status: "pending", activeForm: "Writing E2E tests"},
    {content: "Code review", status: "pending", activeForm: "Reviewing code"},
    {content: "Security audit", status: "pending", activeForm: "Auditing security"},
    {content: "Documentation", status: "pending", activeForm: "Writing documentation"}
  ]}
```

---

### Example 2: Code Review Workflow

```bash
# Single message with review agents
[Review Appointment Booking PR]:

  # Multi-agent code review swarm
  Task("Security Reviewer", "Review appointment booking for security: Check authentication, authorization, HIPAA compliance (PHI access logs), input validation, XSS prevention, SQL injection. Report vulnerabilities.", "security-analyzer")

  Task("Performance Reviewer", "Review for performance: Analyze database queries (N+1 queries?), API latency, caching opportunities, bundle size impact, memory leaks. Recommend optimizations.", "perf-analyzer")

  Task("Code Quality Reviewer", "Review code quality: Check TypeScript strictness, Angular best practices, RxJS patterns, component architecture, test coverage (>90%), documentation. Suggest improvements.", "reviewer")

  Task("Mobile Reviewer", "Review mobile integration: Check Capacitor plugin usage, Android permissions, platform detection, offline handling, error handling, mobile performance.", "mobile-dev")

  Task("Test Reviewer", "Review test coverage: Analyze unit tests (all paths covered?), integration tests (API contracts?), E2E tests (critical paths?). Identify gaps.", "tester")

  Task("Accessibility Reviewer", "Review accessibility: Check ARIA labels, keyboard navigation, color contrast, screen reader support, focus management. Verify WCAG 2.1 AA compliance.", "reviewer")

  # Consensus building
  Task("Review Coordinator", "Aggregate review findings: Compile all reviews, prioritize issues (critical/high/medium/low), build consensus on required changes, approve or request changes.", "code-review-swarm")

  # Todos
  TodoWrite { todos: [
    {content: "Security review", status: "in_progress", activeForm: "Reviewing security"},
    {content: "Performance review", status: "in_progress", activeForm: "Reviewing performance"},
    {content: "Code quality review", status: "in_progress", activeForm: "Reviewing code quality"},
    {content: "Mobile review", status: "in_progress", activeForm: "Reviewing mobile"},
    {content: "Test coverage review", status: "in_progress", activeForm: "Reviewing tests"},
    {content: "Accessibility review", status: "in_progress", activeForm: "Reviewing accessibility"},
    {content: "Aggregate findings", status: "pending", activeForm: "Aggregating findings"},
    {content: "Build consensus", status: "pending", activeForm: "Building consensus"}
  ]}
```

---

### Example 3: SPARC TDD Workflow

```bash
# Single message with SPARC agents
[SPARC TDD: Glucose Statistics Dashboard]:

  # Phase S: Specification
  Task("Specification Agent", "Specify glucose statistics dashboard: Define requirements (average, median, SD, CV, time-in-range), acceptance criteria (accurate calculations, real-time updates), user stories, HIPAA requirements.", "specification")

  # Phase P: Pseudocode
  Task("Pseudocode Agent", "Design statistics algorithm: Calculate average (sum/count), median (sorted middle), SD (sqrt(variance)), CV (SD/mean*100), TIR (percentage in 70-180 mg/dL). Handle edge cases (empty data, outliers). Optimize O(n).", "pseudocode")

  # Phase A: Architecture
  Task("Architecture Agent", "Design dashboard architecture: StatisticsService (calculation), DashboardComponent (UI), ReadingsService (data), IndexedDB (storage). Define interfaces, data flow, caching strategy.", "architecture")

  # Phase R: Refinement
  Task("Refinement Agent", "Refine design: Optimize calculations (incremental updates, memoization), add caching (TTL=5min), improve UX (loading states, error handling), enhance accessibility (ARIA labels).", "refinement")

  # Phase C: Completion (TDD)
  Task("TDD Implementer", "Implement with TDD: 1) Write acceptance test (E2E), 2) Write component tests, 3) Write service tests, 4) Implement code to pass tests, 5) Refactor, 6) Document. Target 95% coverage.", "implementer-sparc-coder")

  # Supporting agents
  Task("SPARC Coordinator", "Coordinate SPARC phases: Ensure each phase complete before next, manage quality gates (spec approved, pseudocode reviewed, architecture validated, refinement done, code tested), track progress.", "sparc-coordinator")

  # Todos
  TodoWrite { todos: [
    {content: "SPARC Phase S: Specification", status: "in_progress", activeForm: "Specifying requirements"},
    {content: "SPARC Phase P: Pseudocode", status: "pending", activeForm: "Designing algorithm"},
    {content: "SPARC Phase A: Architecture", status: "pending", activeForm: "Designing architecture"},
    {content: "SPARC Phase R: Refinement", status: "pending", activeForm: "Refining design"},
    {content: "SPARC Phase C: Completion (TDD)", status: "pending", activeForm: "Implementing with TDD"},
    {content: "Write acceptance test", status: "pending", activeForm: "Writing acceptance test"},
    {content: "Write component tests", status: "pending", activeForm: "Writing component tests"},
    {content: "Write service tests", status: "pending", activeForm: "Writing service tests"},
    {content: "Implement code", status: "pending", activeForm: "Implementing code"},
    {content: "Refactor and document", status: "pending", activeForm: "Refactoring and documenting"}
  ]}
```

---

## 🔍 Agent Capabilities Matrix

### TypeScript/Angular Capabilities

| Agent | TypeScript | Angular | RxJS | Testing | Architecture |
|-------|-----------|---------|------|---------|--------------|
| `coder` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| `mobile-dev` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| `backend-dev` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `system-architect` | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| `reviewer` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `tester` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

### Ionic/Mobile Capabilities

| Agent | Ionic | Capacitor | Android | iOS | PWA |
|-------|-------|-----------|---------|-----|-----|
| `mobile-dev` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `coder` | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| `e2e-automation` | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| `performance-benchmarker` | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### Healthcare/HIPAA Capabilities

| Agent | HIPAA | Security | Privacy | Compliance | Audit |
|-------|-------|----------|---------|------------|-------|
| `security-analyzer` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `reviewer` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| `production-validator` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 📚 Additional Resources

### Documentation
- [Claude-Flow GitHub](https://github.com/ruvnet/claude-flow)
- [Agent API Reference](/tmp/claude-flow-docs/docs/API_DOCUMENTATION.md)
- [Swarm Coordination Guide](/tmp/claude-flow-docs/docs/SWARM_DOCUMENTATION.md)

### Diabetactic-Specific
- [CLAUDE.md](/home/julito/TPP/diabetactic-extServices-20251103-061913/diabetactic/CLAUDE.md) - Project configuration
- [Architecture Guide](../ARCHITECTURE.md) - If exists
- [Testing Guide](../docs/TESTING.md) - If exists

### Support
- GitHub Issues: https://github.com/ruvnet/claude-flow/issues
- Diabetactic Team: Internal Slack

---

## 🎯 Next Steps

1. **Familiarize with Tier 1 agents** (coder, tester, reviewer, mobile-dev, backend-dev)
2. **Practice agent spawning** with Claude Code's Task tool (parallel execution)
3. **Use coordination patterns** (hierarchical for large tasks, mesh for small)
4. **Follow SPARC methodology** for complex features
5. **Leverage specialized agents** (security-analyzer for audits, perf-analyzer for optimization)

---

<div align="center">

**🤖 65+ Specialized Agents • 🏥 Healthcare-Focused • 🚀 Production-Ready**

[⬆ Back to Top](#-diabetactic-agent-reference-guide)

</div>
