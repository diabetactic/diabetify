import { Injectable, inject } from '@angular/core';
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

  private readonly INSULIN_DURATION_HOURS = 4;

  checkSafetyGuardrails(calculation: BolusCalculation, readings: MockReading[]): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];

    // 1. Maximum Dose Warning
    const maxBolus = this.mockData.getPatientParams().maxBolus || 15;
    if (calculation.recommendedInsulin > maxBolus) {
      warnings.push({
        type: 'maxDose',
        message: `The recommended dose of ${calculation.recommendedInsulin.toFixed(
          1
        )} units exceeds the maximum of ${maxBolus} units.`,
      });
    }

    // 2. Insulin Stacking Prevention (IOB)
    const iob = this.calculateIOB(readings);
    if (iob > 0) {
      warnings.push({
        type: 'iob',
        message: `You still have an estimated ${iob.toFixed(
          1
        )} units of insulin on board from a recent bolus.`,
      });
    }

    // 3. Low Glucose Warning
    const lowGlucoseThreshold = this.mockData.getPatientParams().lowGlucoseThreshold || 70;
    if (calculation.currentGlucose < lowGlucoseThreshold) {
      warnings.push({
        type: 'lowGlucose',
        message: `Your current glucose of ${calculation.currentGlucose} mg/dL is low. A bolus is not recommended.`,
      });
    }

    return warnings;
  }

  calculateIOB(readings: MockReading[], nowMs: number = Date.now()): number {
    const durationMs = this.INSULIN_DURATION_HOURS * 60 * 60 * 1000;

    const recentBolusReadings = readings
      .filter(r => {
        if (!r.insulin || r.insulin <= 0) return false;
        const elapsedMs = nowMs - new Date(r.date).getTime();
        // Ignore future readings and anything at/after the insulin duration window.
        // Allow elapsedMs === 0 so "just bolused" returns full dose.
        return elapsedMs >= 0 && elapsedMs < durationMs;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (recentBolusReadings.length === 0) {
      return 0;
    }

    const lastBolus = recentBolusReadings[0];
    const elapsedMs = nowMs - new Date(lastBolus.date).getTime();
    if (elapsedMs < 0 || elapsedMs >= durationMs) {
      return 0;
    }

    const dose = lastBolus.insulin!;
    const fractionRemaining = 1 - elapsedMs / durationMs;
    const insulinRemaining = dose * fractionRemaining;

    // Clamp and quantize to avoid tiny floating-point differences across repeated calls.
    const clamped = Math.min(dose, Math.max(0, insulinRemaining));
    const quantized = Math.round(clamped * 10_000) / 10_000;
    return quantized === 0 ? 0 : quantized;
  }

  logAuditEvent(event: string, data: unknown): void {
    this.logger.logAuditEvent(event, data);
  }
}
