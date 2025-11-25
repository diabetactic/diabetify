# Maestro Test Suite - Code Patterns & Examples

## 1. BILINGUAL ASSERTIONS (English/Spanish Support)

### Pattern 1: Simple Text Matching with Pipe Operator
**Used in**: All navigational assertions
```yaml
- assertVisible:
    text: "Panel de Control|Dashboard"
- assertVisible:
    text: "Lecturas|Readings"
- assertVisible:
    text: "Citas|Appointments"
- assertVisible:
    text: "Perfil|Profile"
```
**Real Example from smoke-test.yaml**:
```yaml
- assertVisible: "Panel de Control|Mi Salud|Dashboard|My Health"
- assertVisible: "Inicio|Home"
```

### Pattern 2: Complex Regex with Bilingual Options
**Used in**: Error message detection, dynamic content
```yaml
- assertVisible:
    text: ".*([Ii]ncorrect|[Ii]nválid|[Ee]rror|[Ff]all[oó]|[Cc]redenciales).*"
    optional: true
```
**Real Example from 02-wrong-credentials.yaml**:
```yaml
# Verify error message appears (bilingual support)
- assertVisible:
    text: ".*([Ii]ncorrect|[Ii]nválid|[Ee]rror|[Ff]all[oó]|[Cc]redenciales).*"
    optional: true
```

### Pattern 3: Multiple Translation Options for Same Element
**Used in**: Forms, buttons, headers
```yaml
# Email input label variations
- assertVisible: "DNI o Email|Email|Correo"

# Theme setting variations  
- assertVisible: "profile.theme.title|Tema|Theme"

# Appointment label variations
- assertVisible: "Mis Citas|My Appointments|Citas|Appointments"
```
**Real Example from 01-login-flow.yaml**:
```yaml
- assertVisible:
    text: "DNI o Email|Email|Correo"
    optional: true  # Make it optional as the label may vary
```

---

## 2. COORDINATE-BASED TAPS (Ionic Input Fields)

### Pattern 1: Percentage-Based Coordinates (Most Reliable)
**Why**: Ionic input fields often lack stable IDs or test attributes
```yaml
# Email input at 50% horizontal, 45% vertical
- tapOn:
    point: "50%,45%"

# Password input at 50% horizontal, 52% vertical  
- tapOn:
    point: "50%,52%"

# FAB button at bottom right (50% horizontal, 93% vertical)
- tapOn:
    point: "50%,93%"
```
**Real Example from auth/login.yaml**:
```yaml
# Fill email field (use center point because Ionic inputs lack stable IDs)
- tapOn:
    point: "50%,45%"
- eraseText
- inputText: ${USERNAME}
- hideKeyboard

# Fill password field
- tapOn:
    point: "50%,52%"
- eraseText
- inputText: ${PASSWORD}
- hideKeyboard
```

### Pattern 2: ID-Based Taps (When IDs are Available)
**Used in**: Specific test elements with predictable IDs
```yaml
- tapOn:
    id: "dni-input"
- inputText: "1000"

- tapOn:
    id: "password-input"
- inputText: "tuvieja"

- tapOn:
    id: "login-submit-btn"
```
**Real Example from 01-login-flow.yaml**:
```yaml
- tapOn:
    id: "dni-input"
- inputText: "1000"

- tapOn:
    id: "password-input"
- inputText: "tuvieja"
```

### Pattern 3: Text-Based Taps (Stable Labels)
**Used in**: Buttons, links, navigation
```yaml
- tapOn: "Iniciar Sesión|Sign In"
- tapOn: "Lecturas|Readings"
- tapOn: "Perfil|Profile"
```

---

## 3. WAIT STRATEGIES

### Pattern 1: Animation Wait (Most Common)
**Used in**: After every UI interaction
```yaml
- waitForAnimationToEnd
- waitForAnimationToEnd:
    timeout: 2000

- waitForAnimationToEnd:
    timeout: 3000

- waitForAnimationToEnd:
    timeout: 5000
```
**Real Example from auth/login.yaml**:
```yaml
# Wait for navigation to complete
- waitForAnimationToEnd:
    timeout: 5000

# Verify successful login
- assertVisible: "Panel de Control|Dashboard"
```

