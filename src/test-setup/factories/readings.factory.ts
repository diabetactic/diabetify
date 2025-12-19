/**
 * Factory para crear datos de prueba de lecturas de glucosa
 * Proporciona funciones helper para generar LocalGlucoseReading con valores realistas
 */

import type {
  LocalGlucoseReading,
  GlucoseUnit,
  GlucoseType,
  SMBGSubType,
  GlucoseStatus,
  CBGReading,
  SMBGReading,
} from '@models/glucose-reading.model';

/**
 * Configuración por defecto para lecturas de glucosa
 */
const DEFAULT_GLUCOSE_CONFIG = {
  units: 'mg/dL' as GlucoseUnit,
  normalMin: 70,
  normalMax: 180,
  lowThreshold: 70,
  highThreshold: 180,
  criticalLowThreshold: 54,
  criticalHighThreshold: 250,
};

/**
 * Genera un ID único para las lecturas
 */
const generateReadingId = (): string => {
  return `reading_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Calcula el estado de glucosa basado en el valor
 */
const calculateGlucoseStatus = (value: number): GlucoseStatus => {
  if (value < DEFAULT_GLUCOSE_CONFIG.criticalLowThreshold) {
    return 'critical-low';
  }
  if (value < DEFAULT_GLUCOSE_CONFIG.lowThreshold) {
    return 'low';
  }
  if (value > DEFAULT_GLUCOSE_CONFIG.criticalHighThreshold) {
    return 'critical-high';
  }
  if (value > DEFAULT_GLUCOSE_CONFIG.highThreshold) {
    return 'high';
  }
  return 'normal';
};

/**
 * Genera un valor de glucosa aleatorio dentro de un rango
 */
const randomGlucoseValue = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Crea una lectura SMBG (Self-Monitored Blood Glucose) mock
 *
 * @param overrides - Valores para sobrescribir los defaults
 * @returns Lectura SMBG completa
 *
 * @example
 * ```typescript
 * // Lectura normal con valor específico
 * const reading = createMockSMBGReading({ value: 120 });
 *
 * // Lectura con múltiples overrides
 * const reading = createMockSMBGReading({
 *   value: 85,
 *   time: '2024-01-15T08:30:00.000Z',
 *   synced: false
 * });
 * ```
 */
export const createMockSMBGReading = (
  overrides?: Partial<LocalGlucoseReading>
): LocalGlucoseReading & { type: 'smbg' } => {
  const now = new Date();
  const value = overrides?.value ?? randomGlucoseValue(80, 150);

  const baseReading: SMBGReading = {
    id: generateReadingId(),
    type: 'smbg',
    time: now.toISOString(),
    value,
    units: DEFAULT_GLUCOSE_CONFIG.units,
    subType: 'manual' as SMBGSubType,
  };

  return {
    ...baseReading,
    synced: true,
    status: calculateGlucoseStatus(value),
    uploadId: null,
    deviceId: null,
    ...overrides,
    type: 'smbg',
  };
};

/**
 * Crea una lectura CBG (Continuous Blood Glucose) mock
 *
 * @param overrides - Valores para sobrescribir los defaults
 * @returns Lectura CBG completa
 *
 * @example
 * ```typescript
 * const reading = createMockCBGReading({
 *   value: 110,
 *   trendRate: -2.5,
 *   trendRateUnits: 'mg/dL/minute'
 * });
 * ```
 */
export const createMockCBGReading = (
  overrides?: Partial<LocalGlucoseReading>
): LocalGlucoseReading & { type: 'cbg' } => {
  const now = new Date();
  const value = overrides?.value ?? randomGlucoseValue(80, 150);

  const baseReading: CBGReading = {
    id: generateReadingId(),
    type: 'cbg',
    time: now.toISOString(),
    value,
    units: DEFAULT_GLUCOSE_CONFIG.units,
    sampleInterval: 300000, // 5 minutos
  };

  return {
    ...baseReading,
    synced: true,
    status: calculateGlucoseStatus(value),
    uploadId: null,
    deviceId: null,
    ...overrides,
    type: 'cbg',
  };
};

/**
 * Crea una lectura de glucosa mock (por defecto SMBG)
 *
 * @param overrides - Valores para sobrescribir los defaults
 * @returns Lectura de glucosa completa
 *
 * @example
 * ```typescript
 * const reading = createMockReading({ value: 120 });
 * const cbgReading = createMockReading({ type: 'cbg', value: 95 });
 * ```
 */
export const createMockReading = (
  overrides?: Partial<LocalGlucoseReading>
): LocalGlucoseReading => {
  const type = overrides?.type ?? 'smbg';

  if (type === 'cbg') {
    return createMockCBGReading(overrides);
  }

  return createMockSMBGReading(overrides);
};

/**
 * Crea múltiples lecturas de glucosa espaciadas en el tiempo
 *
 * @param count - Número de lecturas a crear
 * @param overrides - Valores para sobrescribir en todas las lecturas
 * @param intervalMinutes - Intervalo en minutos entre lecturas (default: 60)
 * @returns Array de lecturas
 *
 * @example
 * ```typescript
 * // 10 lecturas espaciadas por 1 hora
 * const readings = createMockReadings(10);
 *
 * // 24 lecturas espaciadas por 1 hora, todas sincronizadas
 * const readings = createMockReadings(24, { synced: true }, 60);
 *
 * // 12 lecturas CBG espaciadas por 5 minutos
 * const readings = createMockReadings(12, { type: 'cbg' }, 5);
 * ```
 */
export const createMockReadings = (
  count: number,
  overrides?: Partial<LocalGlucoseReading>,
  intervalMinutes: number = 60
): LocalGlucoseReading[] => {
  const readings: LocalGlucoseReading[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const readingTime = new Date(now);
    readingTime.setMinutes(readingTime.getMinutes() - i * intervalMinutes);

    readings.push(
      createMockReading({
        ...overrides,
        time: readingTime.toISOString(),
      })
    );
  }

  return readings.reverse(); // Ordenar cronológicamente (más antigua primero)
};

/**
 * Crea una lectura con un estado específico
 *
 * @param status - Estado deseado de la lectura
 * @param type - Tipo de lectura (default: 'smbg')
 * @returns Lectura con el estado especificado
 *
 * @example
 * ```typescript
 * const lowReading = createReadingWithStatus('low');
 * const criticalHigh = createReadingWithStatus('critical-high', 'cbg');
 * ```
 */
export const createReadingWithStatus = (
  status: GlucoseStatus,
  type: GlucoseType = 'smbg'
): LocalGlucoseReading => {
  let value: number;

  switch (status) {
    case 'critical-low':
      value = randomGlucoseValue(40, 53);
      break;
    case 'low':
      value = randomGlucoseValue(54, 69);
      break;
    case 'normal':
      value = randomGlucoseValue(70, 180);
      break;
    case 'high':
      value = randomGlucoseValue(181, 249);
      break;
    case 'critical-high':
      value = randomGlucoseValue(250, 400);
      break;
  }

  return createMockReading({ value, type, status });
};

/**
 * Crea un conjunto de lecturas que cubren todos los estados posibles
 *
 * @param type - Tipo de lecturas (default: 'smbg')
 * @returns Array con una lectura de cada estado
 *
 * @example
 * ```typescript
 * const allStatuses = createReadingsWithAllStatuses();
 * // Retorna 5 lecturas: critical-low, low, normal, high, critical-high
 * ```
 */
export const createReadingsWithAllStatuses = (
  type: GlucoseType = 'smbg'
): LocalGlucoseReading[] => {
  const statuses: GlucoseStatus[] = [
    'critical-low',
    'low',
    'normal',
    'high',
    'critical-high',
  ];

  return statuses.map((status) => createReadingWithStatus(status, type));
};

/**
 * Crea lecturas que simulan un patrón de glucosa a lo largo del día
 *
 * @param date - Fecha para las lecturas (default: hoy)
 * @returns Array de lecturas simulando patrón diario (desayuno, almuerzo, cena, noche)
 *
 * @example
 * ```typescript
 * const dailyPattern = createDailyGlucosePattern();
 * // Retorna lecturas a las 7am, 12pm, 7pm, 10pm con valores realistas
 * ```
 */
export const createDailyGlucosePattern = (
  date: Date = new Date()
): LocalGlucoseReading[] => {
  const readings: LocalGlucoseReading[] = [];
  const times = [
    { hour: 7, minute: 0, value: randomGlucoseValue(90, 130), context: 'before-breakfast' },
    { hour: 9, minute: 0, value: randomGlucoseValue(120, 160), context: 'after-breakfast' },
    { hour: 12, minute: 0, value: randomGlucoseValue(80, 120), context: 'before-lunch' },
    { hour: 14, minute: 0, value: randomGlucoseValue(110, 150), context: 'after-lunch' },
    { hour: 19, minute: 0, value: randomGlucoseValue(85, 125), context: 'before-dinner' },
    { hour: 21, minute: 0, value: randomGlucoseValue(115, 155), context: 'after-dinner' },
    { hour: 22, minute: 30, value: randomGlucoseValue(90, 130), context: 'bedtime' },
  ];

  times.forEach(({ hour, minute, value, context }) => {
    const readingDate = new Date(date);
    readingDate.setHours(hour, minute, 0, 0);

    readings.push(
      createMockReading({
        time: readingDate.toISOString(),
        value,
        mealContext: context,
      })
    );
  });

  return readings;
};

/**
 * Crea lecturas no sincronizadas (locales solamente)
 *
 * @param count - Número de lecturas
 * @returns Array de lecturas no sincronizadas
 *
 * @example
 * ```typescript
 * const unsyncedReadings = createUnsyncedReadings(5);
 * // Todas tienen synced: false, isLocalOnly: true
 * ```
 */
export const createUnsyncedReadings = (count: number): LocalGlucoseReading[] => {
  return createMockReadings(count, {
    synced: false,
    isLocalOnly: true,
    uploadId: null,
  });
};
