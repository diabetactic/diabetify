import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BolusCalculation, MockDataService, MockReading } from './mock-data.service';
import { LoggerService } from './logger.service';

export interface SafetyWarning {
  type: 'maxDose' | 'iob' | 'lowGlucose';
  message: string;
  acknowledged?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BolusSafetyService {
  private logger = inject(LoggerService);
  private mockData = inject(MockDataService);
  private translate = inject(TranslateService);

  private readonly INSULIN_DURATION_HOURS = 4;

  checkSafetyGuardrails(calculation: BolusCalculation, readings: MockReading[]): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];

    // 1. Maximum Dose Warning
    const maxBolus = this.mockData.getPatientParams().maxBolus || 15;
    if (calculation.recommendedInsulin > maxBolus) {
      warnings.push({
        type: 'maxDose',
        message: this.translate.instant('bolusCalculator.warnings.maxDose', {
          recommended: calculation.recommendedInsulin.toFixed(1),
          max: maxBolus,
        }),
      });
    }

    // 2. Insulin Stacking Prevention (IOB)
    const iob = this.calculateIOB(readings);
    if (iob > 0) {
      warnings.push({
        type: 'iob',
        message: this.translate.instant('bolusCalculator.warnings.iob', {
          iob: iob.toFixed(1),
        }),
      });
    }

    // 3. Low Glucose Warning
    const lowGlucoseThreshold = this.mockData.getPatientParams().lowGlucoseThreshold || 70;
    if (calculation.currentGlucose < lowGlucoseThreshold) {
      warnings.push({
        type: 'lowGlucose',
        message: this.translate.instant('bolusCalculator.warnings.lowGlucose', {
          glucose: calculation.currentGlucose,
        }),
      });
    }

    return warnings;
  }

  calculateIOB(readings: MockReading[], nowMs: number = Date.now()): number {
    const durationMs = this.INSULIN_DURATION_HOURS * 60 * 60 * 1000;
    let totalIOB = 0;

    readings.forEach(r => {
      if (!r.insulin || r.insulin <= 0) return;

      // Validate date format - skip invalid readings with warning
      const readingTime = new Date(r.date).getTime();
      if (isNaN(readingTime)) {
        this.logger.warn('IOB', `Invalid date format in reading: ${r.date}`);
        return;
      }

      const elapsedMs = nowMs - readingTime;

      // Only consider readings within the insulin duration window and not in the future.
      if (elapsedMs >= 0 && elapsedMs < durationMs) {
        // Quantize elapsed time to the nearest second to avoid millisecond-level jitter
        // affecting rounding at 0.1U precision (important for deterministic safety checks).
        const elapsedMsQuantized = Math.round(elapsedMs / 1000) * 1000;
        const fractionRemaining = Math.max(0, 1 - elapsedMsQuantized / durationMs);
        totalIOB += r.insulin * fractionRemaining;
      }
    });

    // Clamp and quantize to avoid tiny floating-point differences.
    const quantized = Math.round(totalIOB * 10) / 10;
    return quantized < 0.1 ? 0 : quantized;
  }

  logAuditEvent(event: string, data: unknown): void {
    this.logger.logAuditEvent(event, data);
  }
}
