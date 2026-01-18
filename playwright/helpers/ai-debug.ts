/**
 * AI-Powered Debug Helper using Midscene.js
 *
 * DEV-ONLY tool for debugging flaky tests and visual issues.
 * Uses vision models to describe what's actually on screen.
 *
 * Enable with: MIDSCENE_DEBUG=1
 * Configure model via: OPENAI_API_KEY, MIDSCENE_MODEL_NAME, etc.
 *
 * @example
 * // In a failing test:
 * const description = await aiDescribe(page, 'Is dark mode applied?');
 * console.log(description);
 *
 * @see https://midscenejs.com/model-provider for model configuration
 */

import type { Page } from '@playwright/test';

// Type for the Midscene PlaywrightAgent (imported dynamically)

type PlaywrightAgentType = any;

// Lazy-load Midscene only when needed (keeps it out of production)
let PlaywrightAgent: PlaywrightAgentType = null;

/**
 * Check if AI debugging is enabled via environment variable
 */
export function isAiDebugEnabled(): boolean {
  return process.env['MIDSCENE_DEBUG'] === '1' || process.env['MIDSCENE_DEBUG'] === 'true';
}

/**
 * Get the Midscene PlaywrightAgent class (lazy-loaded)
 */
async function getAgentClass(): Promise<PlaywrightAgentType> {
  if (!PlaywrightAgent) {
    // Dynamic import to avoid bundling in production
    const modulePath: string = '@midscene/web/playwright';
    const midsceneModule = (await import(modulePath)) as unknown as {
      PlaywrightAgent: PlaywrightAgentType;
    };
    PlaywrightAgent = midsceneModule.PlaywrightAgent;
  }
  return PlaywrightAgent;
}

/**
 * Create a Midscene agent for the given page.
 * Returns null if AI debugging is disabled.
 *
 * @example
 * const agent = await createAiAgent(page);
 * if (agent) {
 *   await agent.aiAction('click the login button');
 * }
 */
export async function createAiAgent(page: Page): Promise<PlaywrightAgentType | null> {
  if (!isAiDebugEnabled()) {
    return null;
  }

  const AgentClass = await getAgentClass();
  if (!AgentClass) return null;

  return new AgentClass(page);
}

/**
 * Ask AI to describe what it sees on the current page.
 * Returns null if AI debugging is disabled.
 *
 * @param page - Playwright page
 * @param question - Optional specific question (default: general description)
 *
 * @example
 * // General description
 * const desc = await aiDescribe(page);
 * // "I see a login form with username and password fields..."
 *
 * // Specific question
 * const colorCheck = await aiDescribe(page, 'What background color is the header?');
 * // "The header has a dark blue background (#1a1a2e)"
 */
export async function aiDescribe(page: Page, question?: string): Promise<string | null> {
  const agent = await createAiAgent(page);
  if (!agent) return null;

  const prompt = question ?? 'Describe what you see on this screen in detail';
  return agent.aiQuery(prompt);
}

/**
 * Ask AI a yes/no question about the current page.
 * Returns null if AI debugging is disabled.
 *
 * @example
 * const isDarkMode = await aiCheck(page, 'Is dark mode enabled?');
 * // true, false, or null (if disabled)
 */
export async function aiCheck(page: Page, question: string): Promise<boolean | null> {
  const agent = await createAiAgent(page);
  if (!agent) return null;

  return agent.aiBoolean(question);
}

/**
 * Ask AI to verify something on the page (assertion-style).
 * Throws if the assertion fails. Does nothing if AI debugging is disabled.
 *
 * @example
 * await aiVerify(page, 'The glucose reading shows 120 mg/dL');
 * // Throws if AI determines this is false
 */
export async function aiVerify(page: Page, assertion: string): Promise<void> {
  const agent = await createAiAgent(page);
  if (!agent) return;

  await agent.aiAssert(assertion);
}

/**
 * Ask AI to perform an action on the page.
 * Does nothing if AI debugging is disabled.
 *
 * @example
 * await aiAct(page, 'Click the submit button');
 * await aiAct(page, 'Fill in the email field with test@example.com');
 */
export async function aiAct(page: Page, instruction: string): Promise<void> {
  const agent = await createAiAgent(page);
  if (!agent) return;

  await agent.aiAction(instruction);
}

/**
 * Wait for AI to confirm a condition is true on the page.
 * Does nothing if AI debugging is disabled.
 *
 * @example
 * await aiWaitFor(page, 'The loading spinner has disappeared');
 * await aiWaitFor(page, 'At least 3 items are visible in the list', { timeoutMs: 10000 });
 */
export async function aiWaitFor(
  page: Page,
  condition: string,
  options?: { timeoutMs?: number }
): Promise<void> {
  const agent = await createAiAgent(page);
  if (!agent) return;

  await agent.aiWaitFor(condition, options);
}

/**
 * Debug helper: Dump a full AI analysis of the current page to console.
 * Useful when a test fails and you want to understand why.
 *
 * @example
 * // In a test that's failing:
 * test('should show dashboard', async ({ page }) => {
 *   await page.goto('/dashboard');
 *   await aiDump(page); // Prints detailed analysis to console
 *   // ... rest of test
 * });
 */
export async function aiDump(page: Page): Promise<void> {
  if (!isAiDebugEnabled()) {
    console.log('[AI Debug] Disabled. Set MIDSCENE_DEBUG=1 to enable.');
    return;
  }

  console.log('\n========== AI DEBUG DUMP ==========');
  console.log(`URL: ${page.url()}`);
  console.log('-----------------------------------');

  const description = await aiDescribe(page);
  console.log('Page Description:');
  console.log(description);

  // Check common issues
  const checks = [
    { question: 'Is there a loading spinner visible?', label: 'Loading' },
    { question: 'Is there an error message visible?', label: 'Error' },
    { question: 'Is the page fully loaded?', label: 'Loaded' },
    { question: 'Is dark mode enabled?', label: 'Dark Mode' },
  ];

  console.log('-----------------------------------');
  console.log('Quick Checks:');

  for (const check of checks) {
    try {
      const result = await aiCheck(page, check.question);
      console.log(`  ${check.label}: ${result}`);
    } catch {
      console.log(`  ${check.label}: (check failed)`);
    }
  }

  console.log('====================================\n');
}

/**
 * Configuration info: Print current Midscene model settings
 */
export function printAiConfig(): void {
  console.log('\n========== AI DEBUG CONFIG ==========');
  console.log(`Enabled: ${isAiDebugEnabled()}`);
  console.log(`Model: ${process.env['MIDSCENE_MODEL_NAME'] ?? 'gpt-4o (default)'}`);
  console.log(`Provider: ${getProviderName()}`);
  console.log(`API Key Set: ${hasApiKey()}`);
  console.log('======================================\n');
}

function getProviderName(): string {
  if (process.env['MIDSCENE_USE_ANTHROPIC_SDK'] === '1') return 'Anthropic';
  if (process.env['MIDSCENE_USE_GEMINI'] === '1') return 'Google Gemini';
  if (process.env['MIDSCENE_USE_QWEN_VL'] === '1') return 'Qwen';
  return 'OpenAI';
}

function hasApiKey(): boolean {
  if (process.env['MIDSCENE_USE_ANTHROPIC_SDK'] === '1') {
    return Boolean(process.env['ANTHROPIC_API_KEY']);
  }
  if (process.env['MIDSCENE_USE_GEMINI'] === '1') {
    return Boolean(process.env['GOOGLE_API_KEY']);
  }
  return Boolean(process.env['OPENAI_API_KEY']);
}