### Pattern 2: Wait with Loading Indicator
**Used in**: Data-heavy screens, API calls
```yaml
- runFlow:
    when:
      visible: "Loading|Cargando"
    commands:
      - waitForAnimationToEnd:
          timeout: 10000
```
**Real Example from wait-for-data-load.yaml**:
```yaml
# Wait for loading spinner/text to disappear
- runFlow:
    when:
      visible: ${LOADING_INDICATOR-Loading}
    commands:
      - waitForAnimationToEnd:
          timeout: ${TIMEOUT-10000}
```

### Pattern 3: Assertion Timeout (Explicit Wait)
**Used in**: Conditional assertions that need time
```yaml
- assertVisible:
    text: "${GLUCOSE_VALUE}"
    timeout: 5000

- assertVisible:
    text: "Appointments|Citas|No appointments|Server Error"
    timeout: 5000
```
**Real Example from readings/02-add-reading.yaml**:
```yaml
- runFlow:
    when:
      visible: "${GLUCOSE_VALUE}"
    commands:
      - takeScreenshot: maestro/screenshots/verify-reading-in-list-success.png
```

### Pattern 4: Standard Timing for Different Operations
**Used in**: Consistent timing across tests
```yaml
# Page navigation: 2-3 seconds
- tapOn: "Inicio|Home"
- waitForAnimationToEnd:
    timeout: 2000

# Modal opening: 1.5-2 seconds  
- tapOn: "theme-selector"
- waitForAnimationToEnd:
    timeout: 1500

# API response: 5-10 seconds
- tapOn: "Iniciar Sesión|Sign In"
- waitForAnimationToEnd:
    timeout: 5000

# Complex data load: 10-15 seconds
- runFlow:
    file: flows/wait-for-data-load.yaml
```

### Pattern 5: Multiple Wait Types in Sequence
**Used in**: Complex flows with multiple async operations
```yaml
# Wait for animation
- waitForAnimationToEnd:
    timeout: 2000

# Verify element appeared (with timeout)
- assertVisible:
    text: "Glucosa Promedio|Average Glucose"
    timeout: 5000

# Additional animation wait
- waitForAnimationToEnd:
    timeout: 2000
```
**Real Example from 02-dashboard-navigation.yaml**:
```yaml
# Test pull-to-refresh functionality
- scrollUp

# Wait for refresh to complete
- waitForAnimationToEnd:
    timeout: 5000

# Verify content reloaded
- assertVisible: "HbA1c"
```

---

## 4. FORM INPUT FLOWS

### Pattern 1: Complete Add Glucose Reading Flow
**From**: maestro/flows/add-glucose-reading.yaml
```yaml
# Tap the floating action button to open add reading modal
- tapOn:
    point: "50%,93%"  # FAB button position (bottom right)
- waitForAnimationToEnd:
    timeout: 2000

# Verify modal opened
- assertVisible: "Agregar Lectura|Add Reading"

# Enter glucose value in input field
- tapOn:
    point: "50%,32%"  # Glucose input field position
- waitForAnimationToEnd:
    timeout: 500
- eraseText
- inputText: "${GLUCOSE_VALUE}"

# Select reading type if provided (optional)
- runFlow:
    when:
      visible: "Contexto de comida|Meal Context"
    commands:
      - tapOn: "Selecciona el contexto|Select context"
      - waitForAnimationToEnd:
          timeout: 1000
      - tapOn: "${READING_TYPE}"
      - waitForAnimationToEnd:
          timeout: 1000

# Hide keyboard to ensure save button is visible
- hideKeyboard
- waitForAnimationToEnd:
    timeout: 500

# Save the reading
- tapOn: "GUARDAR LECTURA|SAVE READING|Guardar|Save"
- waitForAnimationToEnd:
    timeout: 3000

# Verify success (return to dashboard or readings)
- assertVisible: "Panel de Control|Dashboard|Lecturas|Readings"
```

### Pattern 2: Login Form Flow
**From**: maestro/flows/auth/login.yaml
```yaml
# Fill email field (use center point because Ionic inputs lack stable IDs)
- tapOn:
    point: "50%,45%"
- eraseText
- inputText: ${USERNAME}
- hideKeyboard

# Fill password field
- tapOn:
    point: "50%,52%"
- eraseText
- inputText: ${PASSWORD}
- hideKeyboard

# Submit login
- tapOn: "Iniciar Sesión|Sign In"

# Wait for navigation to complete
- waitForAnimationToEnd:
    timeout: 5000

# Verify successful login
- assertVisible: "Panel de Control|Dashboard"
```

