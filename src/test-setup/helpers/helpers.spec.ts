/**
 * Test Helpers - Verification Tests
 *
 * Verifies that all test utilities work correctly.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  // Signal helpers
  flushEffects,
  expectSignal,
  createSignalTracker,
  createTestSignal,
  updateSignalAndFlush,

  // Data factory
  TestDataFactory,
} from './index';

describe('Test Helpers Verification', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({}).compileComponents();
  });

  describe('Signal Test Helper', () => {
    it('should flush effects correctly', async () => {
      const count = signal(0);
      count.set(5);
      await flushEffects();
      expect(count()).toBe(5);
    });

    it('should use expectSignal for assertions', async () => {
      const name = signal('John');
      await expectSignal(name).toBe('John');
    });

    it('should track signal changes', async () => {
      const count = signal(0);
      const tracker = createSignalTracker(count);

      await flushEffects();
      count.set(1);
      await flushEffects();
      count.set(2);
      await flushEffects();

      expect(tracker.values).toContain(0);
      expect(tracker.values).toContain(1);
      expect(tracker.values).toContain(2);

      tracker.destroy();
    });

    it('should create test signals with spies', async () => {
      const testSig = createTestSignal('initial');

      expect(testSig.value).toBe('initial');

      await testSig.setAndFlush('updated');
      expect(testSig.value).toBe('updated');
      expect(testSig.set).toHaveBeenCalledWith('updated');
    });

    it('should update signal and flush in one call', async () => {
      const count = signal(0);
      await updateSignalAndFlush(count, 10);
      expect(count()).toBe(10);
    });

    it('should test computed signals', async () => {
      const count = signal(5);
      const doubled = computed(() => count() * 2);

      await expectSignal(doubled).toBe(10);

      count.set(10);
      await expectSignal(doubled).toBe(20);
    });
  });

  describe('Test Data Factory', () => {
    it('should create a user with realistic data', () => {
      const user = TestDataFactory.createUser();

      expect(user.id).toBeDefined();
      expect(user.email).toContain('@');
      expect(user.firstName).toBeDefined();
      expect(user.lastName).toBeDefined();
      expect(user.role).toBe('patient');
      expect(user.accountState).toBe('ACTIVE');
    });

    it('should create user with overrides', () => {
      const user = TestDataFactory.createUser({
        email: 'test@example.com',
        role: 'doctor',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('doctor');
    });

    it('should create a glucose reading', () => {
      const reading = TestDataFactory.createGlucoseReading();

      expect(reading.id).toBeDefined();
      expect(reading.value).toBeGreaterThan(0);
      expect(reading.units).toBe('mg/dL');
      expect(reading.type).toBe('smbg');
      expect(['critical-low', 'low', 'normal', 'high', 'critical-high']).toContain(reading.status);
    });

    it('should create low glucose reading', () => {
      const reading = TestDataFactory.createLowReading();

      expect(reading.value).toBeLessThan(70);
      expect(['critical-low', 'low']).toContain(reading.status);
    });

    it('should create high glucose reading', () => {
      const reading = TestDataFactory.createHighReading();

      expect(reading.value).toBeGreaterThan(180);
      expect(['high', 'critical-high']).toContain(reading.status);
    });

    it('should create reading series sorted by time', () => {
      const readings = TestDataFactory.createReadingSeries(5);

      expect(readings).toHaveLength(5);

      // Should be sorted newest first
      for (let i = 1; i < readings.length; i++) {
        const prevTime = new Date(readings[i - 1].time).getTime();
        const currTime = new Date(readings[i].time).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });

    it('should create unsynced reading', () => {
      const reading = TestDataFactory.createUnsyncedReading();

      expect(reading.synced).toBe(false);
      expect(reading.id).toContain('local_');
    });

    it('should create appointment', () => {
      const appointment = TestDataFactory.createAppointment();

      expect(appointment.id).toBeDefined();
      expect(appointment.userId).toBeDefined();
      expect(appointment.status).toBe('PENDING');
    });

    it('should create auth tokens', () => {
      const tokens = TestDataFactory.createAuthTokens();

      expect(tokens.accessToken).toContain('mock-access-token');
      expect(tokens.refreshToken).toContain('mock-refresh-token');
      expect(tokens.tokenType).toBe('bearer');

      // Should expire in the future
      const expiresAt = new Date(tokens.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create expired tokens', () => {
      const tokens = TestDataFactory.createExpiredTokens();

      const expiresAt = new Date(tokens.expiresAt);
      expect(expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it('should create patient with related data', () => {
      const { user, readings, appointment, tokens } = TestDataFactory.createPatientWithData({
        readingCount: 5,
        hasAppointment: true,
      });

      expect(user).toBeDefined();
      expect(readings).toHaveLength(5);
      expect(appointment).toBeDefined();
      expect(tokens).toBeDefined();
    });

    it('should create complete test scenario', () => {
      const scenario = TestDataFactory.createTestScenario();

      expect(scenario.patient.user.role).toBe('patient');
      expect(scenario.doctor.role).toBe('doctor');
      expect(scenario.pendingReadings).toHaveLength(3);
      expect(scenario.pendingReadings.every(r => !r.synced)).toBe(true);
    });

    it('should generate reproducible data with seed', () => {
      TestDataFactory.setSeed(12345);
      const user1 = TestDataFactory.createUser();

      TestDataFactory.setSeed(12345);
      const user2 = TestDataFactory.createUser();

      expect(user1.firstName).toBe(user2.firstName);
      expect(user1.lastName).toBe(user2.lastName);

      TestDataFactory.resetSeed();
    });
  });
});
