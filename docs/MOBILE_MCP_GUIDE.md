# Mobile-MCP Testing Guide

**Mobile-MCP** is an AI-native mobile automation framework that complements Maestro with intelligent element detection and accessibility tree inspection.

---

## 🆚 Mobile-MCP vs Maestro

| Feature | Maestro | Mobile-MCP |
|---------|---------|------------|
| **Approach** | YAML-based test scripts | AI-assisted automation via MCP tools |
| **Element Selection** | Manual (text, id, coordinates) | AI-powered (accessibility tree analysis) |
| **Test Creation** | Write YAML flows | Claude analyzes UI and suggests tests |
| **Debugging** | Screenshots + logs | Accessibility tree + AI reasoning |
| **Platform** | iOS + Android | iOS + Android |
| **Integration** | Standalone CLI | MCP server (works with Claude Code) |
| **Best For** | Regression tests, CI/CD | Exploratory testing, AI-assisted debugging |

---

## 🔧 Setup

Mobile-MCP is already configured in `.mcp.json`:

```json
{
  "mobile-mcp": {
    "command": "npx",
    "args": ["-y", "@mobilenext/mobile-mcp"],
    "type": "stdio",
    "description": "AI-native mobile automation with accessibility tree inspection"
  }
}
```

**No additional setup needed** - Claude Code will auto-install on first use.

---

## 🎯 Key Capabilities

### 1. **Accessibility Tree Inspection**
Unlike Maestro's coordinate-based approach, Mobile-MCP analyzes the accessibility tree to find elements intelligently.

```typescript
// Example: Find login button without coordinates
// Mobile-MCP uses AI to understand: "button that says Login or Sign In"
```

### 2. **AI-Assisted Element Detection**
Describe what you want in natural language, Claude + Mobile-MCP finds it:
- "The blue submit button at the bottom"
- "The username input field"
- "The settings icon in the top right"

### 3. **Screenshot + Element Overlay**
Take screenshots with element boundaries highlighted (useful for debugging Shadow DOM).

### 4. **Platform-Agnostic**
Same commands work on iOS and Android (Mobile-MCP handles platform differences).

---

## 📋 Basic Workflow

### Step 1: Connect to Device
```bash
# Ensure device is connected
adb devices

# Launch app manually or via ADB
adb shell am start -n io.diabetify.app/.MainActivity
```

### Step 2: Inspect UI (via Claude)
Ask Claude to inspect the current screen:
```
"Use Mobile-MCP to inspect the current screen and tell me what elements are visible"
```

### Step 3: Interact with Elements (via Claude)
Ask Claude to interact with elements:
```
"Use Mobile-MCP to tap the Login button"
"Use Mobile-MCP to enter 'testuser' in the username field"
```

### Step 4: Verify State (via Claude)
```
"Use Mobile-MCP to verify the dashboard is visible after login"
```

---

## 🧪 Example Test Scenarios

### Test 1: Login Flow (AI-Assisted)

**Maestro Approach:**
```yaml
- tapOn:
    point: "50%,45%"  # Coordinate-based
- inputText: "1000"
- tapOn:
    point: "50%,55%"
- inputText: "tuvieja"
- tapOn: "Sign In|Iniciar"
```

**Mobile-MCP Approach (via Claude):**
```
1. "Inspect the login screen and identify the username input"
2. "Enter '1000' in the username field"
3. "Enter 'tuvieja' in the password field"
4. "Tap the submit button"
5. "Verify we're on the dashboard"
```

Claude will use Mobile-MCP tools to execute these steps intelligently.

---

### Test 2: Theme Toggle (Shadow DOM Elements)

**Problem with Maestro:**
- Ionic components use Shadow DOM
- Text selectors fail: `tapOn: "Dark Mode"` doesn't work
- Workaround: Coordinates or resource IDs

**Mobile-MCP Solution:**
- AI analyzes accessibility tree (sees through Shadow DOM)
- Finds elements by semantic meaning, not just text
- Example: "Find the theme selector dropdown"

