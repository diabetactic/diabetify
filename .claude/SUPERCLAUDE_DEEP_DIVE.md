# SuperClaude Framework - Deep Understanding

**Created**: 2025-10-10
**Sources**: Context7 MCP (790+ code snippets from /nomenak/superclaude + 394 from superclaude.netlify.app)

---

## 🎯 Core Philosophy

SuperClaude is a **meta-programming framework** that transforms Claude Code into an intelligent orchestration system through:

1. **22 Slash Commands** - Structured workflows for common dev tasks
2. **14 Specialized Agents** - Domain expertise activation
3. **6 Behavioral Modes** - Adaptive communication & coordination
4. **6 MCP Servers** - External tool integration

**Key Principle**: Context accumulation + intelligent tool selection = enhanced productivity

---

## 🔧 MCP Server Integration (The Power Layer)

### Available MCP Servers

| Server                  | Purpose                        | Trigger                                  | API Key               |
| ----------------------- | ------------------------------ | ---------------------------------------- | --------------------- |
| **context7**            | Official library docs          | Import statements, framework keywords    | None                  |
| **sequential-thinking** | Multi-step reasoning           | Complex debugging, architecture analysis | None                  |
| **magic**               | Modern UI generation           | UI component requests, `/ui`             | `TWENTYFIRST_API_KEY` |
| **playwright**          | Browser automation             | E2E testing, visual validation           | None                  |
| **morphllm-fast-apply** | Pattern-based edits            | Bulk transformations, style enforcement  | `MORPH_API_KEY`       |
| **serena**              | Project memory & semantic code | Symbol operations, session persistence   | None                  |

### Configuration (~/.claude.json)

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "magic": {
      "command": "npx",
      "args": ["@21st-dev/magic"],
      "env": { "TWENTYFIRST_API_KEY": "${TWENTYFIRST_API_KEY}" }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "morphllm-fast-apply": {
      "command": "npx",
      "args": ["@morph-llm/morph-fast-apply"],
      "env": { "MORPH_API_KEY": "${MORPH_API_KEY}" }
    },
    "serena": {
      "command": "uv",
      "args": ["run", "serena", "start-mcp-server", "--context", "ide-assistant"],
      "cwd": "$HOME/.claude/serena"
    }
  }
}
```

### Tool Selection Matrix

**Priority**: MCP > Native > Basic

```yaml
Task Type → Best Tool: UI components → magic MCP (21st.dev patterns)
  Deep analysis → sequential-thinking MCP (structured reasoning)
  Code search → claude-context MCP (semantic search)
  Documentation → context7 MCP (official library docs)
  Bulk edits → morphllm MCP (pattern transforms)
  Memory/Session → serena MCP (project context)
```

### MCP Control Flags

```bash
# Enable specific servers
/sc:analyze codebase/ --c7 --seq

# Enable all MCP servers
/sc:design "complex architecture" --all-mcp

# Disable all MCP servers (native only)
/sc:implement "simple function" --no-mcp

