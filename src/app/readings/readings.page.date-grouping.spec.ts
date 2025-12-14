/**
 * Tests for local timezone date grouping in ReadingsPage
 */

// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ReadingsPage } from './readings.page';
import { ReadingsService } from '@core/services/readings.service';
import { ProfileService } from '@core/services/profile.service';
import { TranslationService } from '@core/services/translation.service';
import { LoggerService } from '@core/services/logger.service';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';

describe('ReadingsPage - Date Grouping', () => {
  let component: ReadingsPage;
  let fixture: ComponentFixture<ReadingsPage>;
  let mockReadingsService: jest.Mocked<ReadingsService>;
  let mockProfileService: jest.Mocked<ProfileService>;
  let mockTranslationService: jest.Mocked<TranslationService>;

  beforeEach(async () => {
    // Mock services
    mockReadingsService = {
      readings$: of([]),
      performFullSync: jest.fn().mockResolvedValue({ fetched: 0, pushed: 0, failed: 0 }),
    } as unknown as jest.Mocked<ReadingsService>;

    mockProfileService = {
      profile$: of({ preferences: { glucoseUnit: 'mg/dL' } }),
    } as unknown as jest.Mocked<ProfileService>;

    mockTranslationService = {
      instant: jest.fn((key: string) => {
        const translations: Record<string, string> = {
          'common.today': 'Today',
          'common.yesterday': 'Yesterday',
        };
        return translations[key] || key;
      }),
      getCurrentLanguage: jest.fn().mockReturnValue('en'),
    } as unknown as jest.Mocked<TranslationService>;

    const mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const mockRouter = {
      navigate: jest.fn(),
    };

    const mockToastController = {
      create: jest.fn().mockResolvedValue({
        present: jest.fn(),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ReadingsPage, TranslateModule.forRoot()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: Router, useValue: mockRouter },
        { provide: ToastController, useValue: mockToastController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingsPage);
    component = fixture.componentInstance;
  });

  describe('getDateKey - local timezone', () => {
    it('should use local timezone for date key generation', () => {
      // Create a date at 11:30 PM local time
      const date = new Date(2025, 0, 15, 23, 30, 0); // January 15, 2025, 11:30 PM

      const dateKey = (component as any).getDateKey(date);

      // Should use local date components, not UTC
      expect(dateKey).toBe('2025-01-15');
    });

    it('should handle dates near midnight correctly', () => {
      // Create a date at 11:59 PM local time on January 15
      const date = new Date(2025, 0, 15, 23, 59, 59);

      const dateKey = (component as any).getDateKey(date);

      // Should still be January 15 in local timezone
      expect(dateKey).toBe('2025-01-15');
    });

    it('should handle dates at 12:00 AM correctly', () => {
      // Create a date at 12:00 AM local time on January 16
      const date = new Date(2025, 0, 16, 0, 0, 0);

      const dateKey = (component as any).getDateKey(date);

      // Should be January 16 in local timezone
      expect(dateKey).toBe('2025-01-16');
    });

    it('should pad single-digit months and days with zero', () => {
      // Create a date on January 5 (single-digit month and day)
      const date = new Date(2025, 0, 5, 12, 0, 0); // January 5, 2025

      const dateKey = (component as any).getDateKey(date);

      expect(dateKey).toBe('2025-01-05');
    });

    it('should handle dates in different timezones consistently', () => {
      // Create a date that might have different UTC vs local dates
      // e.g., 1 AM on Jan 16 in UTC-5 is still Jan 15, 8 PM local
      const date = new Date(2025, 0, 15, 20, 0, 0); // January 15, 8 PM local

      const dateKey = (component as any).getDateKey(date);

      // Should use local date (Jan 15), not UTC date
      expect(dateKey).toBe('2025-01-15');
    });
  });

  describe('groupReadingsByDate - local timezone grouping', () => {
    it('should group readings by local date, not UTC date', () => {
      // Create readings that span midnight in UTC but are same day locally
      const readings: LocalGlucoseReading[] = [
        {
          id: '1',
          localId: '1',
          time: new Date(2025, 0, 15, 22, 0, 0).toISOString(), // Jan 15, 10 PM local
          value: 120,
          units: 'mg/dL',
          type: 'smbg',
          subType: 'manual',
          deviceId: 'test',
          userId: 'user1',
          synced: false,
          localStoredAt: new Date().toISOString(),
          isLocalOnly: false,
          status: 'normal',
        },
        {
          id: '2',
          localId: '2',
          time: new Date(2025, 0, 15, 23, 30, 0).toISOString(), // Jan 15, 11:30 PM local
          value: 130,
          units: 'mg/dL',
          type: 'smbg',
          subType: 'manual',
          deviceId: 'test',
          userId: 'user1',
          synced: false,
          localStoredAt: new Date().toISOString(),
          isLocalOnly: false,
          status: 'normal',
        },
      ];

      const grouped = (component as any).groupReadingsByDate(readings);

      // Both readings should be in the same group (same local date)
      expect(grouped.length).toBe(1);
      expect(grouped[0].date).toBe('2025-01-15');
      expect(grouped[0].readings.length).toBe(2);
    });

    it('should separate readings on different local dates', () => {
      const readings: LocalGlucoseReading[] = [
        {
          id: '1',
          localId: '1',
          time: new Date(2025, 0, 15, 23, 59, 0).toISOString(), // Jan 15, 11:59 PM
          value: 120,
          units: 'mg/dL',
          type: 'smbg',
          subType: 'manual',
          deviceId: 'test',
          userId: 'user1',
          synced: false,
          localStoredAt: new Date().toISOString(),
          isLocalOnly: false,
          status: 'normal',
        },
        {
          id: '2',
          localId: '2',
          time: new Date(2025, 0, 16, 0, 1, 0).toISOString(), // Jan 16, 12:01 AM
          value: 130,
          units: 'mg/dL',
          type: 'smbg',
          subType: 'manual',
          deviceId: 'test',
          userId: 'user1',
          synced: false,
          localStoredAt: new Date().toISOString(),
          isLocalOnly: false,
          status: 'normal',
        },
      ];

      const grouped = (component as any).groupReadingsByDate(readings);

      // Should be in separate groups (different local dates)
      expect(grouped.length).toBe(2);
      expect(grouped[0].date).toBe('2025-01-16'); // Newest first
      expect(grouped[1].date).toBe('2025-01-15');
    });
  });

  describe('formatDateHeader - local timezone comparison', () => {
    it('should correctly identify "Today" using local date', () => {
      const now = new Date();
      const todayKey = (component as any).getDateKey(now);

      const formatted = (component as any).formatDateHeader(todayKey);

      expect(formatted).toBe('Today');
    });

    it('should correctly identify "Yesterday" using local date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = (component as any).getDateKey(yesterday);

      const formatted = (component as any).formatDateHeader(yesterdayKey);

      expect(formatted).toBe('Yesterday');
    });

    it('should format other dates using local date', () => {
      const dateKey = '2025-01-15';

      // Mock toLocaleDateString
      const originalToLocaleDateString = Date.prototype.toLocaleDateString;
      Date.prototype.toLocaleDateString = jest.fn(() => 'Wednesday, January 15');

      const formatted = (component as any).formatDateHeader(dateKey);

      expect(formatted).toBe('Wednesday, January 15');

      // Restore original
      Date.prototype.toLocaleDateString = originalToLocaleDateString;
    });
  });

  describe('timezone edge cases', () => {
    it('should handle readings from users in different timezones', () => {
      // Reading stored in UTC but should be grouped by local timezone
      const utcDate = new Date('2025-01-16T02:00:00.000Z'); // 2 AM UTC
      // In UTC-5 (EST), this is Jan 15, 9 PM
      // In UTC+1 (CET), this is Jan 16, 3 AM

      const reading: LocalGlucoseReading = {
        id: '1',
        localId: '1',
        time: utcDate.toISOString(),
        value: 120,
        units: 'mg/dL',
        type: 'smbg',
        subType: 'manual',
        deviceId: 'test',
        userId: 'user1',
        synced: false,
        localStoredAt: new Date().toISOString(),
        isLocalOnly: false,
        status: 'normal',
      };

      // Should use local date for grouping
      const date = new Date(reading.time);
      const dateKey = (component as any).getDateKey(date);

      // The date key should match the local date, not UTC date
      const expectedYear = date.getFullYear();
      const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
      const expectedDay = String(date.getDate()).padStart(2, '0');

      expect(dateKey).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`);
    });
  });
});
