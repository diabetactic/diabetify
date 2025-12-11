/**
 * Local Docker Backend Test Setup
 *
 * Utilities for running Playwright tests against local Docker backend.
 * Import this in your test files when testing against Docker.
 *
 * Usage:
 *   import { localConfig, seedTestData, cleanupTestData } from './local-test-setup';
 */

import { request as _request } from '@playwright/test';

// Configuration
export const localConfig = {
  apiUrl: process.env.E2E_API_URL || 'http://localhost:8000',
  backofficeUrl: process.env.E2E_BACKOFFICE_URL || 'http://localhost:8001',
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:4200',
  testUsername: process.env.E2E_TEST_USERNAME || '1000',
  testPassword: process.env.E2E_TEST_PASSWORD || 'tuvieja',
  adminUsername: process.env.E2E_ADMIN_USERNAME || 'admin',
  adminPassword: process.env.E2E_ADMIN_PASSWORD || 'admin',
};

// Check if running in Docker test mode
export function isDockerTest(): boolean {
  return process.env.E2E_DOCKER_TESTS === 'true';
}

// Check if Docker backend is available
export async function isDockerBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${localConfig.apiUrl}/docs`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Get auth token for test user
export async function getAuthToken(
  username = localConfig.testUsername,
  password = localConfig.testPassword
): Promise<string> {
  const response = await fetch(`${localConfig.apiUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${username}&password=${password}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get auth token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get admin auth token for backoffice
export async function getAdminToken(): Promise<string> {
  const response = await fetch(`${localConfig.backofficeUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${localConfig.adminUsername}&password=${localConfig.adminPassword}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get admin token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Seed test readings
export async function seedTestReadings(count = 5): Promise<number[]> {
  const token = await getAuthToken();
  const readingIds: number[] = [];

  const testReadings = [
    { value: 95, notes: '__E2E_TEST__ Morning fasting', mealContext: 'fasting' },
    { value: 140, notes: '__E2E_TEST__ After breakfast', mealContext: 'after_meal' },
    { value: 110, notes: '__E2E_TEST__ Before lunch', mealContext: 'before_meal' },
    { value: 85, notes: '__E2E_TEST__ Low reading', mealContext: 'fasting' },
    { value: 180, notes: '__E2E_TEST__ High after dinner', mealContext: 'after_meal' },
  ];

  for (let i = 0; i < Math.min(count, testReadings.length); i++) {
    const response = await fetch(`${localConfig.apiUrl}/glucose/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testReadings[i]),
    });

    if (response.ok) {
      const data = await response.json();
      readingIds.push(data.id);
    }
  }

  return readingIds;
}

// Cleanup test-tagged readings
export async function cleanupTestReadings(): Promise<number> {
  const token = await getAuthToken();

  // Get all readings
  const response = await fetch(`${localConfig.apiUrl}/glucose/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return 0;

  const readings = await response.json();
  let deleted = 0;

  for (const reading of readings) {
    if (reading.notes?.includes('__E2E_TEST__')) {
      const deleteResponse = await fetch(`${localConfig.apiUrl}/glucose/${reading.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (deleteResponse.ok) deleted++;
    }
  }

  return deleted;
}

// Clear appointment queue via backoffice
export async function clearAppointmentQueue(): Promise<boolean> {
  try {
    const adminToken = await getAdminToken();

    const response = await fetch(`${localConfig.backofficeUrl}/appointments/queue/clear`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: localConfig.testUsername }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Accept pending appointment via backoffice
export async function acceptAppointment(): Promise<boolean> {
  try {
    const adminToken = await getAdminToken();

    const response = await fetch(`${localConfig.backofficeUrl}/appointments/queue/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: localConfig.testUsername }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Deny pending appointment via backoffice
export async function denyAppointment(): Promise<boolean> {
  try {
    const adminToken = await getAdminToken();

    const response = await fetch(`${localConfig.backofficeUrl}/appointments/queue/deny`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: localConfig.testUsername }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Get user profile
export async function getUserProfile(): Promise<Record<string, unknown> | null> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${localConfig.apiUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

// Full test data seed (readings + clear appointments)
export async function seedTestData(): Promise<void> {
  console.log('🌱 Seeding test data...');

  // Seed readings
  const readingIds = await seedTestReadings(5);
  console.log(`   ✓ Created ${readingIds.length} test readings`);

  // Clear appointment queue
  const cleared = await clearAppointmentQueue();
  console.log(
    `   ${cleared ? '✓' : '⚠'} Appointment queue ${cleared ? 'cleared' : 'clear failed'}`
  );
}

// Full cleanup
export async function cleanupTestData(): Promise<void> {
  console.log('🧹 Cleaning up test data...');

  // Cleanup readings
  const deleted = await cleanupTestReadings();
  console.log(`   ✓ Deleted ${deleted} test readings`);

  // Clear appointment queue
  const cleared = await clearAppointmentQueue();
  console.log(
    `   ${cleared ? '✓' : '⚠'} Appointment queue ${cleared ? 'cleared' : 'clear failed'}`
  );
}

// Export default configuration
export default localConfig;