### Pattern 3: Validation Flow with Error Handling
**From**: readings/05-add-reading-validation.yaml
```yaml
# Test 1: Empty value submission
- tapOn:
    point: "50%,32%"  # Glucose input field
- eraseText
- hideKeyboard

# Try to save without value
- tapOn: "GUARDAR LECTURA|SAVE READING"
- waitForAnimationToEnd:
    timeout: 2000

# Should show validation error or prevent save
- assertVisible:
    text: ".*([Rr]equerido|[Rr]equired|[Oo]bligatorio).*"
    optional: true

# Verify modal is still open (not saved)
- assertVisible: "Agregar Lectura|Add Reading"

# Test 2: Invalid value - Zero
- tapOn:
    point: "50%,32%"
- eraseText
- inputText: "0"
- hideKeyboard

- tapOn: "GUARDAR LECTURA|SAVE READING"
- waitForAnimationToEnd:
    timeout: 2000

# Check for validation error
- assertVisible:
    text: ".*([Ii]nválido|[Ii]nvalid|[Rr]ango|[Rr]ange).*"
    optional: true
```

---

## 5. CONDITIONAL EXECUTION

### Pattern 1: Run Flow When Condition Met
**Used in**: Optional flows, state-dependent actions
```yaml
- runFlow:
    when:
      visible: "Iniciar Sesión|Sign In|Login"
    file: ../../flows/auth-login.yaml
```
**Real Example from readings/02-add-reading.yaml**:
```yaml
# Login if needed
- runFlow:
    when:
      visible: "Iniciar Sesión|Sign In|Login"
    file: ../../flows/auth-login.yaml
```

### Pattern 2: Continue on Failure
**Used in**: Non-critical operations, fallback scenarios
```yaml
- tapOn:
    id: "appointment-item-0"
  continueOnFailure: true

- waitForAnimationToEnd:
    timeout: 2000
  continueOnFailure: true

- takeScreenshot: maestro/screenshots/heroku/appointments/02-detail-view.png
  continueOnFailure: true
```
**Real Example from appointments/01-view-appointments.heroku.yaml**:
```yaml
# If appointments exist, verify list structure
- tapOn:
    when:
      visible: "Dr.|Doctor"
    id: "appointment-item-0"
  continueOnFailure: true

- waitForAnimationToEnd:
    timeout: 2000
  continueOnFailure: true
```

### Pattern 3: Optional Assertions
**Used in**: Elements that may or may not be visible
```yaml
- assertVisible:
    text: ".*([Ll]oading|[Cc]argando).*"
    optional: true

- assertVisible:
    text: ".*([Ee]rror|[Ff]all[oó]|[Nn]etwork|[Rr]ed|[Cc]onex).*"
    optional: true
```

### Pattern 4: Conditional Flows with When Clause
**Used in**: Different paths based on app state
```yaml
- runFlow:
    when:
      visible: "Contexto de comida|Meal Context"
    commands:
      - tapOn: "Selecciona el contexto|Select context"
      - waitForAnimationToEnd:
          timeout: 1000
      - tapOn: "${READING_TYPE}"
      - waitForAnimationToEnd:
          timeout: 1000
```

### Pattern 5: Alternative Flows on Failure
**Used in**: Error handling, multiple possible outcomes
```yaml
# Check if we got to dashboard OR if error message appears
- runFlow:
    when:
      visible: "Panel de Control|Dashboard"
    commands:
      - takeScreenshot: "maestro/screenshots/network-error-03-success.png"
      - assertVisible: "Panel de Control|Dashboard"

# Alternative: Check for error message
- runFlow:
    when:
      visible: ".*([Ee]rror|[Ff]all[oó]|[Nn]etwork|[Rr]ed|[Cc]onex).*"
    commands:
      - takeScreenshot: "maestro/screenshots/network-error-03-error-shown.png"
      - assertVisible: ".*([Ee]rror|[Ff]all[oó]|[Nn]etwork|[Rr]ed|[Cc]onex).*"
```
**Real Example from auth/03-network-error.yaml**:
```yaml
# Verify app is responsive (not frozen)
- assertVisible: "Iniciar Sesión|Login|Panel de Control|Dashboard"
```

---

## 6. FLOW COMPOSITION

