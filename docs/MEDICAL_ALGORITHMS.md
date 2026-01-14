# Documentación de Algoritmos Médicos

## Aviso Médico

**IMPORTANTE: Diabetify es una herramienta de asistencia para el manejo de diabetes, NO un dispositivo médico.**

Esta aplicación está diseñada para ayudar a los usuarios a registrar lecturas de glucosa, calcular dosis de insulina y monitorear tendencias. Está destinada únicamente para propósitos educativos y de seguimiento personal.

- **No use esta aplicación como sustituto del consejo médico profesional, diagnóstico o tratamiento.**
- **Siempre consulte con su proveedor de salud antes de realizar cambios en su plan de manejo de diabetes.**
- **Las decisiones de dosificación de insulina siempre deben ser verificadas con su equipo médico.**
- **En caso de emergencia o hipoglucemia/hiperglucemia severa, busque atención médica inmediata.**

Los algoritmos implementados en esta aplicación están basados en guías clínicas establecidas, pero pueden no contemplar factores individuales del paciente que solo un proveedor de salud puede evaluar.

---

## Tabla de Contenidos

1. [Unidades de Glucosa y Conversión](#unidades-de-glucosa-y-conversión)
2. [Clasificación del Estado de Glucosa](#clasificación-del-estado-de-glucosa)
3. [Calculadora de Bolo](#calculadora-de-bolo)
4. [Fórmulas Estadísticas](#fórmulas-estadísticas)
5. [Referencias Clínicas](#referencias-clínicas)

---

## Unidades de Glucosa y Conversión

### Descripción General

La glucosa en sangre puede medirse en dos unidades:

- **mg/dL** (miligramos por decilitro) - Usado principalmente en Estados Unidos, Japón y algunos otros países
- **mmol/L** (milimoles por litro) - Usado en la mayoría de los demás países incluyendo Europa, Australia y Canadá

### Fórmula de Conversión

```
mg/dL = mmol/L × 18.0182
mmol/L = mg/dL / 18.0182
```

El factor de conversión 18.0182 se deriva del peso molecular de la glucosa (180.182 g/mol) dividido por 10.

### Referencia de Implementación

De `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Convertir valor de glucosa entre unidades
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

### Tabla de Referencia Rápida

| mg/dL | mmol/L |
| ----- | ------ |
| 54    | 3.0    |
| 70    | 3.9    |
| 100   | 5.6    |
| 120   | 6.7    |
| 180   | 10.0   |
| 250   | 13.9   |

---

## Clasificación del Estado de Glucosa

### Descripción General

La aplicación clasifica las lecturas de glucosa en cinco categorías basadas en umbrales clínicos establecidos. Estas clasificaciones ayudan a los usuarios a entender rápidamente su estado glucémico.

### Tabla de Clasificación

| Estado                                  | Rango (mg/dL) | Rango (mmol/L) | Significado Clínico                                                                                     |
| --------------------------------------- | ------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| **Crítico Bajo (Hipoglucemia Severa)**  | < 54          | < 3.0          | Requiere tratamiento inmediato. Asociado con mayor riesgo de deterioro cognitivo severo y convulsiones. |
| **Bajo (Hipoglucemia)**                 | 54 - 69       | 3.0 - 3.8      | Valor de alerta. Se recomienda tratamiento para prevenir progresión a hipoglucemia severa.              |
| **Normal (En Rango)**                   | 70 - 179      | 3.9 - 9.9      | Rango objetivo para la mayoría de personas con diabetes. Asociado con menor riesgo de complicaciones.   |
| **Alto (Hiperglucemia)**                | 180 - 250     | 10.0 - 13.9    | Por encima del objetivo. Puede requerir dosis de corrección. Elevación persistente aumenta riesgo.      |
| **Crítico Alto (Hiperglucemia Severa)** | > 250         | > 13.9         | Significativamente elevado. Verificar cetonas (Tipo 1). Puede indicar necesidad de atención médica.     |

### Referencia de Implementación

De `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Calcular estado de glucosa basado en valor y rangos
 */
private calculateGlucoseStatus(
  value: number,
  unit: GlucoseUnit
): 'low' | 'normal' | 'high' | 'critical-low' | 'critical-high' {
  // Convertir a mg/dL para comparación consistente
  const mgdl = unit === 'mmol/L' ? value * 18.0182 : value;

  if (mgdl < 54) return 'critical-low';
  if (mgdl < 70) return 'low';
  if (mgdl > 250) return 'critical-high';
  if (mgdl >= 180) return 'high';
  return 'normal';
}
```

### Base Clínica

Estos umbrales están basados en:

- **Estándares de Atención Médica en Diabetes 2024 de la ADA**: Define hipoglucemia Nivel 1 como < 70 mg/dL y Nivel 2 (clínicamente significativa) como < 54 mg/dL
- **Grupo Internacional de Estudio de Hipoglucemia**: Consenso sobre umbrales de glucosa para ensayos clínicos
- **Consenso Internacional de Tiempo en Rango (TIR)**: Define el rango objetivo como 70-180 mg/dL para la mayoría de adultos con diabetes

---

## Calculadora de Bolo

### Descripción General

La calculadora de bolo ayuda a estimar la dosis de insulina necesaria para comidas y/o corrección de glucosa. El cálculo considera la ingesta de carbohidratos, el nivel actual de glucosa, la glucosa objetivo y las proporciones específicas del paciente.

### Componentes de la Fórmula

#### 1. Bolo de Comida (Cobertura de Carbohidratos)

```
Bolo_Comida = Carbohidratos / ICR
```

Donde:

- **Carbohidratos**: Gramos de carbohidratos a consumir
- **ICR (Relación Insulina-Carbohidratos)**: Gramos de carbohidratos cubiertos por 1 unidad de insulina (ej: 15 significa que 1 unidad cubre 15g de carbohidratos)

#### 2. Bolo de Corrección

```
Bolo_Corrección = (Glucosa_Actual - Glucosa_Objetivo) / ISF

Si Glucosa_Actual <= Glucosa_Objetivo, entonces Bolo_Corrección = 0
```

Donde:

- **Glucosa_Actual**: Glucosa en sangre actual en mg/dL
- **Glucosa_Objetivo**: Glucosa en sangre objetivo en mg/dL
- **ISF (Factor de Sensibilidad a la Insulina)**: Cuánto baja la glucosa 1 unidad de insulina (ej: 50 significa que 1 unidad baja la glucosa 50 mg/dL)

#### 3. Bolo Total

```
Bolo_Total = max(0, Bolo_Comida + Bolo_Corrección)
```

### Referencia de Implementación

De `src/app/core/services/mock-data.service.ts`:

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

### Guardas de Seguridad

La aplicación implementa verificaciones de seguridad para prevenir dosificación peligrosa de insulina:

#### 1. Advertencia de Dosis Máxima

```typescript
if (calculation.recommendedInsulin > maxBolus) {
  warnings.push({
    type: 'maxDose',
    message: `La dosis recomendada de ${calculation.recommendedInsulin.toFixed(1)}
              unidades excede el máximo de ${maxBolus} unidades.`,
  });
}
```

- Máximo por defecto: 15 unidades
- Configurable por el usuario según necesidades individuales y orientación del proveedor

#### 2. Prevención de Glucosa Baja

```typescript
if (calculation.currentGlucose < lowGlucoseThreshold) {
  warnings.push({
    type: 'lowGlucose',
    message: `Tu glucosa actual de ${calculation.currentGlucose} mg/dL está baja.
              No se recomienda un bolo.`,
  });
}
```

- Umbral por defecto: 70 mg/dL
- Previene dosificación de insulina cuando la glucosa ya está baja

### Ejemplo de Cálculo

**Parámetros del Paciente:**

- ICR: 15 (1 unidad por 15g de carbohidratos)
- ISF: 50 (1 unidad baja la glucosa 50 mg/dL)
- Glucosa objetivo: 120 mg/dL
- Bolo máximo: 15 unidades

**Escenario:**

- Glucosa actual: 220 mg/dL
- Carbohidratos: 45g

**Cálculo:**

```
Bolo de Comida = 45 / 15 = 3.0 unidades
Corrección = (220 - 120) / 50 = 100 / 50 = 2.0 unidades
Total = 3.0 + 2.0 = 5.0 unidades

Recomendación Final: 5.0 unidades
```

---

## Fórmulas Estadísticas

### Tiempo en Rango (TIR)

El Tiempo en Rango mide el porcentaje de lecturas de glucosa dentro del rango objetivo (típicamente 70-180 mg/dL).

```
TIR = (Lecturas_En_Rango / Total_Lecturas) × 100

Donde En_Rango se define como: 70 <= glucosa <= 180 mg/dL
```

**Objetivo Clínico**: >= 70% (Consenso ADA/ATTD)

### Referencia de Implementación

De `src/app/core/services/mock-data.service.ts`:

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

### Coeficiente de Variación (CV)

El CV mide la variabilidad de la glucosa como porcentaje. Un CV más bajo indica un control de glucosa más estable.

```
CV = (Desviación_Estándar / Media) × 100
```

**Objetivo Clínico**: <= 36% (glucosa estable)

### Cálculo de Desviación Estándar

De `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Calcular desviación estándar
 */
private calculateStandardDeviation(values: number[], mean: number): number {
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}
```

### A1C Estimada (eA1C) / Indicador de Gestión de Glucosa (GMI)

La A1C estimada se calcula a partir de la glucosa promedio usando la fórmula del estudio ADAG (Glucosa Promedio Derivada de A1C):

```
eA1C(%) = (Glucosa_Promedio_mg/dL + 46.7) / 28.7
```

O equivalentemente:

```
eA1C(%) = (Glucosa_Promedio_mmol/L + 2.59) / 1.59
```

### Referencia de Implementación

De `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Calcular A1C estimada usando fórmula ADAG
 * eA1C(%) = (glucosa promedio mg/dL + 46.7) / 28.7
 */
private calculateEstimatedA1C(average: number, unit: GlucoseUnit): number {
  const mgdl = unit === 'mmol/L' ? average * 18.0182 : average;
  return (mgdl + 46.7) / 28.7;
}
```

### Tabla de Referencia eA1C

| Glucosa Promedio (mg/dL) | Glucosa Promedio (mmol/L) | eA1C (%) |
| ------------------------ | ------------------------- | -------- |
| 97                       | 5.4                       | 5.0      |
| 126                      | 7.0                       | 6.0      |
| 154                      | 8.6                       | 7.0      |
| 183                      | 10.2                      | 8.0      |
| 212                      | 11.8                      | 9.0      |
| 240                      | 13.4                      | 10.0     |

**Nota**: eA1C/GMI proporciona una estimación basada en datos de CGM o SMBG. La A1C de laboratorio puede diferir debido a factores como variaciones en la vida útil de los glóbulos rojos.

### Cálculo de Mediana

De `src/app/core/services/readings.service.ts`:

```typescript
/**
 * Calcular mediana de un arreglo ordenado
 */
private calculateMedian(sortedValues: number[]): number {
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid];
}
```

---

## Referencias Clínicas

### Guías Principales

1. **Asociación Americana de Diabetes (ADA)**
   - _Estándares de Atención Médica en Diabetes - 2024_
   - Diabetes Care 2024;47(Supl. 1):S1-S321
   - Define objetivos glucémicos, umbrales de hipoglucemia y algoritmos de tratamiento
   - https://diabetesjournals.org/care/issue/47/Supplement_1

2. **Tecnologías Avanzadas y Tratamientos para Diabetes (ATTD)**
   - _Consenso Internacional sobre Tiempo en Rango_
   - Battelino T, et al. Diabetes Care 2019;42:1593-1603
   - Establece objetivos TIR: >70% para la mayoría de adultos, <4% por debajo del rango

### Estudio ADAG (Fórmula eA1C)

3. **Grupo de Estudio de Glucosa Promedio Derivada de A1C (ADAG)**
   - Nathan DM, et al. "Translating the A1C assay into estimated average glucose values."
   - Diabetes Care 2008;31(8):1473-1478
   - DOI: 10.2337/dc08-0545
   - Estableció la relación lineal entre A1C y glucosa promedio

### Consenso de Hipoglucemia

4. **Grupo Internacional de Estudio de Hipoglucemia**
   - "Glucose concentrations of less than 3.0 mmol/L (54 mg/dL) should be reported in clinical trials"
   - Diabetes Care 2017;40:155-157
   - Establece el umbral de hipoglucemia clínicamente significativa

### Indicador de Gestión de Glucosa

5. **Bergenstal RM, et al.**
   - "Glucose Management Indicator (GMI): A New Term for Estimating A1C From Continuous Glucose Monitoring"
   - Diabetes Care 2018;41:2275-2280
   - Define GMI como la estimación de A1C derivada de CGM

---

## Notas de Implementación

### Referencia de Ubicación de Código

| Algoritmo                    | Archivo Principal                               |
| ---------------------------- | ----------------------------------------------- |
| Conversión de Unidades       | `src/app/core/services/readings.service.ts`     |
| Estado de Glucosa            | `src/app/core/services/readings.service.ts`     |
| Calculadora de Bolo          | `src/app/core/services/mock-data.service.ts`    |
| Guardas de Seguridad         | `src/app/core/services/bolus-safety.service.ts` |
| Estadísticas (TIR, CV, eA1C) | `src/app/core/services/readings.service.ts`     |
| Estadísticas Mock            | `src/app/core/services/mock-data.service.ts`    |

### Parámetros por Defecto del Paciente

De `src/app/core/services/mock-data.service.ts`:

```typescript
private patientParams = {
  carbRatio: 15,           // 1 unidad por 15g de carbohidratos
  correctionFactor: 50,    // 1 unidad baja la glucosa 50 mg/dL
  targetGlucose: 120,      // Glucosa objetivo en mg/dL
  targetRange: { min: 70, max: 180 },  // Límites de Tiempo en Rango
  maxBolus: 15,            // Bolo máximo en unidades
  lowGlucoseThreshold: 70, // Umbral de advertencia de glucosa baja
};
```

---

## Historial de Versiones

| Versión | Fecha      | Cambios                                            |
| ------- | ---------- | -------------------------------------------------- |
| 1.0.0   | 2024       | Documentación inicial                              |
| 1.1.0   | Enero 2026 | Removido IOB (simplificación), traducido a español |

---

_Última actualización: Enero 2026_
