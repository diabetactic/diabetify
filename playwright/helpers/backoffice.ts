/**
 * Backoffice API Helper
 *
 * Provides functions to interact with the backoffice API for test setup and teardown.
 */

import { request } from '@playwright/test';

const BACKOFFICE_URL = process.env.E2E_BACKOFFICE_URL ?? 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const ADMIN_USER = process.env.E2E_BACKOFFICE_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.E2E_BACKOFFICE_ADMIN_PASS ?? 'admin';

async function getAdminToken(): Promise<string> {
  const apiContext = await request.newContext();
  const response = await apiContext.post(`${BACKOFFICE_URL}/token`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: `username=${ADMIN_USER}&password=${ADMIN_PASS}`,
  });

  if (!response.ok()) {
    throw new Error(`Failed to get admin token: ${response.status()}`);
  }

  const data = await response.json();
  await apiContext.dispose();
  return data.access_token;
}

export async function resetQueue(): Promise<void> {
  const token = await getAdminToken();
  const apiContext = await request.newContext();
  const response = await apiContext.post(`${BACKOFFICE_URL}/appointments/queue/open`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    console.warn(`Reset queue returned ${response.status()}`);
  }
  await apiContext.dispose();
}

async function viewPendingQueue(token: string): Promise<any[]> {
    const apiContext = await request.newContext();
    const response = await apiContext.get(`${BACKOFFICE_URL}/appointments/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok()) {
      console.warn(`View pending returned ${response.status()}`);
      await apiContext.dispose();
      return [];
    }

    const data = await response.json();
    await apiContext.dispose();
    return Array.isArray(data) ? data : [];
  }

export async function acceptNextAppointment(): Promise<boolean> {
  const token = await getAdminToken();
  const apiContext = await request.newContext();
  const pending = await viewPendingQueue(token);

  if (pending.length === 0) {
    console.log('No pending appointments to accept');
    await apiContext.dispose();
    return false;
  }

  const queuePlacement = pending[0].queue_placement;
  console.log(`Accepting appointment with queue_placement: ${queuePlacement}`);

  const response = await apiContext.put(`${BACKOFFICE_URL}/appointments/accept/${queuePlacement}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await apiContext.dispose();
  return response.ok();
}

export async function denyNextAppointment(): Promise<boolean> {
  const token = await getAdminToken();
  const apiContext = await request.newContext();
  const pending = await viewPendingQueue(token);

  if (pending.length === 0) {
    console.log('No pending appointments to deny');
    await apiContext.dispose();
    return false;
  }

  const queuePlacement = pending[0].queue_placement;
  console.log(`Denying appointment with queue_placement: ${queuePlacement}`);

  const response = await apiContext.put(`${BACKOFFICE_URL}/appointments/deny/${queuePlacement}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await apiContext.dispose();
  return response.ok();
}
