/**
 * Database Seeder
 *
 * Centralizes database operations for E2E tests, including:
 * - Resetting the database to a clean state
 * - Seeding with test data (base, full, etc.)
 * - Cleaning up E2E-specific data after tests
 * - Managing test transactions for data isolation
 *
 * Uses the /debug/ endpoints exposed by the Docker backend.
 */

import { API_URL, TEST_USERNAME, TEST_PASSWORD } from './config';

// Helper to get auth token for debug API calls
async function getAuthToken(): Promise<string> {
  const response = await fetch(`${API_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${TEST_USERNAME}&password=${TEST_PASSWORD}`,
  });
  if (!response.ok) {
    throw new Error('Failed to get auth token for test user.');
  }
  const data = await response.json();
  return data.access_token;
}

// Check if debug endpoints are available (backend may not have them)
let debugEndpointsAvailable: boolean | null = null;
async function checkDebugEndpointsAvailable(): Promise<boolean> {
  if (debugEndpointsAvailable !== null) return debugEndpointsAvailable;
  try {
    const response = await fetch(`${API_URL}/debug/health`, { method: 'GET' });
    debugEndpointsAvailable = response.ok || response.status !== 404;
  } catch {
    debugEndpointsAvailable = false;
  }
  if (!debugEndpointsAvailable) {
    console.log('⚠️ Debug endpoints not available - using fallback mode');
  }
  return debugEndpointsAvailable;
}

export class DatabaseSeeder {
  /**
   * Resets the entire database to a clean state.
   * Calls the /debug/reset-db endpoint if available.
   * Falls back to no-op if debug endpoints not available.
   */
  public static async reset(): Promise<void> {
    if (!(await checkDebugEndpointsAvailable())) {
      console.log('--- 🌱 Database Reset (skipped - no debug endpoints) ---');
      return;
    }
    console.log('--- 🌱 Resetting Database ---');
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/debug/reset-db`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to reset database.');
    }
    console.log('✅ Database reset successfully.');
    console.log('-----------------------------');
  }

  /**
   * Seeds the database with a specified dataset.
   * Falls back to no-op if debug endpoints not available.
   *
   * @param seedType - The type of seed to run (e.g., 'base', 'full').
   */
  public static async seed(seedType: 'base' | 'full'): Promise<void> {
    if (!(await checkDebugEndpointsAvailable())) {
      console.log(`--- 🌱 Database Seed (skipped - using shell script seeding) ---`);
      return;
    }
    console.log(`--- 🌱 Seeding Database (${seedType}) ---`);
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/debug/seed-${seedType}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to seed database with '${seedType}' data.`);
    }
    console.log(`✅ Database seeded successfully with '${seedType}' data.`);
    console.log('------------------------------------');
  }

  /**
   * Cleans up any data created specifically for E2E tests.
   * Falls back to no-op if debug endpoints not available.
   */
  public static async cleanup(): Promise<void> {
    if (!(await checkDebugEndpointsAvailable())) {
      console.log('--- 🧹 E2E Cleanup (skipped - using shell script cleanup) ---');
      return;
    }
    console.log('--- 🧹 Cleaning Up E2E Data ---');
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/debug/cleanup-e2e`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to clean up E2E data.');
    }
    console.log('✅ E2E data cleaned up successfully.');
    console.log('--------------------------------');
  }

  /**
   * Begins a new database transaction.
   * No-op if debug endpoints not available (tests run without transactions).
   */
  public static async beginTransaction(): Promise<void> {
    if (!(await checkDebugEndpointsAvailable())) {
      return; // Silent no-op
    }
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/debug/transaction/begin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to begin database transaction.');
    }
  }

  /**
   * Commits the current database transaction.
   * No-op if debug endpoints not available.
   */
  public static async commitTransaction(): Promise<void> {
    if (!(await checkDebugEndpointsAvailable())) {
      return; // Silent no-op
    }
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/debug/transaction/commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to commit database transaction.');
    }
  }

  /**
   * Rolls back the current database transaction.
   * No-op if debug endpoints not available.
   */
  public static async rollbackTransaction(): Promise<void> {
    if (!(await checkDebugEndpointsAvailable())) {
      return; // Silent no-op
    }
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/debug/transaction/rollback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('Failed to roll back database transaction.');
    }
  }
}