### Pattern 1: Simple Flow Reuse
**Used in**: Login in every test
```yaml
- runFlow:
    file: ../flows/auth-login.yaml
    env:
      USERNAME: "1000"
      PASSWORD: "tuvieja"
```
**Real Example from smoke-test.yaml**:
```yaml
# Ensure user is on the dashboard (performs login if necessary)
- runFlow:
    file: ../flows/auth-login.yaml
    env:
      USERNAME: "1000"
      PASSWORD: "tuvieja"
- waitForAnimationToEnd:
    timeout: 3000
```

### Pattern 2: Multiple Flows in Sequence
**Used in**: Complete user journeys
```yaml
# Step 1: Login
- runFlow:
    when:
      visible: "Iniciar Sesión|Sign In|Login"
    file: ../../flows/auth-login.yaml

# Step 3: Add Glucose Reading
- runFlow:
    file: ../../flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "115"
      READING_TYPE: "DESAYUNO"

# Step 4: Verify Reading in List
- runFlow:
    file: ../../flows/verify-reading-in-list.yaml
    env:
      GLUCOSE_VALUE: "115"

# Step 8: Logout
- runFlow:
    file: ../../flows/logout.yaml
```
**Real Example from integration/01-complete-workflow.yaml**:
```yaml
# Step 1: Login
- runFlow:
    when:
      visible: "Iniciar Sesión|Sign In|Login"
    file: ../../flows/auth-login.yaml

# Verify login successful
- assertVisible: "Panel de Control|Dashboard"

# Step 3: Add Glucose Reading
- runFlow:
    file: ../../flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "115"
      READING_TYPE: "DESAYUNO"

# Verify reading added successfully
- assertVisible: "Panel de Control|Dashboard|Lecturas|Readings"
```

### Pattern 3: Environment Variable Passing to Flows
**Used in**: Parameterized test data
```yaml
- runFlow:
    file: ../../flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "70"
      READING_TYPE: "DESAYUNO"

- runFlow:
    file: ../../flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "100"
      READING_TYPE: "ALMUERZO"

- runFlow:
    file: ../../flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "180"
      READING_TYPE: "CENA"
```
**Real Example from readings/03-verify-stats.yaml**:
```yaml
# Add first reading (low)
- runFlow:
    file: ../../flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "70"
      READING_TYPE: "DESAYUNO"

# Add second reading (normal)
- runFlow:
    file: ../../flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "100"
      READING_TYPE: "ALMUERZO"
```

---

## 7. SCREENSHOT DOCUMENTATION

### Pattern 1: Milestone Screenshots
**Used in**: Capturing key states for documentation
```yaml
- takeScreenshot: maestro/screenshots/smoke-test-success.png
- takeScreenshot: maestro/screenshots/auth-login-success.png
- takeScreenshot: maestro/screenshots/complete-workflow-01-logged-in.png
```

### Pattern 2: Sequential Screenshots for Verification
**Used in**: Step-by-step test flows
```yaml
- takeScreenshot: "screenshots/auth-01-initial-state.png"
- takeScreenshot: "screenshots/auth-02-login-page.png"
- takeScreenshot: "screenshots/auth-03-form-filled.png"
- takeScreenshot: "screenshots/auth-04-login-success.png"
- takeScreenshot: "screenshots/auth-05-dashboard-complete.png"
```

### Pattern 3: Category-Organized Screenshots
**Used in**: Organization by feature
```yaml
- takeScreenshot: maestro/screenshots/03-theme/01-light-initial.png
- takeScreenshot: maestro/screenshots/03-theme/02-dark-selected.png
- takeScreenshot: maestro/screenshots/03-theme/03-dark-dashboard.png
- takeScreenshot: maestro/screenshots/03-theme/04-light-restored.png
- takeScreenshot: maestro/screenshots/03-theme/05-light-dashboard.png
```

---

## 8. COMMAND STRUCTURE SUMMARY

### Essential Command Patterns
```yaml
# Navigation & Interaction
- launchApp
- tapOn: <selector>
- scroll
- scrollUp
- swipe: direction: DOWN
- inputText: <text>
- eraseText
- hideKeyboard

# Waiting & Synchronization
- waitForAnimationToEnd: [timeout]
- wait: seconds: <number>

# Verification
- assertVisible: <text/selector>
- assertNotVisible: <text/selector>

# Flow Control
- runFlow: file: <path>, env: <vars>
- takeScreenshot: <path>

# Advanced
- when: <condition>
- optional: true
- continueOnFailure: true
```

