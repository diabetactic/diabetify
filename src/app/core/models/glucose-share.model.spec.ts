/**
 * Unit tests for glucose sharing models
 * Tests interfaces and type definitions for sharing functionality
 */

import {
  GlucoseReadingSummary,
  GlucoseShareRequest,
  GlucoseShareResponse,
  GlucoseShareStatus,
  GlucoseShareQueueEntry,
  ProviderAccessLog,
} from '@models/glucose-share.model';

describe('GlucoseShareModel', () => {
  describe('GlucoseReadingSummary interface', () => {
    it('should accept valid summary', () => {
      const summary: GlucoseReadingSummary = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-14T23:59:59Z',
        daysOfData: 14,
        totalReadings: 672,
        averageGlucose: 125,
        medianGlucose: 120,
        standardDeviation: 30,
        coefficientOfVariation: 24,
        timeInRange: {
          veryLow: 2,
          low: 5,
          normal: 75,
          high: 15,
          veryHigh: 3,
        },
        readingTypes: {
          manual: 20,
          cgm: 650,
          meter: 2,
        },
      };
      expect(summary.daysOfData).toBe(14);
      expect(summary.totalReadings).toBe(672);
      expect(summary.timeInRange.normal).toBe(75);
    });

    it('should accept summary with estimated values', () => {
      const summary: GlucoseReadingSummary = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-14T23:59:59Z',
        daysOfData: 14,
        totalReadings: 672,
        averageGlucose: 125,
        medianGlucose: 120,
        standardDeviation: 30,
        coefficientOfVariation: 24,
        estimatedHbA1c: 6.3,
        estimatedGMI: 6.1,
        timeInRange: {
          veryLow: 2,
          low: 5,
          normal: 75,
          high: 15,
          veryHigh: 3,
        },
        readingTypes: {
          manual: 20,
          cgm: 650,
          meter: 2,
        },
      };
      expect(summary.estimatedHbA1c).toBe(6.3);
      expect(summary.estimatedGMI).toBe(6.1);
    });

    it('should accept summary with daily averages', () => {
      const summary: GlucoseReadingSummary = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-14T23:59:59Z',
        daysOfData: 14,
        totalReadings: 672,
        averageGlucose: 125,
        medianGlucose: 120,
        standardDeviation: 30,
        coefficientOfVariation: 24,
        timeInRange: {
          veryLow: 2,
          low: 5,
          normal: 75,
          high: 15,
          veryHigh: 3,
        },
        dailyAverages: {
          morning: 120,
          afternoon: 130,
          evening: 125,
          night: 115,
        },
        readingTypes: {
          manual: 20,
          cgm: 650,
          meter: 2,
        },
      };
      expect(summary.dailyAverages?.morning).toBe(120);
      expect(summary.dailyAverages?.night).toBe(115);
    });

    it('should have valid time in range percentages', () => {
      const summary: GlucoseReadingSummary = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-14T23:59:59Z',
        daysOfData: 14,
        totalReadings: 672,
        averageGlucose: 125,
        medianGlucose: 120,
        standardDeviation: 30,
        coefficientOfVariation: 24,
        timeInRange: {
          veryLow: 1,
          low: 4,
          normal: 80,
          high: 12,
          veryHigh: 3,
        },
        readingTypes: {
          manual: 20,
          cgm: 650,
          meter: 2,
        },
      };
      const total =
        summary.timeInRange.veryLow +
        summary.timeInRange.low +
        summary.timeInRange.normal +
        summary.timeInRange.high +
        summary.timeInRange.veryHigh;
      expect(total).toBe(100);
    });
  });

  describe('GlucoseShareRequest interface', () => {
    it('should accept summary share request', () => {
      const request: GlucoseShareRequest = {
        appointmentId: 'appt123',
        shareType: 'summary',
        summary: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-14T23:59:59Z',
          daysOfData: 14,
          totalReadings: 672,
          averageGlucose: 125,
          medianGlucose: 120,
          standardDeviation: 30,
          coefficientOfVariation: 24,
          timeInRange: {
            veryLow: 2,
            low: 5,
            normal: 75,
            high: 15,
            veryHigh: 3,
          },
          readingTypes: {
            manual: 20,
            cgm: 650,
            meter: 2,
          },
        },
        userConsent: true,
        consentTimestamp: '2024-01-15T10:00:00Z',
      };
      expect(request.shareType).toBe('summary');
      expect(request.userConsent).toBe(true);
    });

    it('should accept detailed share request with raw readings', () => {
      const request: GlucoseShareRequest = {
        appointmentId: 'appt123',
        shareType: 'detailed',
        summary: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-14T23:59:59Z',
          daysOfData: 14,
          totalReadings: 2,
          averageGlucose: 125,
          medianGlucose: 120,
          standardDeviation: 30,
          coefficientOfVariation: 24,
          timeInRange: {
            veryLow: 0,
            low: 0,
            normal: 100,
            high: 0,
            veryHigh: 0,
          },
          readingTypes: {
            manual: 2,
            cgm: 0,
            meter: 0,
          },
        },
        rawReadings: [
          {
            id: 'reading1',
            type: 'smbg',
            time: '2024-01-01T08:00:00Z',
            value: 120,
            units: 'mg/dL',
            synced: true,
          },
          {
            id: 'reading2',
            type: 'smbg',
            time: '2024-01-01T12:00:00Z',
            value: 130,
            units: 'mg/dL',
            synced: true,
          },
        ],
        userConsent: true,
        consentTimestamp: '2024-01-15T10:00:00Z',
      };
      expect(request.shareType).toBe('detailed');
      expect(request.rawReadings?.length).toBe(2);
    });

    it('should accept request with optional metadata', () => {
      const request: GlucoseShareRequest = {
        appointmentId: 'appt123',
        shareType: 'summary',
        summary: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-14T23:59:59Z',
          daysOfData: 14,
          totalReadings: 672,
          averageGlucose: 125,
          medianGlucose: 120,
          standardDeviation: 30,
          coefficientOfVariation: 24,
          timeInRange: {
            veryLow: 2,
            low: 5,
            normal: 75,
            high: 15,
            veryHigh: 3,
          },
          readingTypes: {
            manual: 20,
            cgm: 650,
            meter: 2,
          },
        },
        userConsent: true,
        consentTimestamp: '2024-01-15T10:00:00Z',
        notes: 'Please review recent patterns',
        shareReason: 'Routine consultation',
      };
      expect(request.notes).toBe('Please review recent patterns');
      expect(request.shareReason).toBe('Routine consultation');
    });
  });

  describe('GlucoseShareResponse interface', () => {
    it('should accept successful response', () => {
      const response: GlucoseShareResponse = {
        success: true,
        shareId: 'share123',
        appointmentId: 'appt123',
        recordCount: 672,
        sharedAt: '2024-01-15T10:30:00Z',
      };
      expect(response.success).toBe(true);
      expect(response.shareId).toBe('share123');
      expect(response.recordCount).toBe(672);
    });

    it('should accept response with expiration', () => {
      const response: GlucoseShareResponse = {
        success: true,
        shareId: 'share123',
        appointmentId: 'appt123',
        recordCount: 672,
        sharedAt: '2024-01-15T10:30:00Z',
        expiresAt: '2024-02-15T10:30:00Z',
      };
      expect(response.expiresAt).toBe('2024-02-15T10:30:00Z');
    });

    it('should accept response with message', () => {
      const response: GlucoseShareResponse = {
        success: false,
        shareId: '',
        appointmentId: 'appt123',
        recordCount: 0,
        sharedAt: '2024-01-15T10:30:00Z',
        message: 'Insufficient data for sharing',
      };
      expect(response.success).toBe(false);
      expect(response.message).toBe('Insufficient data for sharing');
    });
  });

  describe('GlucoseShareStatus interface', () => {
    it('should accept not_shared status', () => {
      const status: GlucoseShareStatus = {
        appointmentId: 'appt123',
        status: 'not_shared',
      };
      expect(status.status).toBe('not_shared');
    });

    it('should accept shared status with metadata', () => {
      const status: GlucoseShareStatus = {
        appointmentId: 'appt123',
        sharedAt: '2024-01-15T10:30:00Z',
        recordCount: 672,
        shareType: 'summary',
        status: 'shared',
      };
      expect(status.status).toBe('shared');
      expect(status.recordCount).toBe(672);
    });

    it('should accept all status values', () => {
      const statuses: GlucoseShareStatus['status'][] = ['not_shared', 'shared', 'expired', 'error'];
      statuses.forEach(statusValue => {
        const status: GlucoseShareStatus = {
          appointmentId: 'appt123',
          status: statusValue,
        };
        expect(status.status).toBe(statusValue);
      });
    });

    it('should accept error status with message', () => {
      const status: GlucoseShareStatus = {
        appointmentId: 'appt123',
        status: 'error',
        errorMessage: 'Network error during sharing',
      };
      expect(status.status).toBe('error');
      expect(status.errorMessage).toBe('Network error during sharing');
    });
  });

  describe('GlucoseShareQueueEntry interface', () => {
    it('should accept queue entry', () => {
      const entry: GlucoseShareQueueEntry = {
        id: 'queue123',
        appointmentId: 'appt123',
        request: {
          appointmentId: 'appt123',
          shareType: 'summary',
          summary: {
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-01-14T23:59:59Z',
            daysOfData: 14,
            totalReadings: 672,
            averageGlucose: 125,
            medianGlucose: 120,
            standardDeviation: 30,
            coefficientOfVariation: 24,
            timeInRange: {
              veryLow: 2,
              low: 5,
              normal: 75,
              high: 15,
              veryHigh: 3,
            },
            readingTypes: {
              manual: 20,
              cgm: 650,
              meter: 2,
            },
          },
          userConsent: true,
          consentTimestamp: '2024-01-15T10:00:00Z',
        },
        createdAt: '2024-01-15T10:00:00Z',
        attempts: 0,
      };
      expect(entry.id).toBe('queue123');
      expect(entry.attempts).toBe(0);
    });

    it('should accept queue entry with retry attempts', () => {
      const entry: GlucoseShareQueueEntry = {
        id: 'queue123',
        appointmentId: 'appt123',
        request: {
          appointmentId: 'appt123',
          shareType: 'summary',
          summary: {
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-01-14T23:59:59Z',
            daysOfData: 14,
            totalReadings: 672,
            averageGlucose: 125,
            medianGlucose: 120,
            standardDeviation: 30,
            coefficientOfVariation: 24,
            timeInRange: {
              veryLow: 2,
              low: 5,
              normal: 75,
              high: 15,
              veryHigh: 3,
            },
            readingTypes: {
              manual: 20,
              cgm: 650,
              meter: 2,
            },
          },
          userConsent: true,
          consentTimestamp: '2024-01-15T10:00:00Z',
        },
        createdAt: '2024-01-15T10:00:00Z',
        attempts: 3,
        lastAttempt: '2024-01-15T12:00:00Z',
        error: 'Network timeout',
      };
      expect(entry.attempts).toBe(3);
      expect(entry.lastAttempt).toBe('2024-01-15T12:00:00Z');
      expect(entry.error).toBe('Network timeout');
    });
  });

  describe('ProviderAccessLog interface', () => {
    it('should accept access log entry', () => {
      const log: ProviderAccessLog = {
        id: 'log123',
        appointmentId: 'appt123',
        providerId: 'provider456',
        providerName: 'Dr. Smith',
        accessedAt: '2024-01-16T09:00:00Z',
        dataType: 'summary',
      };
      expect(log.providerId).toBe('provider456');
      expect(log.providerName).toBe('Dr. Smith');
      expect(log.dataType).toBe('summary');
    });

    it('should accept log with IP address', () => {
      const log: ProviderAccessLog = {
        id: 'log123',
        appointmentId: 'appt123',
        providerId: 'provider456',
        providerName: 'Dr. Smith',
        accessedAt: '2024-01-16T09:00:00Z',
        dataType: 'detailed',
        ipAddress: '192.168.1.100',
      };
      expect(log.ipAddress).toBe('192.168.1.100');
      expect(log.dataType).toBe('detailed');
    });
  });
});
