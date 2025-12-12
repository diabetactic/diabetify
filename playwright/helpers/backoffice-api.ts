/**
 * Backoffice API Helper
 *
 * Provides utility functions for interacting with the backoffice API for admin operations.
 */

import { request } from '@playwright/test';

// Backoffice API for admin operations
export const BACKOFFICE_URL = 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
export const ADMIN_USER = process.env.BACKOFFICE_ADMIN_USERNAME || 'admin';
export const ADMIN_PASS = process.env.BACKOFFICE_ADMIN_PASSWORD || 'admin';

/**
 * Get admin token from backoffice
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
 * Reset the appointment queue (clear and ensure open)
 */
export async function resetQueue(token: string): Promise<void> {
  const apiContext = await request.newContext();
  // Using /queue/open because it clears the queue AND opens it (unblocks)
  const response = await apiContext.post(`${BACKOFFICE_URL}/appointments/queue/open`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    console.warn(`Reset queue returned ${response.status()}`);
  }
  await apiContext.dispose();
}

/**
 * View pending appointments in queue
 */
export async function viewPendingQueue(token: string): Promise<any[]> {
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

/**
 * Deny the next pending appointment
 */
export async function denyNextAppointment(token: string): Promise<boolean> {
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

/**
 * Accept the next pending appointment
 */
export async function acceptNextAppointment(token: string): Promise<boolean> {
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

/**
 * Create a resolution for an appointment
 */
export async function createResolution(token: string, appointmentId: number): Promise<boolean> {
  const apiContext = await request.newContext();
  console.log(`Creating resolution for appointment: ${appointmentId}`);

  const resolutionData = {
    appointment_id: appointmentId,
    change_basal_type: 'Lantus',
    change_basal_dose: 25,
    change_basal_time: '22:00',
    change_fast_type: 'Humalog',
    change_ratio: 10,
    change_sensitivity: 40,
    emergency_care: false,
    needed_physical_appointment: false,
    glucose_scale: [],
  };

  const response = await apiContext.post(`${BACKOFFICE_URL}/appointments/create_resolution`, {
    headers: { Authorization: `Bearer ${token}` },
    data: resolutionData,
  });

  if (!response.ok()) {
    console.warn(`Create resolution failed: ${response.status()}`);
  }
  await apiContext.dispose();
  return response.ok();
}
