import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BolusCalculation } from './mock-data.service';
import { PreferencesService } from './preferences.service';
import { LoggerService } from './logger.service';

export interface SafetyWarning {
  type: 'maxDose' | 'lowGlucose';
  message: string;
  acknowledged?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BolusSafetyService {
  private logger = inject(LoggerService);
  private prefs = inject(PreferencesService);
  private translate = inject(TranslateService);

  checkSafetyGuardrails(calculation: BolusCalculation): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];
    const { maxBolus, lowGlucoseThreshold } = this.prefs.getCurrentPreferences().safety;

    if (calculation.recommendedInsulin > maxBolus) {
      warnings.push({
        type: 'maxDose',
        message: this.translate.instant('bolusCalculator.warnings.maxDose', {
          recommended: calculation.recommendedInsulin.toFixed(1),
          max: maxBolus,
        }),
      });
    }

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

  logAuditEvent(event: string, data: unknown): void {
    this.logger.logAuditEvent(event, data);
  }
}
