/**
 * MSW Request Handlers
 *
 * Mock API handlers for integration testing without Docker backend.
 * These handlers simulate the Diabetify backend API responses.
 */
import { http, HttpResponse, delay } from 'msw';

// Base URL for API endpoints
const API_BASE = 'http://localhost:8000';

// Mock data storage (in-memory for test isolation)
let mockReadings: GlucoseReading[] = [];
let mockUser: MockUser | null = null;
let mockAppointment: MockAppointment | null = null;

// Types for mock data
interface GlucoseReading {
  id: string;
  glucose_level: number;
  reading_type: string;
  notes?: string;
  timestamp: string;
  user_id: string;
}

// Backend user response format (matches GatewayUserResponse)
interface MockUser {
  dni: string;
  email: string;
  name: string;
  surname: string;
  blocked: boolean;
  streak: number;
  times_measured: number;
  max_streak: number;
}

interface MockAppointment {
  id: string;
  user_id: string;
  status: 'NONE' | 'PENDING' | 'ACCEPTED' | 'RESOLVED';
  created_at: string;
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to reset mock state between tests
export const resetMockState = () => {
  mockReadings = [];
  mockUser = null;
  mockAppointment = null;
};

// Seed mock data for tests
export const seedMockData = (options?: {
  readings?: GlucoseReading[];
  user?: MockUser;
  appointment?: MockAppointment;
}) => {
  if (options?.readings) mockReadings = options.readings;
  if (options?.user) mockUser = options.user;
  if (options?.appointment) mockAppointment = options.appointment;
};

// Default test user (matches GatewayUserResponse backend format)
const DEFAULT_USER: MockUser = {
  dni: '40123456',
  email: 'test40123456@diabetactic.com',
  name: 'Test',
  surname: 'User',
  blocked: false,
  streak: 5,
  times_measured: 42,
  max_streak: 10,
};

// API Handlers
export const handlers = [
  // ========== Authentication ==========

  // Login - POST /token
  http.post(`${API_BASE}/token`, async ({ request }) => {
    await delay(100); // Simulate network latency

    const formData = await request.formData();
    const username = formData.get('username');
    const password = formData.get('password');

    // Valid test credentials
    const isPrimary = username === '40123456' && password === 'thepassword';
    const isSecondary = username === '40123457' && password === 'thepassword2';
    if (isPrimary || isSecondary) {
      mockUser = {
        ...DEFAULT_USER,
        dni: isSecondary ? '40123457' : DEFAULT_USER.dni,
        email: isSecondary ? 'test40123457@diabetactic.com' : DEFAULT_USER.email,
      };
      return HttpResponse.json({
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        token_type: 'bearer',
        expires_in: 3600,
      });
    }

    // Invalid credentials
    return new HttpResponse(JSON.stringify({ detail: 'Invalid credentials' }), { status: 401 });
  }),

  // Refresh token - POST /token/refresh
  http.post(`${API_BASE}/token/refresh`, async () => {
    await delay(50);

    if (!mockUser) {
      return new HttpResponse(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 });
    }

    return HttpResponse.json({
      access_token: 'mock-refreshed-token-' + Date.now(),
      refresh_token: 'mock-refresh-token-' + Date.now(),
      token_type: 'bearer',
      expires_in: 3600,
    });
  }),

  // ========== User Profile ==========

  // Get current user - GET /users/me
  http.get(`${API_BASE}/users/me`, async () => {
    await delay(50);

    if (!mockUser) {
      return new HttpResponse(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 });
    }

    return HttpResponse.json(mockUser);
  }),

  // Update user profile - PATCH /users/me
  http.patch(`${API_BASE}/users/me`, async ({ request }) => {
    await delay(50);

    if (!mockUser) {
      return new HttpResponse(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 });
    }

    const updates = (await request.json()) as Partial<MockUser>;
    mockUser = { ...mockUser, ...updates };
    return HttpResponse.json(mockUser);
  }),

  // ========== Glucose Readings ==========

  // Get readings - GET /glucose/mine
  http.get(`${API_BASE}/glucose/mine`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const paginatedReadings = mockReadings.slice(offset, offset + limit);

    return HttpResponse.json({
      readings: paginatedReadings,
      total: mockReadings.length,
    });
  }),

  // Create reading - POST /glucose/create
  http.post(`${API_BASE}/glucose/create`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const glucose_level = parseInt(url.searchParams.get('glucose_level') || '0');
    const reading_type = url.searchParams.get('reading_type') || 'OTRO';
    const notes = url.searchParams.get('notes') || '';

    const newReading: GlucoseReading = {
      id: generateId(),
      glucose_level,
      reading_type,
      notes,
      timestamp: new Date().toISOString(),
      user_id: mockUser?.dni || '40123456',
    };

    mockReadings.unshift(newReading);

    // Update user stats
    if (mockUser) {
      mockUser.times_measured++;
      mockUser.streak++;
    }

    return HttpResponse.json(newReading, { status: 201 });
  }),

  // Update reading - PUT /glucose/{id}
  http.put(`${API_BASE}/glucose/:id`, async ({ params, request }) => {
    await delay(50);

    const { id } = params;
    const updates = (await request.json()) as Partial<GlucoseReading>;

    const index = mockReadings.findIndex(r => r.id === id);
    if (index === -1) {
      return new HttpResponse(JSON.stringify({ detail: 'Reading not found' }), { status: 404 });
    }

    mockReadings[index] = { ...mockReadings[index], ...updates };
    return HttpResponse.json(mockReadings[index]);
  }),

  // Delete reading - DELETE /glucose/{id}
  http.delete(`${API_BASE}/glucose/:id`, async ({ params }) => {
    await delay(50);

    const { id } = params;
    const index = mockReadings.findIndex(r => r.id === id);

    if (index === -1) {
      return new HttpResponse(JSON.stringify({ detail: 'Reading not found' }), { status: 404 });
    }

    mockReadings.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ========== Appointments ==========

  // Get appointment status - GET /appointments/status
  http.get(`${API_BASE}/appointments/status`, async () => {
    await delay(50);

    if (!mockAppointment) {
      return HttpResponse.json({ status: 'NONE' });
    }

    return HttpResponse.json(mockAppointment);
  }),

  // Request appointment - POST /appointments/queue/enter
  http.post(`${API_BASE}/appointments/queue/enter`, async () => {
    await delay(100);

    mockAppointment = {
      id: generateId(),
      user_id: mockUser?.dni || '40123456',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    return HttpResponse.json(mockAppointment, { status: 201 });
  }),

  // ========== Health Check ==========

  http.get(`${API_BASE}/health`, async () => {
    return HttpResponse.json({ status: 'healthy' });
  }),

  // ========== Fallback for unhandled requests ==========
  http.all('*', ({ request }) => {
    // Return error without logging to avoid console noise in tests
    return HttpResponse.json({ error: 'Not mocked', url: request.url }, { status: 500 });
  }),
];

// Export individual handler groups for selective use
export const authHandlers = handlers.filter(h => h.info.path.toString().includes('/token'));

export const readingsHandlers = handlers.filter(h => h.info.path.toString().includes('/glucose'));

export const appointmentsHandlers = handlers.filter(h =>
  h.info.path.toString().includes('/appointments')
);
