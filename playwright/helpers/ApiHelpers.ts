/**
 * API Helpers for Playwright E2E Tests
 *
 * This file contains utility functions for interacting with the backoffice API.
 * These functions are used to set up test data, check application state, and
 * perform actions that are difficult or time-consuming to do through the UI.
 */
import { request } from '@playwright/test';

const BACKOFFICE_URL =
  process.env.BACKOFFICE_URL || 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';

/**
 * Gets an admin token from the backoffice API.
 * @returns The admin access token.
 */
export async function getAdminToken(): Promise<string> {
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

/**
 * Resets the appointment queue by clearing it and ensuring it is open.
 * @param token - The admin access token.
 */
export async function resetQueue(token: string): Promise<void> {
  const apiContext = await request.newContext();
  const response = await apiContext.post(`${BACKOFFICE_URL}/appointments/queue/open`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    console.warn(`Reset queue returned ${response.status()}`);
  }
  await apiContext.dispose();
}

/**
 * Accepts the next pending appointment in the queue.
 * @param token - The admin access token.
 * @returns A boolean indicating whether the appointment was accepted.
 */
export async function acceptNextAppointment(token: string): Promise<boolean> {
  const apiContext = await request.newContext();
  const pending = await viewPendingQueue(token);

  if (pending.length === 0) {
    await apiContext.dispose();
    return false;
  }

  const queuePlacement = pending[0].queue_placement;
  const response = await apiContext.put(`${BACKOFFICE_URL}/appointments/accept/${queuePlacement}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await apiContext.dispose();
  return response.ok();
}

/**
 * Views the pending appointments in the queue.
 * @param token - The admin access token.
 * @returns A promise that resolves to an array of pending appointments.
 */
async function viewPendingQueue(token: string): Promise<any[]> {
  const apiContext = await request.newContext();
  const response = await apiContext.get(`${BACKOFFICE_URL}/appointments/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    await apiContext.dispose();
    return [];
  }

  const data = await response.json();
  await apiContext.dispose();
  return Array.isArray(data) ? data : [];
}
