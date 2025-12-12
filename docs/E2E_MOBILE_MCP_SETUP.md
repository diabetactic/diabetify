# E2E Mobile MCP Setup

## Setup Process

Setting up Mobile MCP involves a few steps to connect your local environment to the MCP AI service.

### 1. Install the MCP CLI

The MCP command-line interface (CLI) is required to run tests and interact with the MCP service. Install it via npm:

```bash
npm install -g @mobile-mcp/cli
```

### 2. Configure Your API Key

Mobile MCP requires an API key to authenticate with the AI service.

1.  **Get your API key** from the Mobile MCP dashboard (you will need to create an account).
2.  **Set the API key** as an environment variable in your system:

    ```bash
    export MCP_API_KEY="your-api-key-here"
    ```

    Alternatively, you can create a `.env` file in the root of the project with the following content:

    ```
    MCP_API_KEY="your-api-key-here"
    ```

### 3. Initialize the Project

Run the `mcp init` command in the root of your project to create a `mcp-config.yaml` file. This file will be used to configure your tests.

```bash
mcp init
```

This will create a `mcp-config.yaml` file that looks like this:

```yaml
# mcp-config.yaml
projectId: "your-project-id"
apiKey: "${MCP_API_KEY}"
testsPath: "./mcp-tests"
```

## Mobile MCP Tools

Mobile MCP provides a suite of tools to help you create, run, and manage your E2E tests.

### Command-Line Interface (CLI)

The `@mobile-mcp/cli` package provides the following commands:

*   `mcp init`: Initializes a new project.
*   `mcp record`: Starts a new interactive session to record a test.
*   `mcp run [test-name]`: Runs a specific test or all tests.
*   `mcp report`: Generates a report of the latest test run.

### AI-Assisted Test Creation

With Mobile MCP, you can write tests in plain English. The AI will automatically find the elements and perform the actions.

Example:

```yaml
# mcp-tests/login.mcp.yaml
- The user should see the login screen
- The user taps on the "Email" field and enters "test@example.com"
- The user taps on the "Password" field and enters "password"
- The user taps the "Login" button
- The user should see the "Welcome" screen
```

### AI-Powered Element Detection

You don't need to specify element IDs. Mobile MCP's AI will analyze the screen and find the elements based on your descriptions. This makes the tests more resilient to UI changes.

## Troubleshooting

Here are some common issues you might encounter and how to resolve them.

### Invalid API Key

If you get an "Invalid API Key" error, make sure that:

*   Your `MCP_API_KEY` environment variable is set correctly.
*   The API key is still valid and has not expired.
*   You have the correct permissions to use the API.

### Test Fails to Run

If a test fails to run, try the following:

*   Run `mcp doctor` to check for any configuration issues.
*   Make sure you have a stable internet connection.
*   Check the Mobile MCP status page for any ongoing incidents.

### Element Not Found

If the AI has trouble finding an element, try to be more specific in your test description. For example, instead of "tap the button", you could say "tap the green 'Submit' button at the bottom of the screen".

## Example Test Scripts

Here are a few example test scripts to help you get started.

### Login Test

This test checks the login functionality of the app.

```yaml
# mcp-tests/login.mcp.yaml
- The user should see the login screen with the "Diabetactic" logo
- The user taps on the "Email" field and enters "test@example.com"
- The user taps on the "Password" field and enters "password123"
- The user taps the "Login" button
- The user should be redirected to the "Dashboard" screen
- The user should see a welcome message: "Welcome, Test User!"
```

### Add a New Reading

This test demonstrates how to fill out a form.

```yaml
# mcp-tests/add-reading.mcp.yaml
- The user is on the "Dashboard" screen
- The user taps the "+" button to add a new reading
- The user should see the "Add Reading" screen
- The user enters "120" into the "Glucose Level" field
- The user selects "After Meal" from the "Type" dropdown
- The user taps the "Save" button
- The user should see a confirmation message: "Reading saved successfully"
```

### Profile Verification

This test verifies the user's profile information.

```yaml
# mcp-tests/profile.mcp.yaml
- The user navigates to the "Profile" screen
- The user should see their name: "Test User"
- The user should see their email: "test@example.com"
- The user should see their subscription status: "Premium"
```

## Mobile MCP vs. Maestro Comparison

Here is a comparison between Mobile MCP and Maestro based on several key metrics.

| Metric          | Maestro        | Mobile MCP     |
| --------------- | -------------- | -------------- |
| Reliability     | Variable       | AI-dependent   |
| Setup Time      | 5min           | ~10min         |
| Element IDs     | Required       | AI finds them  |
| Multi-language  | Regex patterns | AI handles     |
| Cost            | Free           | API costs      |
| CI/CD           | Easy           | Complex        |

### Recommendation

**Maestro** is a great choice for teams that want a free, open-source tool with a simple setup process. It is well-suited for projects where you have control over the codebase and can add `data-testid` attributes to elements.

**Mobile MCP** is a powerful option for teams that want to leverage AI to speed up test creation and reduce maintenance. It is particularly useful for projects with complex UIs, multi-language support, or where you don't have access to the source code to add element IDs.

For the Diabetactic app, **Maestro is the recommended solution** due to its cost-effectiveness and straightforward CI/CD integration. While Mobile MCP offers advanced AI features, the benefits do not outweigh the added complexity and cost for this project at this time.