**How to Test:**
```
"Navigate to profile tab, find the theme selector, and switch to dark mode"
```

Mobile-MCP + Claude will:
1. Analyze accessibility tree
2. Find the theme selector (even in Shadow DOM)
3. Open the dropdown
4. Select "Dark" option
5. Verify theme changed

---

### Test 3: Debugging Element Detection

**When Maestro fails to find an element:**

1. **Take Accessibility Screenshot:**
   ```
   "Use Mobile-MCP to capture the screen with element boundaries highlighted"
   ```

2. **Analyze Element Tree:**
   ```
   "Show me the accessibility tree for the current screen"
   ```

3. **Find Alternative Selectors:**
   ```
   "What are all the ways I can select the login button? Show me IDs, text, accessibility labels"
   ```

---

## 🔍 Comparison: Real-World Scenario

### Scenario: Find and tap Profile tab

**Maestro (manual):**
```yaml
# Option 1: Text (fails with Shadow DOM)
- tapOn: "Profile|Perfil"

# Option 2: Resource ID (requires data-testid implementation)
- tapOn:
    id: "tab-profile"

# Option 3: Coordinates (brittle)
- tapOn:
    point: "90%,95%"
```

**Mobile-MCP (AI-assisted):**
```
"Tap the profile tab at the bottom navigation"
```

Claude + Mobile-MCP will:
1. Analyze bottom navigation accessibility tree
2. Identify tab elements
3. Find the one labeled "Profile" or "Perfil"
4. Tap it (handling Shadow DOM automatically)

---

## 🚀 When to Use Each Tool

### Use Maestro When:
- ✅ Running regression tests in CI/CD
- ✅ You have stable `data-testid` selectors
- ✅ Repeating the same test flow many times
- ✅ Need fast, deterministic execution
- ✅ YAML test files for version control

### Use Mobile-MCP When:
- ✅ Exploring new UI (AI helps discover elements)
- ✅ Debugging Shadow DOM issues
- ✅ Element selectors keep changing
- ✅ Need intelligent element detection
- ✅ Rapid prototyping of test ideas
- ✅ Working interactively with Claude

### Use Both Together:
1. **Mobile-MCP for exploration:** "Find all interactive elements on this screen"
2. **Maestro for execution:** Convert findings to stable YAML tests
3. **Mobile-MCP for debugging:** When Maestro tests fail, use AI to understand why

---

## 📝 Next Steps

1. **Restart Claude Code** to load Mobile-MCP server
2. **Connect device:** `adb devices`
3. **Launch app:** `adb shell am start -n io.diabetify.app/.MainActivity`
4. **Ask Claude:** "Use Mobile-MCP to inspect the current screen"
5. **Explore capabilities:** Try login flow, theme toggle, tab navigation

---

## 🎓 Learning Resources

- **Mobile-MCP GitHub:** https://github.com/mobile-next/mobile-mcp
- **MCP Documentation:** https://modelcontextprotocol.io/
- **Accessibility Testing:** Mobile-MCP uses native accessibility APIs

---

## 💡 Pro Tips

1. **Combine with awesome-ionic-mcp:** Ask about Ionic component structure before testing
2. **Use sequential-thinking:** For complex debugging, ask Claude to think step-by-step
3. **Screenshot everything:** Mobile-MCP screenshots show element boundaries
4. **Natural language:** Describe what you want, let AI figure out how
5. **Fallback to Maestro:** If Mobile-MCP struggles, use Maestro coordinates as fallback

---

## 🐛 Troubleshooting

**Mobile-MCP not working?**
```bash
# Restart Claude Code to reload MCP servers
# Check device connection
adb devices

# Verify app is running
adb shell dumpsys activity top | grep diabetify
```

**Element not found?**
- Ask Claude to show accessibility tree
- Compare with Maestro's view hierarchy
- Check if element is in Shadow DOM

**Slow performance?**
- Mobile-MCP analyzes UI with AI (slower than Maestro)
- Use for exploration, then convert to Maestro YAML for speed
