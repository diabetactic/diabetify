/**
 * ReadingsStatisticsService - Handles glucose statistics calculations
 *
 * Responsibilities:
 * - Calculate average, median, standard deviation
 * - Time in range calculations
 * - Estimated A1C / GMI calculations
 * - Coefficient of variation
 */

import { Injectable } from '@angular/core';
import { LocalGlucoseReading, GlucoseStatistics, GlucoseUnit } from '@models/glucose-reading.model';
import { ReadingsMapperService } from './readings-mapper.service';

/**
 * Default glucose target ranges (mg/dL)
 */
export const DEFAULT_TARGET_MIN = 70;
export const DEFAULT_TARGET_MAX = 180;

/**
 * Nathan/ADAG Formula Constants for eA1C calculation
 *
 * Formula: eA1C(%) = (average glucose mg/dL + INTERCEPT) / SLOPE
 *
 * Reference: Nathan DM, Kuenen J, Borg R, Zheng H, Schoenfeld D, Heine RJ;
 * "Translating the A1C assay into estimated average glucose values."
 * A1c-Derived Average Glucose Study Group. Diabetes Care. 2008 Aug;31(8):1473-8.
 *
 * DOI: https://doi.org/10.2337/dc08-0545
 */
export const NATHAN_FORMULA = {
  /** Intercept constant from ADAG study regression analysis */
  INTERCEPT: 46.7,
  /** Slope constant from ADAG study regression analysis */
  SLOPE: 28.7,
  /** Reference DOI for the study */
  SOURCE: 'https://doi.org/10.2337/dc08-0545',
} as const;

@Injectable({
  providedIn: 'root',
})
export class ReadingsStatisticsService {
  constructor(private mapper: ReadingsMapperService) {}

  // ============================================================================
  // Main Statistics Calculation
  // ============================================================================

  /**
   * Calculate comprehensive statistics for a set of readings
   */
  calculateStatistics(
    readings: LocalGlucoseReading[],
    targetMin = DEFAULT_TARGET_MIN,
    targetMax = DEFAULT_TARGET_MAX,
    displayUnit: GlucoseUnit = 'mg/dL'
  ): GlucoseStatistics {
    if (readings.length === 0) {
      return this.getEmptyStatistics();
    }

    // Convert all values to the target unit
    const values = readings.map(r => this.mapper.convertToUnit(r.value, r.units, displayUnit));

    const average = this.calculateAverage(values);
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = this.calculateMedian(sortedValues);
    const standardDeviation = this.calculateStandardDeviation(values, average);
    const coefficientOfVariation = (standardDeviation / average) * 100;

    // Time in range calculations
    const normalizedMin = this.mapper.convertToUnit(targetMin, 'mg/dL', displayUnit);
    const normalizedMax = this.mapper.convertToUnit(targetMax, 'mg/dL', displayUnit);

    const { timeInRange, timeAboveRange, timeBelowRange } = this.calculateTimeInRange(
      values,
      normalizedMin,
      normalizedMax
    );

    // Estimated A1C (using ADAG formula)
    const estimatedA1C = this.calculateEstimatedA1C(average, displayUnit);

    return {
      average: this.round(average),
      median: this.round(median),
      standardDeviation: this.round(standardDeviation),
      coefficientOfVariation: this.round(coefficientOfVariation),
      timeInRange: this.round(timeInRange),
      timeAboveRange: this.round(timeAboveRange),
      timeBelowRange: this.round(timeBelowRange),
      totalReadings: readings.length,
      estimatedA1C: this.round(estimatedA1C),
      gmi: this.round(estimatedA1C), // GMI is essentially the same as eA1C
    };
  }

  // ============================================================================
  // Basic Statistical Calculations
  // ============================================================================

  /**
   * Calculate average of values
   */
  calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate median from sorted array
   */
  calculateMedian(sortedValues: number[]): number {
    if (sortedValues.length === 0) return 0;
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  // ============================================================================
  // Time in Range Calculations
  // ============================================================================

  /**
   * Calculate time in range percentages
   */
  calculateTimeInRange(
    values: number[],
    targetMin: number,
    targetMax: number
  ): { timeInRange: number; timeAboveRange: number; timeBelowRange: number } {
    if (values.length === 0) {
      return { timeInRange: 0, timeAboveRange: 0, timeBelowRange: 0 };
    }

    const inRange = values.filter(v => v >= targetMin && v <= targetMax).length;
    const aboveRange = values.filter(v => v > targetMax).length;
    const belowRange = values.filter(v => v < targetMin).length;

    return {
      timeInRange: (inRange / values.length) * 100,
      timeAboveRange: (aboveRange / values.length) * 100,
      timeBelowRange: (belowRange / values.length) * 100,
    };
  }

  // ============================================================================
  // A1C / GMI Calculations
  // ============================================================================

  /**
   * Calculate estimated A1C using ADAG (Nathan) formula
   * eA1C(%) = (average glucose mg/dL + INTERCEPT) / SLOPE
   *
   * @see NATHAN_FORMULA for reference to the study
   */
  calculateEstimatedA1C(average: number, unit: GlucoseUnit): number {
    const mgdl = this.mapper.toMgDl(average, unit);
    return (mgdl + NATHAN_FORMULA.INTERCEPT) / NATHAN_FORMULA.SLOPE;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get empty statistics object for when there are no readings
   */
  getEmptyStatistics(): GlucoseStatistics {
    return {
      average: 0,
      median: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      timeInRange: 0,
      timeAboveRange: 0,
      timeBelowRange: 0,
      totalReadings: 0,
      estimatedA1C: 0,
      gmi: 0,
    };
  }

  /**
   * Round to one decimal place
   */
  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