# Selective usage
/sc:implement "React component" --magic --c7
```

---

## 🧠 Behavioral Modes (Adaptive Intelligence)

### 1. Brainstorming Mode

**Activation Triggers**:

- Vague requests: "I want to build...", "Thinking about..."
- Exploration keywords: brainstorm, explore, discuss, not sure
- Uncertainty indicators: "maybe", "possibly", "could we"
- Manual: `--brainstorm`

**Behavior Changes**:

- Socratic questioning instead of direct solutions
- Requirements discovery through dialogue
- Non-presumptive approach
- Generates structured requirements briefs

**Example**:

```bash
# Standard: "I'll build auth with JWT..."
# Brainstorm: "🤔 Let's explore:
#   - What user problems does auth solve?
#   - Who are your users?
#   - Existing systems to integrate?
#   - Security requirements?"
```

### 2. Introspection Mode

**Activation Triggers**:

- Self-analysis requests
- Error recovery scenarios
- Complex problem solving
- Manual: `--introspect`

**Behavior Changes**:

- Expose thinking process with transparency markers (🤔, 🎯, ⚡, 📊, 💡)
- Explain decision logic
- Consider alternatives
- Pattern detection

**Example**:

```text
🧠 Meta-Analysis: Why structural analysis over functional flow?
🎯 Decision Logic: Saw class hierarchy → assumed OOP
🔄 Alternative: Data flow might reveal hidden dependencies
📊 Evidence: Imports suggest functional composition
💡 Learning: Analyze imports before choosing strategy
```

### 3. Task Management Mode

**Activation Triggers**:

- Operations >3 steps
- Multi-file/directory scope (>2 dirs OR >3 files)
- Complex dependencies
- Manual: `--task-manage`, `--delegate`

**Behavior Changes**:

- Hierarchical task organization
- Phase-based execution
- Session persistence with Serena MCP
- Quality gates between phases

**Example**:

```text
📋 Multi-Phase Implementation Plan:
🎯 Phase 1: Security Requirements Analysis (Session 1)
🎯 Phase 2: API Design & Documentation (Session 2)
🎯 Phase 3: Implementation & Testing (Session 3-4)
💾 Session persistence: Resume context automatically
✓ Quality gates: Validation before each phase
```

### 4. Orchestration Mode

**Activation Triggers**:

- Multi-tool operations
- Performance constraints (>75% resource usage)
- Parallel execution opportunities
- Manual: `--orchestrate`

**Behavior Changes**:

- Smart tool selection (MCP > Native > Basic)
- Resource-aware adaptation
- Parallel thinking (batch independent operations)
- Efficiency focus

**Example**:

```text
🎯 Multi-Tool Coordination:
🔍 Phase 1: Serena (semantic analysis) + Sequential (architecture)
⚡ Phase 2: Morphllm (edits) + Magic (UI) [PARALLEL]
🧪 Phase 3: Playwright (testing) + Context7 (docs)
```

### 5. Token Efficiency Mode

**Activation Triggers**:

- Context usage >75%
- Large-scale operations
- Manual: `--uc`, `--ultracompressed`

**Behavior Changes**:

- Symbol communication system
- 30-50% token reduction
- Abbreviations with context preservation
- Structured output (bullets, tables)

**Example**:

```text
Standard: "The authentication system has a security vulnerability..."
Compressed: "auth.js:45 → 🛡️ sec risk in user val()"
```

### 6. Deep Research Mode

**Activation Triggers**:

- `/sc:research` command
- Research keywords: investigate, explore, discover
- Questions requiring current information

**Behavior Changes**:

- Systematic investigation
- Evidence over assumption
- Progressive depth (broad → detailed)
- Mandatory confidence scoring

---

## 📜 Slash Commands (22 Commands)

### Core Workflow Commands

```bash
/sc:brainstorm [topic]              # Requirements discovery
/sc:design [system]                 # Architecture design
/sc:implement [feature]             # Feature implementation
/sc:test [--type unit|e2e]         # Testing strategy
/sc:troubleshoot [issue]            # Systematic debugging
/sc:analyze [path] [--focus]       # Code analysis
/sc:improve [path]                  # Code improvements
/sc:document [--type api|arch]     # Documentation
/sc:workflow [plan]                 # Multi-step orchestration
```

### Advanced Commands

```bash
/sc:research [query]                # Deep research with Tavily
/sc:select-tool [operation]         # Intelligent tool selection
/sc:load [project]                  # Session context loading
/sc:save [checkpoint]               # Session persistence
/sc:reflect [--scope project]       # Task reflection
/sc:estimate [task]                 # Development estimates
/sc:cleanup [path]                  # Code cleanup
/sc:build                          # Build orchestration
```

---

## 🤖 Specialized Agents (14 Core)

### Backend Development

- `@agent-backend-architect` - API design, microservices
- `@agent-python-expert` - Python best practices
- `@agent-database-architect` - Schema design

### Frontend Development

- `@agent-frontend-architect` - UI architecture
- `@agent-ui-ux-designer` - Design systems

### Quality & Security

- `@agent-security-engineer` - Security audits, OWASP
- `@agent-quality-engineer` - Testing strategies
- `@agent-performance-engineer` - Optimization

### Analysis & Architecture

- `@agent-system-architect` - System design
- `@agent-root-cause-analyst` - Debugging
- `@agent-refactoring-expert` - Code quality

### Specialized

- `@agent-devops-architect` - CI/CD, infrastructure
- `@agent-technical-writer` - Documentation
- `@agent-learning-guide` - Educational content

---

## 🔄 Integration Patterns

### 1. Research Flow

```yaml
Tavily: Initial search →
Sequential: Analyze gaps →
Tavily: Targeted follow-up →
Serena: Store session
```

### 2. Implementation Flow

```yaml
Context7: Fetch docs →
Sequential: Plan approach →
Magic/Native: Implement →
Serena: Checkpoint
```

### 3. Analysis Flow

```yaml
claude-context: Semantic search →
Sequential: Deep analysis →
Morphllm: Apply changes →
Validate
```

### 4. Full-Stack Feature Development

```bash
# Discovery
/sc:brainstorm "authentication system"

