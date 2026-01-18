/**
 * Tests for local timezone date grouping in Readings
 */

// Initialize TestBed environment for Vitest
import '../../test-setup';

import { describe, it, expect, vi } from 'vitest';
import type { LocalGlucoseReading } from '@models/glucose-reading.model';
import {
  formatReadingsDateHeader,
  getLocalDateKey,
  groupReadingsByLocalDate,
} from './utils/readings-date-grouping';

const translate = (key: string): string => {
  const translations: Record<string, string> = {
    'common.today': 'Today',
    'common.yesterday': 'Yesterday',
  };
  return translations[key] || key;
};

const createReading = (id: string, time: string): LocalGlucoseReading => ({
  id,
  type: 'smbg',
  time,
  value: 120,
  units: 'mg/dL',
  synced: false,
});

describe('Readings - Date Grouping', () => {
  describe('getLocalDateKey - local timezone', () => {
    it('should use local timezone for date key generation', () => {
      const date = new Date(2025, 0, 15, 23, 30, 0); // January 15, 2025, 11:30 PM
      expect(getLocalDateKey(date)).toBe('2025-01-15');
    });

    it('should handle dates near midnight correctly', () => {
      const date = new Date(2025, 0, 15, 23, 59, 59);
      expect(getLocalDateKey(date)).toBe('2025-01-15');
    });

    it('should handle dates at 12:00 AM correctly', () => {
      const date = new Date(2025, 0, 16, 0, 0, 0);
      expect(getLocalDateKey(date)).toBe('2025-01-16');
    });

    it('should pad single-digit months and days with zero', () => {
      const date = new Date(2025, 0, 5, 12, 0, 0);
      expect(getLocalDateKey(date)).toBe('2025-01-05');
    });

    it('should handle dates in different timezones consistently', () => {
      const date = new Date(2025, 0, 15, 20, 0, 0);
      expect(getLocalDateKey(date)).toBe('2025-01-15');
    });
  });

  describe('groupReadingsByLocalDate - local timezone grouping', () => {
    it('should group readings by local date, not UTC date', () => {
      const readings: LocalGlucoseReading[] = [
        createReading('1', new Date(2025, 0, 15, 22, 0, 0).toISOString()),
        createReading('2', new Date(2025, 0, 15, 23, 30, 0).toISOString()),
      ];

      const grouped = groupReadingsByLocalDate(readings, { language: 'en', translate });

      expect(grouped.length).toBe(1);
      expect(grouped[0].date).toBe('2025-01-15');
      expect(grouped[0].readings.length).toBe(2);
    });

    it('should separate readings on different local dates', () => {
      const readings: LocalGlucoseReading[] = [
        createReading('1', new Date(2025, 0, 15, 23, 59, 0).toISOString()),
        createReading('2', new Date(2025, 0, 16, 0, 1, 0).toISOString()),
      ];

      const grouped = groupReadingsByLocalDate(readings, { language: 'en', translate });

      expect(grouped.length).toBe(2);
      expect(grouped[0].date).toBe('2025-01-16'); // Newest first
      expect(grouped[1].date).toBe('2025-01-15');
    });
  });

  describe('formatReadingsDateHeader - local timezone comparison', () => {
    it('should correctly identify "Today" using local date', () => {
      const now = new Date();
      const todayKey = getLocalDateKey(now);
      const formatted = formatReadingsDateHeader(todayKey, { language: 'en', translate, now });
      expect(formatted).toBe('Today');
    });

    it('should correctly identify "Yesterday" using local date', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);

      const yesterdayKey = getLocalDateKey(yesterday);
      const formatted = formatReadingsDateHeader(yesterdayKey, { language: 'en', translate, now });

      expect(formatted).toBe('Yesterday');
    });

    it('should format other dates using local date', () => {
      const dateKey = '2025-01-15';

      const originalToLocaleDateString = Date.prototype.toLocaleDateString;
      Date.prototype.toLocaleDateString = vi.fn(() => 'Wednesday, January 15');

      const formatted = formatReadingsDateHeader(dateKey, {
        language: 'en',
        translate,
        now: new Date(2025, 0, 20),
      });

      expect(formatted).toBe('Wednesday, January 15');

      Date.prototype.toLocaleDateString = originalToLocaleDateString;
    });
  });

  describe('timezone edge cases', () => {
    it('should handle readings from users in different timezones', () => {
      const utcDate = new Date('2025-01-16T02:00:00.000Z'); // 2 AM UTC

      const reading: LocalGlucoseReading = {
        id: '1',
        type: 'smbg',
        time: utcDate.toISOString(),
        value: 120,
        units: 'mg/dL',
        synced: false,
      };

      const date = new Date(reading.time);
      const dateKey = getLocalDateKey(date);

      const expectedYear = date.getFullYear();
      const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
      const expectedDay = String(date.getDate()).padStart(2, '0');

      expect(dateKey).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`);
    });
  });
});
