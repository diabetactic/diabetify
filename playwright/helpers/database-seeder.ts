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

export class DatabaseSeeder {
  /**
   * Resets the entire database to a clean state.
   * Calls the /debug/reset-db endpoint.
   */
  public static async reset(): Promise<void> {
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
   *
   * @param seedType - The type of seed to run (e.g., 'base', 'full').
   */
  public static async seed(seedType: 'base' | 'full'): Promise<void> {
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
   * Calls the /debug/cleanup-e2e endpoint.
   */
  public static async cleanup(): Promise<void> {
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
   */
  public static async beginTransaction(): Promise<void> {
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
   */
  public static async commitTransaction(): Promise<void> {
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
   */
  public static async rollbackTransaction(): Promise<void> {
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
