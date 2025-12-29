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

  checkSafetyGuardrails(
    calculation: BolusCalculation,
    readings: MockReading[]
  ): SafetyWarning[] {
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

  calculateIOB(readings: MockReading[]): number {
    const now = new Date().getTime();
    let iob = 0;

    const recentBolusReadings = readings
      .filter(
        r =>
          r.insulin &&
          r.insulin > 0 &&
          (now - new Date(r.date).getTime()) / (1000 * 60 * 60) < this.INSULIN_DURATION_HOURS
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (recentBolusReadings.length > 0) {
      const lastBolus = recentBolusReadings[0];
      const hoursSinceBolus = (now - new Date(lastBolus.date).getTime()) / (1000 * 60 * 60);
      const insulinRemaining =
        lastBolus.insulin! * (1 - hoursSinceBolus / this.INSULIN_DURATION_HOURS);
      iob = Math.max(0, insulinRemaining);
    }

    return iob;
  }

  logAuditEvent(event: string, data: unknown): void {
    this.logger.logAuditEvent(event, data);
  }
}