# Architecture
@agent-system-architect "design auth architecture"

# Frontend
/sc:implement "React login UI" --magic --c7
@agent-frontend-architect "review component structure"

# Backend
/sc:implement "JWT auth API" --c7
@agent-backend-architect "review API design"
@agent-security-engineer "security audit"

# Testing
/sc:test --type e2e "auth flow" --play
```

---

## ⚡ Parallelization Rules (CRITICAL)

**Default**: PARALLEL operations

### Mandatory Parallel

```yaml
✅ Always Parallel:
  - Multiple file reads
  - Batch searches
  - Independent analyses
  - Non-dependent edits
  - Tool calls with no dependencies
```

### Sequential ONLY When

```yaml
❌ Sequential Only If:
  - Explicit dependency (Hop N requires Hop N-1)
  - Resource constraint (API rate limit)
  - User explicitly requests it
```

### Parallel Optimization

```yaml
Batch Sizes:
  searches: 5
  extractions: 3
  analyses: 2

Intelligent Grouping:
  by_domain: true
  by_complexity: true
  by_resource: true
```

**Example**:

```bash
# ✅ CORRECT: Parallel reads
Read(file1) + Read(file2) + Read(file3)

# ❌ WRONG: Sequential without reason
Read(file1) → Wait → Read(file2) → Wait → Read(file3)
```

---

## 🎪 Real-World Workflows

### Discovery → Implementation

```bash
# Step 1: Explore requirements
/sc:brainstorm "web dashboard for project management"

# Step 2: Analyze approach
/sc:analyze "dashboard architecture patterns" --focus architecture --c7

# Step 3: Implement
/sc:implement "React dashboard with task management"
```

### Debugging Complex Issues

```bash
# Problem analysis (Introspection auto-activates)
"Users getting intermittent auth failures"
→ 🤔 Transparent reasoning about causes
→ 🎯 Hypothesis formation
→ 💡 Pattern recognition

# Systematic resolution (Task Management coordinates)
/sc:fix auth-system --comprehensive
→ 📋 Phase 1: Root cause analysis
→ 📋 Phase 2: Solution implementation
→ 📋 Phase 3: Testing and validation
```

### Large Codebase Analysis

```bash
# Step 1: Structure understanding
/sc:load project/
/sc:analyze . --overview --focus architecture

# Step 2: Identify problems
@agent-quality-engineer "identify high-risk modules"

# Step 3: Deep dive
/sc:analyze high-risk-module/ --think-hard --focus quality

# Step 4: Implementation plan
/sc:workflow "improvement plan based on analysis"
```

### Migration Project

```bash
# Phase 1: Analysis
/sc:load legacy-system/
/sc:analyze . --focus architecture --verbose

# Phase 2: Planning
@agent-system-architect "design migration strategy"
/sc:workflow "create migration plan"

# Phase 3: Implementation
/sc:implement "compatibility layer"
/sc:implement "new system components"

