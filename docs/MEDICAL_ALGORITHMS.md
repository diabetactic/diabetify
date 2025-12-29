# Medical Algorithms Documentation

## Medical Disclaimer

**IMPORTANT: Diabetify is a diabetes management assistance tool, NOT a medical device.**

This application is designed to help users track glucose readings, calculate insulin doses, and monitor trends. It is intended for educational and personal tracking purposes only.

- **Do not use this application as a substitute for professional medical advice, diagnosis, or treatment.**
- **Always consult with your healthcare provider before making any changes to your diabetes management plan.**
- **Insulin dosing decisions should always be verified with your medical team.**
- **In case of emergency or severe hypoglycemia/hyperglycemia, seek immediate medical attention.**

The algorithms implemented in this application are based on established clinical guidelines but may not account for individual patient factors that only a healthcare provider can assess.

---

## Table of Contents

1. [Glucose Units and Conversion](#glucose-units-and-conversion)
2. [Glucose Status Classification](#glucose-status-classification)
3. [Insulin On Board (IOB) Calculation](#insulin-on-board-iob-calculation)
4. [Bolus Calculator](#bolus-calculator)
5. [Statistical Formulas](#statistical-formulas)
6. [Clinical References](#clinical-references)

---

## Glucose Units and Conversion

### Overview

Blood glucose can be measured in two units:

- **mg/dL** (milligrams per deciliter) - Used primarily in the United States, Japan, and some other countries
- **mmol/L** (millimoles per liter) - Used in most other countries including Europe, Australia, and Canada

### Conversion Formula

```
mg/dL = mmol/L x 18.0182
mmol/L = mg/dL / 18.0182
```

The conversion factor 18.0182 is derived from the molecular weight of glucose (180.182 g/mol) divided by 10.

### Implementation Reference

From `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Convert glucose value between units
 */
private convertToUnit(value: number, from: GlucoseUnit, to: GlucoseUnit): number {
  if (from === to) return value;

  if (from === 'mmol/L' && to === 'mg/dL') {
    return value * 18.0182;
  } else if (from === 'mg/dL' && to === 'mmol/L') {
    return value / 18.0182;
  }

  return value;
}
```

### Quick Reference Table

| mg/dL | mmol/L |
| ----- | ------ |
| 54    | 3.0    |
| 70    | 3.9    |
| 100   | 5.6    |
| 120   | 6.7    |
| 180   | 10.0   |
| 250   | 13.9   |

---

## Glucose Status Classification

### Overview

The application classifies glucose readings into five categories based on established clinical thresholds. These classifications help users quickly understand their glycemic status.

### Classification Table

| Status                                   | Range (mg/dL) | Range (mmol/L) | Clinical Significance                                                                                     |
| ---------------------------------------- | ------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| **Critical Low (Severe Hypoglycemia)**   | < 54          | < 3.0          | Requires immediate treatment. Associated with increased risk of severe cognitive impairment and seizures. |
| **Low (Hypoglycemia)**                   | 54 - 69       | 3.0 - 3.8      | Alert value. Treatment recommended to prevent progression to severe hypoglycemia.                         |
| **Normal (In Range)**                    | 70 - 179      | 3.9 - 9.9      | Target range for most people with diabetes. Associated with reduced risk of complications.                |
| **High (Hyperglycemia)**                 | 180 - 250     | 10.0 - 13.9    | Above target. May require correction dose. Persistent elevation increases complication risk.              |
| **Critical High (Severe Hyperglycemia)** | > 250         | > 13.9         | Significantly elevated. Check for ketones (Type 1). May indicate need for medical attention.              |

### Implementation Reference

From `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Calculate glucose status based on value and ranges
 */
private calculateGlucoseStatus(
  value: number,
  unit: GlucoseUnit
): 'low' | 'normal' | 'high' | 'critical-low' | 'critical-high' {
  // Convert to mg/dL for consistent comparison
  const mgdl = unit === 'mmol/L' ? value * 18.0182 : value;

  if (mgdl < 54) return 'critical-low';
  if (mgdl < 70) return 'low';
  if (mgdl > 250) return 'critical-high';
  if (mgdl >= 180) return 'high';
  return 'normal';
}
```

### Clinical Basis

These thresholds are based on:

- **ADA Standards of Medical Care in Diabetes 2024**: Defines hypoglycemia Level 1 as < 70 mg/dL and Level 2 (clinically significant) as < 54 mg/dL
- **International Hypoglycaemia Study Group**: Consensus on glucose thresholds for clinical trials
- **Time in Range (TIR) International Consensus**: Defines target range as 70-180 mg/dL for most adults with diabetes

---

## Insulin On Board (IOB) Calculation

### Overview

Insulin On Board (IOB) represents the amount of active insulin remaining in the body from previous bolus doses. Calculating IOB is critical for preventing "insulin stacking" - taking additional insulin before the previous dose has been fully utilized, which can lead to hypoglycemia.

### Algorithm

The application uses a **linear decay model** with a 4-hour insulin duration:

```
IOB = Dose x (1 - hours_since_bolus / insulin_duration)
```

Where:

- **Dose**: The original bolus amount in units
- **hours_since_bolus**: Time elapsed since the bolus was administered
- **insulin_duration**: 4 hours (standard for rapid-acting insulin analogs)

### Mathematical Representation

```
IOB(t) = D * max(0, 1 - t/4)

Where:
  D = initial bolus dose (units)
  t = time since bolus (hours)
  4 = insulin duration (hours)
```

### Implementation Reference

From `src/app/core/services/bolus-safety.service.ts`:

```typescript
private readonly INSULIN_DURATION_HOURS = 4;

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
```

### IOB Decay Example

For a 10-unit bolus:

| Time Since Bolus | IOB Remaining | Calculation          |
| ---------------- | ------------- | -------------------- |
| 0 hours          | 10.0 units    | 10 x (1 - 0/4) = 10  |
| 1 hour           | 7.5 units     | 10 x (1 - 1/4) = 7.5 |
| 2 hours          | 5.0 units     | 10 x (1 - 2/4) = 5   |
| 3 hours          | 2.5 units     | 10 x (1 - 3/4) = 2.5 |
| 4 hours          | 0.0 units     | 10 x (1 - 4/4) = 0   |

### Why 4 Hours?

The 4-hour duration of insulin action (DIA) is based on:

1. **Pharmacokinetic studies** of rapid-acting insulin analogs (lispro, aspart, glulisine) showing clinically significant activity typically ending at 4-5 hours
2. **Clinical consensus** in insulin pump therapy (Walsh, "Pumping Insulin", 7th edition)
3. **Balance between safety and accuracy**: Shorter DIA risks insulin stacking; longer DIA may under-calculate IOB

**Note**: Some individuals may have different insulin activity profiles. The 4-hour default is conservative and appropriate for most users but should be validated with the healthcare team.

### Clinical References

- Walsh, J., & Roberts, R. (2016). _Pumping Insulin: Everything You Need to Succeed on an Insulin Pump_. Torrey Pines Press.
- Mudaliar, S. R., et al. (1999). "Insulin aspart: onset of action after bolus and continuous infusion in patients with type 1 diabetes." _Diabetes Care_, 22(9), 1462-1467.

---

## Bolus Calculator

### Overview

The bolus calculator helps estimate the insulin dose needed for meals and/or glucose correction. The calculation considers carbohydrate intake, current glucose level, target glucose, and relevant patient-specific ratios.

### Formula Components

#### 1. Meal Bolus (Carbohydrate Coverage)

```
Meal_Bolus = Carbohydrates / ICR
```

Where:

- **Carbohydrates**: Grams of carbs to be consumed
- **ICR (Insulin-to-Carb Ratio)**: Grams of carbs covered by 1 unit of insulin (e.g., 15 means 1 unit covers 15g carbs)

#### 2. Correction Bolus

```
Correction_Bolus = (Current_BG - Target_BG) / ISF

If Current_BG <= Target_BG, then Correction_Bolus = 0
```

Where:

- **Current_BG**: Current blood glucose in mg/dL
- **Target_BG**: Target blood glucose in mg/dL
- **ISF (Insulin Sensitivity Factor)**: How much 1 unit of insulin lowers blood glucose (e.g., 50 means 1 unit lowers BG by 50 mg/dL)

#### 3. Total Bolus with IOB Adjustment

```
Total_Bolus = max(0, Meal_Bolus + Correction_Bolus - IOB)
```

### Implementation Reference

From `src/app/core/services/mock-data.service.ts`:

```typescript
calculateBolus(params: {
  carbGrams: number;
  currentGlucose: number;
}): Observable<BolusCalculation> {
  const { carbGrams, currentGlucose } = params;
  const { carbRatio, correctionFactor, targetGlucose } = this.patientParams;

  const carbInsulin = carbGrams / carbRatio;
  const glucoseDiff = currentGlucose - targetGlucose;
  const correctionInsulin = glucoseDiff > 0 ? glucoseDiff / correctionFactor : 0;
  const totalInsulin = Math.max(0, carbInsulin + correctionInsulin);

  const result: BolusCalculation = {
    carbGrams,
    currentGlucose,
    targetGlucose,
    carbRatio,
    correctionFactor,
    recommendedInsulin: Math.round(totalInsulin * 10) / 10,
  };

  return of(result);
}
```

### Safety Guardrails

The application implements safety checks to prevent dangerous insulin dosing:

#### 1. Maximum Dose Warning

```typescript
const maxBolus = this.mockData.getPatientParams().maxBolus || 15;
if (calculation.recommendedInsulin > maxBolus) {
  warnings.push({
    type: 'maxDose',
    message: `The recommended dose of ${calculation.recommendedInsulin.toFixed(1)}
              units exceeds the maximum of ${maxBolus} units.`,
  });
}
```

- Default maximum: 15 units
- User-configurable based on individual needs and provider guidance

#### 2. Insulin On Board (IOB) Warning

```typescript
const iob = this.calculateIOB(readings);
if (iob > 0) {
  warnings.push({
    type: 'iob',
    message: `You still have an estimated ${iob.toFixed(1)} units of
              insulin on board from a recent bolus.`,
  });
}
```

- Alerts user to active insulin to prevent stacking
- IOB should be subtracted from the recommended dose

#### 3. Low Glucose Prevention

```typescript
const lowGlucoseThreshold = this.mockData.getPatientParams().lowGlucoseThreshold || 70;
if (calculation.currentGlucose < lowGlucoseThreshold) {
  warnings.push({
    type: 'lowGlucose',
    message: `Your current glucose of ${calculation.currentGlucose} mg/dL is low.
              A bolus is not recommended.`,
  });
}
```

- Default threshold: 70 mg/dL
- Prevents insulin dosing when glucose is already low

### Example Calculation

**Patient Parameters:**

- ICR: 15 (1 unit per 15g carbs)
- ISF: 50 (1 unit drops BG by 50 mg/dL)
- Target BG: 120 mg/dL
- Max Bolus: 15 units

**Scenario:**

- Current BG: 220 mg/dL
- Carbs: 45g
- IOB: 1.5 units

**Calculation:**

```
Meal Bolus = 45 / 15 = 3.0 units
Correction = (220 - 120) / 50 = 100 / 50 = 2.0 units
Subtotal = 3.0 + 2.0 = 5.0 units
Adjusted for IOB = 5.0 - 1.5 = 3.5 units

Final Recommendation: 3.5 units
```

---

## Statistical Formulas

### Time in Range (TIR)

Time in Range measures the percentage of glucose readings within the target range (typically 70-180 mg/dL).

```
TIR = (Readings_In_Range / Total_Readings) x 100

Where In_Range is defined as: 70 <= glucose <= 180 mg/dL
```

**Clinical Target**: >= 70% (ADA/ATTD Consensus)

### Implementation Reference

From `src/app/core/services/mock-data.service.ts`:

```typescript
const inRange = last30Days.filter(
  r =>
    r.glucose >= this.patientParams.targetRange.min &&
    r.glucose <= this.patientParams.targetRange.max
).length;

const aboveRange = last30Days.filter(r => r.glucose > this.patientParams.targetRange.max).length;

const belowRange = last30Days.filter(r => r.glucose < this.patientParams.targetRange.min).length;

const timeInRange = Math.round((inRange / last30Days.length) * 100);
const timeAboveRange = Math.round((aboveRange / last30Days.length) * 100);
const timeBelowRange = Math.round((belowRange / last30Days.length) * 100);
```

### Coefficient of Variation (CV)

CV measures glucose variability as a percentage. Lower CV indicates more stable glucose control.

```
CV = (Standard_Deviation / Mean) x 100
```

**Clinical Target**: <= 36% (stable glucose)

### Standard Deviation Calculation

From `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Calculate standard deviation
 */
private calculateStandardDeviation(values: number[], mean: number): number {
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}
```

### Estimated A1C (eA1C) / Glucose Management Indicator (GMI)

The estimated A1C is calculated from average glucose using the ADAG (A1C-Derived Average Glucose) study formula:

```
eA1C(%) = (Average_Glucose_mg/dL + 46.7) / 28.7
```

Or equivalently:

```
eA1C(%) = (Average_Glucose_mmol/L + 2.59) / 1.59
```

### Implementation Reference

From `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Calculate estimated A1C using ADAG formula
 * eA1C(%) = (average glucose mg/dL + 46.7) / 28.7
 */
private calculateEstimatedA1C(average: number, unit: GlucoseUnit): number {
  const mgdl = unit === 'mmol/L' ? average * 18.0182 : average;
  return (mgdl + 46.7) / 28.7;
}
```

From `src/app/core/services/mock-data.service.ts`:

```typescript
const estimatedHbA1c = (avgGlucose30 + 46.7) / 28.7;
```

### eA1C Reference Table

| Average Glucose (mg/dL) | Average Glucose (mmol/L) | eA1C (%) |
| ----------------------- | ------------------------ | -------- |
| 97                      | 5.4                      | 5.0      |
| 126                     | 7.0                      | 6.0      |
| 154                     | 8.6                      | 7.0      |
| 183                     | 10.2                     | 8.0      |
| 212                     | 11.8                     | 9.0      |
| 240                     | 13.4                     | 10.0     |

**Note**: eA1C/GMI provides an estimate based on CGM or SMBG data. Laboratory A1C may differ due to factors like red blood cell lifespan variations.

### Median Calculation

From `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Calculate median from sorted array
 */
private calculateMedian(sortedValues: number[]): number {
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid];
}
```

---

## Clinical References

### Primary Guidelines

1. **American Diabetes Association (ADA)**
   - _Standards of Medical Care in Diabetes - 2024_
   - Diabetes Care 2024;47(Suppl. 1):S1-S321
   - Defines glycemic targets, hypoglycemia thresholds, and treatment algorithms
   - https://diabetesjournals.org/care/issue/47/Supplement_1

2. **Advanced Technologies & Treatments for Diabetes (ATTD)**
   - _International Consensus on Time in Range_
   - Battelino T, et al. Diabetes Care 2019;42:1593-1603
   - Establishes TIR targets: >70% for most adults, <4% below range

### ADAG Study (eA1C Formula)

3. **A1C-Derived Average Glucose (ADAG) Study Group**
   - Nathan DM, et al. "Translating the A1C assay into estimated average glucose values."
   - Diabetes Care 2008;31(8):1473-1478
   - DOI: 10.2337/dc08-0545
   - Established the linear relationship between A1C and average glucose

### Insulin Pharmacology

4. **Walsh, J., & Roberts, R.**
   - _Pumping Insulin: Everything You Need to Succeed on an Insulin Pump_
   - Torrey Pines Press, 7th Edition (2016)
   - Comprehensive guide to insulin dosing, IOB calculations, and pump therapy

5. **Mudaliar SR, et al.**
   - "Insulin aspart: onset of action after bolus and continuous infusion"
   - Diabetes Care 1999;22(9):1462-1467
   - Pharmacokinetic data supporting 4-hour insulin duration

### Hypoglycemia Consensus

6. **International Hypoglycaemia Study Group**
   - "Glucose concentrations of less than 3.0 mmol/L (54 mg/dL) should be reported in clinical trials"
   - Diabetes Care 2017;40:155-157
   - Establishes clinically significant hypoglycemia threshold

### Glucose Management Indicator

7. **Bergenstal RM, et al.**
   - "Glucose Management Indicator (GMI): A New Term for Estimating A1C From Continuous Glucose Monitoring"
   - Diabetes Care 2018;41:2275-2280
   - Defines GMI as the CGM-derived A1C estimate

---

## Implementation Notes

### Code Location Reference

| Algorithm                  | Primary File                                    |
| -------------------------- | ----------------------------------------------- |
| Unit Conversion            | `src/app/core/services/readings.service.ts`     |
| Glucose Status             | `src/app/core/services/readings.service.ts`     |
| IOB Calculation            | `src/app/core/services/bolus-safety.service.ts` |
| Bolus Calculator           | `src/app/core/services/mock-data.service.ts`    |
| Safety Guardrails          | `src/app/core/services/bolus-safety.service.ts` |
| Statistics (TIR, CV, eA1C) | `src/app/core/services/readings.service.ts`     |
| Mock Statistics            | `src/app/core/services/mock-data.service.ts`    |

### Default Patient Parameters

From `src/app/core/services/mock-data.service.ts`:

```typescript
private patientParams = {
  carbRatio: 15,           // 1 unit per 15g carbs
  correctionFactor: 50,    // 1 unit drops BG by 50 mg/dL
  targetGlucose: 120,      // Target BG in mg/dL
  targetRange: { min: 70, max: 180 },  // Time in Range boundaries
  maxBolus: 15,            // Maximum single bolus in units
  lowGlucoseThreshold: 70, // Low glucose warning threshold
};
```

---

## Version History

| Version | Date | Changes               |
| ------- | ---- | --------------------- |
| 1.0.0   | 2024 | Initial documentation |

---

_Last updated: December 2024_
