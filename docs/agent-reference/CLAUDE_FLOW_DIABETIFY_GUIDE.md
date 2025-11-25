# Claude Flow - Guía Completa para Diabetactic

## 🎯 Resumen Ejecutivo

Claude Flow es un sistema de orquestación multi-agente que **revoluciona el desarrollo** con:

- **84.8% SWE-Bench score** (líder en la industria)
- **2.8-4.4x más rápido** que desarrollo tradicional
- **65+ agentes especializados** para Angular/TypeScript/Ionic
- **112 herramientas MCP** para coordinación
- **96-164x más rápido** búsqueda de patrones con AgentDB
- **90%+ cobertura de tests** con TDD automatizado

---

## 📋 Tabla de Contenidos

1. [Instalación Rápida](#instalación-rápida)
2. [Conceptos Clave](#conceptos-clave)
3. [Metodología SPARC](#metodología-sparc)
4. [Agentes Esenciales](#agentes-esenciales)
5. [Coordinación de Swarms](#coordinación-de-swarms)
6. [Ejemplos Prácticos Diabetactic](#ejemplos-prácticos-diabetactic)
7. [AgentDB y Memoria](#agentdb-y-memoria)
8. [GitHub Integration](#github-integration)
9. [Mejores Prácticas](#mejores-prácticas)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Instalación Rápida

```bash
cd /home/julito/TPP/diabetactic-extServices-20251103-061913/diabetactic

# Instalar Claude Flow
npm install -D claude-flow@alpha

# Inicializar configuración
npx claude-flow@alpha init --force

# Verificar instalación
npx claude-flow@alpha --version
npx claude-flow@alpha sparc modes
```

### Configuración para Diabetactic

Crear `.claude-flow.json`:

```json
{
  "version": "2.7.1",
  "project": {
    "name": "diabetactic",
    "type": "angular-ionic",
    "language": "typescript",
    "testFramework": "jasmine",
    "e2eFramework": "playwright"
  },
  "agentProfiles": {
    "diabetactic-feature": {
      "agents": ["system-architect", "backend-dev", "coder", "mobile-dev", "tester", "reviewer"],
      "topology": "hierarchical",
      "maxAgents": 10
    },
    "diabetactic-testing": {
      "agents": ["tester", "e2e-automation", "integration-tester"],
      "topology": "mesh",
      "maxAgents": 5
    },
    "diabetactic-research": {
      "agents": ["researcher", "code-analyzer", "perf-analyzer"],
      "topology": "mesh",
      "maxAgents": 6
    }
  },
  "memory": {
    "backend": "sqlite",
    "namespace": "diabetactic",
    "cacheSizeMB": 512,
    "compressionEnabled": true,
    "retentionDays": 90
  },
  "performance": {
    "optimization": {
      "batchProcessing": true,
      "asyncExecution": true,
      "agentPooling": true
    }
  },
  "testing": {
    "coverage": {
      "target": 90,
      "enforce": true
    },
    "frameworks": {
      "unit": "jasmine",
      "integration": "jasmine",
      "e2e": "playwright"
    }
  }
}
```

---

## 💡 Conceptos Clave

### Distinción Crítica: MCP Tools vs Claude Code Task Tool

#### MCP Tools = SOLO Coordinación
```bash
# MCP define la estrategia, no ejecuta
mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 8 }
mcp__claude-flow__agent_spawn { type: "coder" }
mcp__claude-flow__memory_usage { action: "store", key: "api-contract" }
```

#### Claude Code Task Tool = TODA la Ejecución
```bash
# Task tool spawns agentes REALES que hacen el trabajo
Task("Backend Developer", "Implementar AppointmentService con CRUD", "backend-dev")
Task("Test Engineer", "Crear tests Jasmine con 90% coverage", "tester")
Task("Code Reviewer", "Revisar TypeScript strict mode compliance", "reviewer")
```

### Regla de Oro: "1 Mensaje = Todas las Operaciones Relacionadas"

**✅ CORRECTO (Ejecución Paralela):**
```javascript
[Single Message]:
  // Spawn TODOS los agentes en un solo mensaje
  Task("Architect", "Diseñar API contracts...", "system-architect")
  Task("Backend Dev 1", "Implementar glucoserver...", "backend-dev")
  Task("Backend Dev 2", "Implementar appointments...", "backend-dev")
  Task("Frontend Dev 1", "Build appointments page...", "coder")
  Task("Frontend Dev 2", "Build readings page...", "coder")
  Task("Test Engineer", "Create comprehensive tests...", "tester")
  Task("Reviewer", "Review code quality...", "reviewer")

  // TODOS los todos en una sola llamada
  TodoWrite { todos: [...8-10 todos...] }

  // TODAS las operaciones de archivos juntas
  Write "backend/appointments.service.ts"
  Write "frontend/appointments.page.ts"
  Write "tests/appointments.spec.ts"
```

**❌ INCORRECTO (Mensajes Múltiples):**
```javascript
Mensaje 1: Task("agent 1")
Mensaje 2: Task("agent 2")
Mensaje 3: TodoWrite { todo 1 }
Mensaje 4: Write "file.ts"
// ¡Esto rompe la coordinación paralela!
```

---

## 🏗️ Metodología SPARC

SPARC = **S**pecification → **P**seudocode → **A**rchitecture → **R**efinement → **C**ompletion

### Fase 1: Specification (Especificación)

```bash
# Analizar requisitos para nueva feature
npx claude-flow@alpha sparc run specification \
  "Sistema de citas médicas con videollamadas y compartir glucosa"

# Resultado: spec.md con:
# - Requisitos funcionales
# - Casos de uso
# - Modelos de datos
# - API contracts
# - Criterios de aceptación
```

### Fase 2: Pseudocode (Diseño de Algoritmos)

```bash
# Diseñar lógica de negocio
npx claude-flow@alpha sparc run pseudocode \
  "Lógica de booking de citas con validación de disponibilidad"

# Resultado: pseudocode.md con:
# - Algoritmos paso a paso
# - Estructuras de datos
# - Edge cases
# - Complejidad temporal
```

### Fase 3: Architecture (Arquitectura)

```bash
# Diseñar arquitectura del sistema
npx claude-flow@alpha sparc run architect \
  "Arquitectura de microservicios para citas médicas"

# Resultado: architecture.md con:
# - Diagramas de componentes
# - Patrones de diseño (SAGA, API Gateway)
# - Decisiones técnicas (BehaviorSubjects, Promises)
# - Integraciones (ApiGatewayService)
```

### Fase 4: Refinement (TDD Implementation)

```bash
# Workflow TDD completo (75 minutos, 5 fases)
npx claude-flow@alpha sparc tdd \
  "Appointment booking con date picker y doctor selection" \
  --test-framework jasmine \
  --coverage 90

# Fases automáticas:
# 1. Test Planning (10 min) - Mocks, stubs, test cases
# 2. RED (20 min) - Escribir tests que fallan
# 3. GREEN (20 min) - Implementación mínima
# 4. REFACTOR (15 min) - Optimizar código
# 5. Documentation (10 min) - JSDoc + README
```

### Fase 5: Completion (Integración)

```bash
# Integrar con sistema existente
npx claude-flow@alpha sparc run integration \
  "Integrar appointment booking con ApiGatewayService y Dexie"

# Resultado: integration.md con:
# - Tests de integración
# - Validación end-to-end
# - Documentación de API
# - Guía de deployment
```

### Comandos Batch (Ejecución Paralela)

```bash
# Ejecutar múltiples modos en paralelo (3-5x más rápido)
npx claude-flow@alpha sparc batch \
  specification,architecture,pseudocode \
  "Complete appointment system with video calls"

# Pipeline secuencial con context chaining
npx claude-flow@alpha sparc pipeline \
  "Build appointment system from scratch"
```

---

## 👥 Agentes Esenciales para Diabetactic

### Tier 1: Uso Diario (10 agentes)

#### 1. **coder** - Implementación Angular/TypeScript
```bash
Task("Angular Developer", `
  Implementar AppointmentCreatePage:
  - Ionic components con Material Design
  - FormBuilder con validaciones
  - Spanish-first i18n (es.json)
  - BehaviorSubject para estado
  - Integración con AppointmentService (Promises, NO Observables)
  - Standalone component pattern

  Seguir convenciones Diabetactic:
  - Property names: value/units/time (NO glucoseValue)
  - Service methods return Promises
  - Use test-builders.ts for test data
`, "coder")
```

#### 2. **mobile-dev** - Especialista Ionic/Capacitor
```bash
Task("Ionic Developer", `
  Implementar glucose photo capture:
  - Capacitor Camera API
  - Platform-specific paths (Android: 10.0.2.2:8000)
  - Offline-first con Dexie
  - ion-modal, ion-datetime components
  - Responsive design (tablet, phone)
`, "mobile-dev")
```

#### 3. **tester** - Jasmine/Playwright Tests
```bash
Task("Test Engineer", `
  Crear comprehensive test suite:

  Unit Tests (Jasmine/Karma):
  - Use jasmine.createSpyObj for mocks
  - Promises (NO Observables) en service mocks
  - GlucoseReadingBuilder, StatisticsBuilder
  - fakeAsync + tick() para async
  - 90%+ coverage

  Integration Tests:
  - DOM helpers: queryIonicComponent(), clickElement()
  - State: BehaviorSubject patterns
  - Demo mode: DNI 1000, password "tuvieja"

  E2E Tests (Playwright):
  - Complete user journeys
  - Multi-page flows
  - Android emulator tests
`, "tester")
```

#### 4. **reviewer** - Code Quality & Security
```bash
Task("Code Reviewer", `
  Review completo:

  TypeScript:
  - Strict mode compliance
  - Proper type annotations (NO 'any')
  - Correct model property names

  Angular:
  - Standalone components (NO modules)
  - Proper lifecycle hooks
  - Change detection optimization

  Ionic:
  - Material Design consistency
  - ion-* component usage
  - Platform-specific code

  Security:
  - XSS prevention
  - Input validation
  - Auth token management

  Diabetactic Conventions:
  - Spanish-first translations
  - Promises (NO Observables in services)
  - offline-first patterns
`, "reviewer")
```

#### 5. **backend-dev** - Node.js/Express APIs
```bash
Task("Backend Developer", `
  Implementar appointments microservice:
  - Express routes (CRUD operations)
  - PostgreSQL schema con migrations
  - JWT authentication
  - Video call integration (WebRTC)
  - HIPAA compliance (logging, encryption)
  - Docker Compose setup

  Integration:
  - API Gateway routing
  - CORS configuration
  - Rate limiting
  - Error handling middleware
`, "backend-dev")
```

#### 6. **system-architect** - System Design
```bash
Task("System Architect", `
  Diseñar appointment booking system:

  API Contracts:
  - RESTful endpoints
  - Request/response models
  - Error codes
  - Versioning strategy

  State Management:
  - BehaviorSubject patterns
  - Cache strategy (L1: memory, L2: IndexedDB, L3: SQLite)
  - Offline-first sync

  Integration:
  - ApiGatewayService routing
  - ServiceOrchestrator SAGA patterns
  - Error recovery with retries

  Store decisions in memory:
  Key: "swarm/architecture/appointments/api-contracts"
`, "system-architect")
```

#### 7. **api-docs** - Documentation Generator
```bash
Task("API Documentation Specialist", `
  Generate comprehensive API docs:
  - OpenAPI/Swagger specs
  - Code examples (TypeScript, cURL)
  - Authentication flows
  - Error responses
  - Rate limits
  - Spanish + English versions
`, "api-docs")
```

#### 8. **e2e-automation** - Playwright Specialist
```bash
Task("E2E Test Engineer", `
  Create Playwright test suites:

  User Journeys:
  - Login → Dashboard → Appointments → Book
  - Glucose entry → Sync → Share with doctor
  - Profile management → Settings

  Cross-platform:
  - Chrome, Firefox, WebKit
  - Android emulator
  - Responsive breakpoints

  Configuration:
  - playwright.config.ts
  - Page Object Model
  - Screenshot on failure
  - Video recording
`, "e2e-automation")
```

#### 9. **pr-manager** - GitHub PR Automation
```bash
# Automated PR workflow
npx claude-flow@alpha github pr-manager \
  "review and merge pending PRs" \
  --auto-merge \
  --require-reviews 2 \
  --require-tests-pass
```

#### 10. **code-analyzer** - Code Quality Analysis
```bash
Task("Code Quality Analyzer", `
  Analyze codebase health:
  - Cyclomatic complexity
  - Code duplication
  - Technical debt
  - Dependency analysis
  - Bundle size optimization
  - Unused code detection
`, "code-analyzer")
```

### Tier 2: Semanalmente (8 agentes)

- **perf-analyzer** - Performance profiling
- **integration-tester** - Integration tests
- **cicd-engineer** - GitHub Actions setup
- **code-review-swarm** - Multi-agent reviews
- **production-validator** - Pre-deployment checks
- **issue-tracker** - GitHub issue management
- **release-manager** - Version management
- **sparc-coord** - SPARC workflow orchestration

### Tier 3: Mensualmente (6 agentes)

- **migration-planner** - Code migrations
- **repo-architect** - Multi-repo coordination
- **workflow-automation** - CI/CD optimization
- **multi-repo-swarm** - Submodule sync (extServices)
- **security-manager** - Security audits
- **performance-benchmarker** - Performance testing

---

## 🔄 Coordinación de Swarms

### Topologías Recomendadas para Diabetactic

#### 1. Hierarchical (Features Complejas)

**Usar para**: Features multi-componente (frontend + backend + tests)

```yaml
Topology: Hierarchical
Agents: 8-12
Coordinator: 1 system-architect

Structure:
├── System Architect (1) - Diseño general, API contracts
├── Backend Team (2-3) - Microservices (glucoserver, appointments, auth)
├── Frontend Team (2-3) - Angular/Ionic components
├── Test Team (2) - Unit + E2E tests
└── Code Reviewer (1) - Quality assurance

Use Case: Appointment booking system completo
Duration: 2-3 días → 1 día con swarm
```

**Ejemplo Completo**:

```javascript
[Single Message - Hierarchical Swarm]:
  // Coordination setup (opcional)
  mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 10 }

  // Leadership
  Task("System Architect", `
    Design appointment booking:
    - API contracts (POST /appointments, GET /appointments/:id, etc.)
    - Data models (Appointment interface matching existing models)
    - State management (BehaviorSubjects pattern)
    - Integration points (ApiGatewayService, Dexie)

    Store in memory:
    - Key: "swarm/architecture/appointments/contracts"
    - Key: "swarm/architecture/appointments/models"

    Use hooks:
    - npx claude-flow@alpha hooks pre-task --description "Design appointments"
    - npx claude-flow@alpha hooks post-edit --memory-key "swarm/architecture/appointments"
  `, "system-architect")

  // Backend Team (Parallel)
  Task("Appointments Backend", `
    Implement appointments microservice (extServices/appointments):
    - Express CRUD routes
    - PostgreSQL schema
    - JWT authentication
    - Video call integration

    Check memory for API contracts:
    - npx claude-flow@alpha hooks session-restore --session-id "appointments-backend"

    Store implementation:
    - npx claude-flow@alpha hooks post-edit --file "extServices/appointments/routes.js"
  `, "backend-dev")

  Task("API Gateway Integration", `
    Update API Gateway routing:
    - Add /appointments routes
    - Configure authentication
    - Setup CORS
    - Add rate limiting

    Follow ApiGatewayService pattern from src/app/core/services/api-gateway.service.ts
  `, "backend-dev")

  // Frontend Team (Parallel)
  Task("Appointments List Page", `
    Build src/app/appointments/appointments.page.ts:
    - Ionic components (ion-list, ion-card, ion-fab)
    - Material Design (mat-icon)
    - Spanish-first i18n ({{ 'appointments.title' | translate }})
    - BehaviorSubject state
    - AppointmentService integration (Promises!)
    - Standalone component

    Check memory for data models:
    - Key: "swarm/architecture/appointments/models"
  `, "coder")

  Task("Appointment Create Page", `
    Build src/app/appointments/appointment-create/appointment-create.page.ts:
    - FormBuilder with validations
    - ion-datetime for date picker
    - Doctor selection (ion-select)
    - Glucose sharing toggle
    - Success/error handling

    Follow patterns from existing pages
  `, "mobile-dev")

  // Testing Team (Parallel)
  Task("Unit Tests", `
    Create comprehensive Jasmine tests:

    Service Tests (appointment.service.spec.ts):
    - Mock AppointmentService with jasmine.createSpyObj
    - Test methods return Promises (NOT Observables)
    - Use fakeAsync + tick() for async
    - Test error handling

    Component Tests:
    - Mock services, no HTTP calls
    - Test form validations
    - Test navigation
    - Use GlucoseReadingBuilder patterns

    Target: 90%+ coverage
  `, "tester")

  Task("E2E Tests", `
    Create Playwright tests (playwright/appointments.spec.ts):
    - Login flow
    - Navigate to appointments
    - Book new appointment
    - Share glucose data
    - Video call initialization

    Test demo mode:
    - DNI: 1000
    - Password: tuvieja
  `, "e2e-automation")

  // Quality Assurance
  Task("Code Review", `
    Review all code:
    - TypeScript strict mode compliance
    - Correct property names (value/units/time)
    - Promises (NO Observables in services)
    - Spanish-first translations complete
    - Security: XSS prevention, input validation
    - Performance: Change detection, lazy loading

    Generate review report in memory:
    - Key: "swarm/review/appointments/report"
  `, "reviewer")

  // Batch ALL todos
  TodoWrite { todos: [
    {content: "Design API contracts", status: "in_progress", activeForm: "Designing API contracts"},
    {content: "Implement appointments backend", status: "in_progress", activeForm: "Implementing appointments backend"},
    {content: "Update API Gateway", status: "in_progress", activeForm: "Updating API Gateway"},
    {content: "Build appointments list page", status: "in_progress", activeForm: "Building appointments list page"},
    {content: "Build appointment create page", status: "in_progress", activeForm: "Building appointment create page"},
    {content: "Write unit tests (90%+ coverage)", status: "in_progress", activeForm: "Writing unit tests"},
    {content: "Write E2E tests", status: "in_progress", activeForm: "Writing E2E tests"},
    {content: "Code review and quality check", status: "in_progress", activeForm: "Reviewing code quality"},
    {content: "Integration testing", status: "pending", activeForm: "Running integration tests"},
    {content: "Documentation update", status: "pending", activeForm: "Updating documentation"}
  ]}
```

#### 2. Mesh (Decisiones de Arquitectura)

**Usar para**: Decisiones colaborativas, research, análisis

```yaml
Topology: Mesh
Agents: 3-6
Coordination: Consensus-driven

Use Cases:
- State management strategy
- Testing strategy design
- API Gateway architecture
- i18n/translation patterns
- Service orchestration design

Decision Making: Weighted voting, no leader
```

**Ejemplo**:

```javascript
[Single Message - Mesh for Architecture Decision]:
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }

  // Peer reviewers (no hierarchy)
  Task("State Management Analyst", `
    Analyze current BehaviorSubject patterns:
    - Evaluate pros/cons
    - Propose improvements
    - Consider RxJS best practices

    Vote on preferred approach
  `, "code-analyzer")

  Task("Performance Analyst", `
    Analyze performance implications:
    - Change detection impact
    - Memory usage
    - Bundle size

    Vote on preferred approach
  `, "perf-analyzer")

  Task("Testing Analyst", `
    Analyze testability:
    - Mock complexity
    - Test coverage
    - Maintenance burden

    Vote on preferred approach
  `, "tester")

  Task("Angular Expert", `
    Evaluate Angular best practices:
    - Official style guide
    - Community patterns
    - Framework features

    Vote on preferred approach
  `, "reviewer")

  // Consensus reached via weighted voting
```

#### 3. Distributed (Parallel Development)

**Usar para**: Módulos independientes, microservices

```yaml
Topology: Distributed
Agents: 10-20
Coordination: Load-balanced

Use Cases:
- Multi-page development
- Multiple microservices setup
- Test suite creation
- Documentation generation

Benefits: Maximum parallelization, fault tolerance
```

---

## 📚 Ejemplos Prácticos Diabetactic

### Ejemplo 1: Implementar Appointment Creation (COMPLETO)

```bash
# Workflow TDD completo (75 minutos)
npx claude-flow@alpha sparc tdd \
  "Appointment creation page with doctor selection and glucose sharing" \
  --test-framework jasmine \
  --coverage 90

# Esto ejecuta automáticamente:
# 1. Test planning (mocks, stubs, test cases)
# 2. Write failing tests
# 3. Minimal implementation
# 4. Refactor
# 5. Documentation
```

### Ejemplo 2: Fix Tidepool OAuth Bug

```bash
# Debug workflow sistemático
npx claude-flow@alpha sparc run debugger \
  "Tidepool OAuth redirect fails on Android with ERR_UNKNOWN_URL_SCHEME"

# Analiza automáticamente:
# 1. Root cause analysis
# 2. Platform-specific issues (Android vs iOS)
# 3. Código fix (Capacitor Browser plugin)
# 4. Tests de regresión
# 5. Documentation update
```

### Ejemplo 3: Setup CI/CD Pipeline

```bash
# GitHub Actions automation
npx claude-flow@alpha github workflow-auto \
  --repo diabetactic \
  --workflow angular-ionic-ci.yml \
  --triggers "push,pull_request" \
  --jobs "lint,test,build,deploy"

# Genera:
# - .github/workflows/ci.yml
# - Android build configuration
# - Test automation (Karma + Playwright)
# - Deployment scripts
```

### Ejemplo 4: Multi-Service Backend Setup (Paralelo)

```javascript
[Single Message - Distributed Setup]:
  // Initialize distributed coordination
  mcp__claude-flow__swarm_init { topology: "distributed", maxAgents: 15 }

  // Spawn ALL backend services in parallel
  Task("Glucoserver", "Setup glucose API with CRUD + sync", "backend-dev")
  Task("Appointments", "Setup appointments API with video", "backend-dev")
  Task("Auth Service", "Implement OAuth + local auth", "backend-dev")
  Task("API Gateway", "Configure routing + rate limiting", "backend-dev")

  // Database setup
  Task("Database Architect", "Design schemas for all services", "code-analyzer")
  Task("Migration Scripts", "Create Flyway migrations", "backend-dev")

  // Infrastructure
  Task("Docker Setup", "Create docker-compose.yml for all services", "cicd-engineer")
  Task("Kubernetes", "K8s deployment manifests", "cicd-engineer")

  // Testing
  Task("Integration Tests", "Service-to-service communication tests", "integration-tester")
  Task("Load Tests", "Performance benchmarks for all endpoints", "performance-benchmarker")

  // Documentation
  Task("API Docs", "OpenAPI specs for all services", "api-docs")
  Task("Architecture Docs", "System architecture diagrams", "system-architect")

  // Monitoring
  Task("Observability", "Prometheus metrics + Grafana dashboards", "cicd-engineer")
  Task("Logging", "Centralized logging with ELK stack", "backend-dev")

  // Security
  Task("Security Audit", "OWASP top 10 + HIPAA compliance", "security-manager")
```

**Resultado**: 15 servicios configurados en paralelo, **3-5x más rápido** que secuencial.

### Ejemplo 5: Comprehensive Test Suite

```javascript
[Single Message - Testing Swarm]:
  // Mesh topology for collaborative testing
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 8 }

  // Unit Tests (Parallel by module)
  Task("Readings Tests", "Unit tests for ReadingsService + components", "tester")
  Task("Appointments Tests", "Unit tests for AppointmentService + components", "tester")
  Task("Profile Tests", "Unit tests for ProfileService + components", "tester")
  Task("Auth Tests", "Unit tests for UnifiedAuthService", "tester")

  // Integration Tests
  Task("Service Integration", "Integration tests for service orchestration", "integration-tester")
  Task("API Integration", "Integration tests for API Gateway", "integration-tester")

  // E2E Tests
  Task("User Journey E2E", "Complete user journeys with Playwright", "e2e-automation")

  // Test Infrastructure
  Task("Test Utilities", "Update test-builders.ts with new patterns", "tester")

  TodoWrite { todos: [
    {content: "Unit tests for ReadingsService", status: "in_progress", activeForm: "Writing readings tests"},
    {content: "Unit tests for AppointmentService", status: "in_progress", activeForm: "Writing appointment tests"},
    {content: "Unit tests for ProfileService", status: "in_progress", activeForm: "Writing profile tests"},
    {content: "Unit tests for UnifiedAuthService", status: "in_progress", activeForm: "Writing auth tests"},
    {content: "Service integration tests", status: "in_progress", activeForm: "Writing integration tests"},
    {content: "API Gateway integration tests", status: "in_progress", activeForm: "Writing API tests"},
    {content: "E2E user journey tests", status: "in_progress", activeForm: "Writing E2E tests"},
    {content: "Update test utilities", status: "in_progress", activeForm: "Updating test utilities"},
    {content: "Achieve 90%+ coverage", status: "pending", activeForm: "Checking coverage"},
    {content: "Run all tests in CI", status: "pending", activeForm: "Running CI tests"}
  ]}
```

---

## 🧠 AgentDB y Memoria

### Performance de AgentDB

- **96x faster** vector search (9.6ms → <0.1ms)
- **125x faster** batch operations
- **164x faster** large queries (1M vectors)
- **4-32x memory reduction** con quantization

### Casos de Uso para Diabetactic

#### 1. Development Context Management

```bash
# Almacenar decisiones de arquitectura
npx claude-flow@alpha hooks post-edit \
  --file "docs/ARCHITECTURE_DECISIONS.md" \
  --memory-key "architecture/appointments/decisions"

# Buscar decisiones similares
npx claude-flow@alpha memory search \
  --pattern "appointment booking architecture" \
  --namespace "architecture"
```

#### 2. Code Pattern Learning

```typescript
// Store test patterns
await agentdb.store({
  type: 'test-pattern',
  name: 'appointment-service-test',
  code: appointmentTestCode,
  metadata: {
    framework: 'jasmine',
    coverage: 95,
    patterns: ['mock', 'async', 'promise']
  }
});

// Find similar patterns
const similar = await agentdb.vectorSearch({
  query: 'service test with promises',
  topK: 5,
  threshold: 0.8
});
```

#### 3. Bug Pattern Recognition

```bash
# Almacenar solución de bug
npx claude-flow@alpha hooks post-task \
  --task-id "tidepool-oauth-android-fix" \
  --memory-key "bugs/tidepool-oauth/solution"

# Detectar bugs similares
npx claude-flow@alpha memory search \
  --pattern "OAuth redirect Android" \
  --namespace "bugs"
```

#### 4. API Documentation Memory

```bash
# Almacenar quirks de APIs externas
npx claude-flow@alpha memory store \
  --key "api/tidepool/oauth-flow" \
  --value "Requires Custom URL Scheme on Android. Use Capacitor Browser plugin." \
  --namespace "external-apis"

# Retrieve when needed
npx claude-flow@alpha memory retrieve \
  --key "api/tidepool/oauth-flow" \
  --namespace "external-apis"
```

### Memory Namespace Strategy

```
diabetactic/
├── architecture/
│   ├── appointments/contracts
│   ├── appointments/models
│   ├── state-management/patterns
│   └── api-gateway/routing
├── features/
│   ├── appointments/implementation
│   ├── readings/implementation
│   └── profile/implementation
├── bugs/
│   ├── tidepool-oauth/solution
│   └── sync-errors/resolution
├── tests/
│   ├── patterns/service-tests
│   ├── patterns/component-tests
│   └── patterns/e2e-tests
├── external-apis/
│   ├── tidepool/oauth-flow
│   ├── glucoserver/endpoints
│   └── appointments/video-calls
└── devops/
    ├── ci-cd/pipelines
    └── deployment/strategies
```

---

## 🐙 GitHub Integration

### Setup

```bash
# Configurar GitHub integration
npx claude-flow@alpha github init --token YOUR_GITHUB_TOKEN

# Verificar conexión
npx claude-flow@alpha github status
```

### Automated Code Review

```bash
# Multi-agent code review
npx claude-flow@alpha github code-review-swarm --pr 123

# Review criteria:
# - TypeScript strict mode
# - Angular best practices
# - Ionic Material Design
# - Security (XSS, injection)
# - Performance (change detection)
# - Test coverage (90%+)
# - Spanish-first i18n
```

### CI/CD Pipeline Creation

```bash
# Generate GitHub Actions workflow
npx claude-flow@alpha github workflow-auto \
  --repo diabetactic \
  --workflow ci.yml \
  --stages "lint,test,build,deploy"
```

**Resultado** (`.github/workflows/ci.yml`):

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:prod
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: www/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/download-artifact@v3
        with:
          name: dist
      - name: Deploy to production
        run: echo "Deploy to server"
```

### Multi-Repo Sync (extServices)

```bash
# Sync all extServices submodules
npx claude-flow@alpha github multi-repo sync \
  --repos "extServices/api-gateway,extServices/appointments,extServices/glucoserver,extServices/login" \
  --strategy "parallel"
```

### Issue Management

```bash
# Automated issue triage
npx claude-flow@alpha github issue-tracker \
  --repo diabetactic \
  --action "triage" \
  --labels "bug,enhancement,question"
```

### Release Management

```bash
# Automated release with semantic versioning
npx claude-flow@alpha github release-manager \
  --repo diabetactic \
  --version "1.2.0" \
  --changelog-auto \
  --deploy-prod
```

---

## ✅ Mejores Prácticas

### 1. Siempre Usar Batch Operations

```bash
# ✅ CORRECTO: Single message, todas las operaciones
[Single Message]:
  Task("Agent 1", "...", "type1")
  Task("Agent 2", "...", "type2")
  Task("Agent 3", "...", "type3")
  TodoWrite { todos: [...10 todos...] }
  Write "file1.ts"
  Write "file2.ts"
  Write "file3.ts"

# ❌ INCORRECTO: Multiple messages
Message 1: Task("Agent 1")
Message 2: Task("Agent 2")
Message 3: TodoWrite
```

### 2. Usar Hooks para Coordinación

```bash
# ANTES de trabajar
npx claude-flow@alpha hooks pre-task --description "Implement appointments"
npx claude-flow@alpha hooks session-restore --session-id "diabetactic-appointments"

# DURANTE trabajo
npx claude-flow@alpha hooks post-edit \
  --file "src/app/appointments/appointments.page.ts" \
  --memory-key "swarm/appointments/page"

# DESPUÉS de trabajar
npx claude-flow@alpha hooks post-task --task-id "appointments-page"
npx claude-flow@alpha hooks session-end --export-metrics true
```

### 3. Memoria Consistente

```bash
# Usar keys consistentes
"swarm/architecture/[feature]/[aspect]"
"swarm/frontend/[module]/[component]"
"swarm/backend/[service]/[endpoint]"
"swarm/tests/[type]/[suite]"
```

### 4. Matching de Capabilities

```yaml
# Match agente con tech stack
Angular/TypeScript: coder, mobile-dev, reviewer
Node.js/Express: backend-dev, api-docs
Testing: tester, e2e-automation, integration-tester
Architecture: system-architect, code-analyzer
```

### 5. TDD-First

```bash
# Siempre usar SPARC TDD para nuevas features
npx claude-flow@alpha sparc tdd "feature description" \
  --test-framework jasmine \
  --coverage 90
```

### 6. Convenciones Diabetactic

```typescript
// ✅ CORRECTO
interface LocalGlucoseReading {
  value: number;        // NOT glucoseValue
  units: string;        // NOT glucoseUnits
  time: Date;           // NOT timestamp
  notes: string[];      // NOT string
}

// Services return Promises
async getAllReadings(): Promise<PaginatedReadings> {}

// NOT Observables
getAllReadings(): Observable<PaginatedReadings> {} // ❌ WRONG
```

### 7. Spanish-First i18n

```json
// src/assets/i18n/es.json (PRIMARY)
{
  "appointments": {
    "title": "Citas Médicas",
    "book": "Reservar Cita"
  }
}

// src/assets/i18n/en.json (FALLBACK)
{
  "appointments": {
    "title": "Medical Appointments",
    "book": "Book Appointment"
  }
}
```

### 8. Monitoring y Metrics

```bash
# Track performance
npx claude-flow@alpha performance report --period 7d

# Monitor swarm health
npx claude-flow@alpha swarm monitor --interval 5

# Analyze bottlenecks
npx claude-flow@alpha bottleneck analyze --component swarm
```

---

## 🔧 Troubleshooting

### Issue 1: Agent Spawn Failures

**Problema**: Agentes no spawns correctamente

```bash
# Debug mode
export CLAUDE_FLOW_DEBUG=true
export CLAUDE_FLOW_LOG_LEVEL=debug

# Check logs
npx claude-flow@alpha logs --level error --grep "spawn"

# Verify configuration
npx claude-flow@alpha config validate
```

### Issue 2: Memory Overflow

**Problema**: Memoria crece indefinidamente

```bash
# Check memory usage
npx claude-flow@alpha memory stats

# Clear cache
npx claude-flow@alpha memory clear --cache

# Optimize configuration
npx claude-flow@alpha config set memory.cacheSizeMB 256
```

### Issue 3: TypeScript Compilation Errors

**Problema**: Tests fallan por errores de compilación

```bash
# Run diagnostics
npx claude-flow@alpha diagnostics --performance

# Check TypeScript config
npx tsc --noEmit

# Verify model property names
# - Use: value, units, time
# - NOT: glucoseValue, glucoseUnits, timestamp
```

### Issue 4: Test Mocks Return Observables

**Problema**: Service mocks usan Observables en lugar de Promises

```typescript
// ❌ WRONG
readingsService.getAllReadings.and.returnValue(of([...]));

// ✅ CORRECT
readingsService.getAllReadings.and.returnValue(
  Promise.resolve({
    readings: [...],
    total: 10,
    offset: 0,
    limit: 100,
    hasMore: false
  })
);
```

### Issue 5: Hook Execution Failures

**Problema**: Hooks no se ejecutan

```bash
# Verify hooks are enabled
npx claude-flow@alpha config get hooks.enabled

# Test hook manually
npx claude-flow@alpha hooks pre-task --description "test" --verbose

# Check hook logs
npx claude-flow@alpha logs --grep "hooks"
```

---

## 📊 Performance Metrics

### Expected Improvements

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Feature development | 5 días | 2 días | **2.5x más rápido** |
| Bug fixes | 4 horas | 1 hora | **4x más rápido** |
| Test coverage | 65% | 90% | **+38%** |
| Code reviews | 2 horas | 30 min | **4x más rápido** |
| API latency | 500ms | 150ms | **3.3x más rápido** |
| Memory usage | 150MB | 80MB | **-47%** |

### Monitoring

```bash
# Real-time dashboard
npx claude-flow@alpha monitor --dashboard

# Performance report
npx claude-flow@alpha performance report --format json > metrics.json

# Trend analysis
npx claude-flow@alpha trend analyze --metric "task_completion" --period 30d
```

---

## 🎯 Quick Start Checklist

- [ ] Instalar Claude Flow: `npm install -D claude-flow@alpha`
- [ ] Inicializar: `npx claude-flow@alpha init --force`
- [ ] Crear `.claude-flow.json` con configuración Diabetify
- [ ] Test SPARC TDD: `npx claude-flow@alpha sparc tdd "simple feature"`
- [ ] Setup hooks: `npx claude-flow@alpha hooks pre-commit --verify`
- [ ] GitHub integration: `npx claude-flow@alpha github init`
- [ ] First swarm: Spawn 3-5 agents para feature pequeña
- [ ] Monitor performance: `npx claude-flow@alpha monitor`
- [ ] Review metrics: `npx claude-flow@alpha performance report`
- [ ] Optimize: Ajustar topology y agent count basado en métricas

---

## 📚 Referencias Adicionales

### Documentación Completa

1. **SPARC Analysis**: `docs/SPARC_ANALYSIS_HEALTHCARE.md`
2. **Agent Reference**: `docs/DIABETIFY_AGENT_REFERENCE.md`
3. **MCP Tools**: `docs/MCP_TOOLS_QUICK_REFERENCE.md`
4. **Architecture**: `docs/CLAUDE_FLOW_ARCHITECTURE_ANALYSIS.md`
5. **AgentDB**: `docs/AGENTDB_RESEARCH_REPORT.md`

### External Links

- [Claude Flow GitHub](https://github.com/ruvnet/claude-flow)
- [Documentation](https://github.com/ruvnet/claude-flow/tree/main/docs)
- [Release Notes](https://github.com/ruvnet/claude-flow/releases)

---

## 🎉 Resumen

Claude Flow revoluciona el desarrollo de Diabetactic con:

1. **84.8% SWE-Bench score** - Líder en AI orchestration
2. **2.8-4.4x más rápido** - Parallel agent coordination
3. **90%+ test coverage** - Automated TDD workflows
4. **96-164x faster memory** - AgentDB optimization
5. **Zero-shot features** - Natural language activation

**Bottom Line**: Production-ready para Angular/TypeScript/Ionic con enterprise-grade performance, quality assurance, y automation.

---

**Versión**: 1.0.0
**Fecha**: 2025-11-03
**Autor**: Claude Flow Research Team
**Proyecto**: Diabetactic Healthcare Platform