# Phase 4: Validation
/sc:test --focus compatibility
/sc:document --type migration
```

---

## 🚀 Performance Optimization

### Analysis Depth Flags

```bash
--think           # Standard analysis (~4K tokens)
--think-hard      # Deep analysis (~10K tokens)
--ultrathink      # Maximum depth (~32K tokens)
```

### Scope Control

```bash
--scope file      # Single file
--scope module    # Module/directory
--scope project   # Entire project
--scope system    # System-wide
```

### Domain Focus

```bash
--focus performance
--focus security
--focus quality
--focus architecture
--focus accessibility
--focus testing
```

---

## 🔍 Diagnostic Reference

### Troubleshooting MCP Servers

```bash
# Check Node.js (required for MCP)
node --version  # Need v16+

# Test MCP availability
npx -y @upstash/context7-mcp@latest --help

# Check configuration
cat ~/.claude.json | grep -i context7

# List installed MCP servers
npm list -g | grep mcp

# Verify MCP functionality test
npx playwright --version  # Playwright
npm list -g @context7/mcp-server  # Context7
```

### Common Issues

**1. MCP Server Not Found**

```bash
# Solution: Reinstall
npm install -g @context7/mcp-server@latest
```

**2. Permission Errors**

```bash
# Solution: Configure npm user directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
```

**3. Port Conflicts**

```bash
# Solution: Restart or configure different ports
# Edit ~/.claude/ configuration files
```

**4. Slow Performance**

```bash
# Solution: Check system resources
top | grep node
npm list -g | grep -E "context7|sequential|magic|playwright"
```

---

## 📚 Learning Paths

### Beginner (Week 1-2)

1. Master basic slash commands
2. Understand mode auto-activation
3. Learn tool selection patterns

### Intermediate (Week 3-4)

1. Advanced patterns and coordination
2. MCP server configuration
3. Complex workflows

### Expert (Week 5+)

1. Custom agent development
2. Integration patterns
3. Framework extension
4. System debugging

---

## 💡 Best Practices

### DO ✅

1. **Use parallel operations by default** - Batch independent calls
2. **Leverage MCP servers** - Use best tool for each task
3. **Let modes auto-activate** - Trust the intelligence
4. **Accumulate context** - Build on previous work
5. **Create checkpoints** - Use `/sc:save` for long sessions
6. **Focus keywords** - Be specific in prompts
7. **Combine agents** - Multi-expert collaboration

### DON'T ❌

1. **Force sequential when parallel works** - Kills efficiency
2. **Skip MCP for tasks they're designed for** - Miss optimization
3. **Override modes without reason** - They're smart
4. **Start fresh each time** - Use `/sc:load` for context
5. **Use vague prompts** - Specificity = better agent selection
6. **Mix frameworks** - Pick one tool per task type
7. **Ignore mode indicators** - They guide you

---

## 🎯 Key Takeaways

1. **SuperClaude = Meta-Programming Layer**: Not a replacement for Claude Code, but an enhancement framework

2. **Context Accumulation**: Each command builds on previous conversation context

3. **Intelligent Orchestration**: Automatic tool selection based on task complexity

4. **Mode-Driven Behavior**: Adaptive communication styles for different scenarios

5. **MCP Integration**: External tools provide specialized capabilities

6. **Agent Specialization**: Domain experts activated based on keywords

7. **Parallel-First Execution**: Default to concurrent operations for efficiency

8. **Session Persistence**: Serena MCP enables cross-session memory

---

## 📖 Quick Reference Card

```bash
# Essential Commands
/sc:brainstorm [topic]          # Discovery
/sc:implement [feature]          # Build
/sc:test [--type]               # Validate
/sc:troubleshoot [issue]        # Debug

# Power Flags
--c7                            # Context7 docs
--seq                           # Sequential reasoning
--magic                         # UI generation
--all-mcp                       # All servers
--no-mcp                        # Native only
--think-hard                    # Deep analysis
--uc                            # Token efficiency

# Modes (auto-activate or manual)
--brainstorm                    # Discovery
--introspect                    # Transparency
--task-manage                   # Coordination
--orchestrate                   # Tool optimization
--uc                            # Compression

# Agent Activation
@agent-[name] "task"            # Explicit call
/sc:implement "task"            # Auto-activation
```

---

**Remember**: SuperClaude is about **intelligent coordination**, not automation. It helps Claude Code make better decisions about tool selection, context management, and workflow orchestration.
