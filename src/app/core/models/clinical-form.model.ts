/**
 * Clinical form models for healthcare provider documentation
 */

/**
 * Data provenance enum - tracks the source of clinical data
 */
export enum DataProvenance {
  MANUAL = 'manual', // Patient-entered data
  SENSOR = 'sensor', // Device/CGM data
  CLINICIAN = 'clinician', // Provider-entered data
}

/**
 * Therapy field with provenance tracking
 */
export interface TherapyField {
  value: string | null;
  provenance: DataProvenance;
  lastModified?: string; // ISO 8601 timestamp
  modifiedBy?: string; // User ID
  locked?: boolean; // If true, field is read-only (e.g., sensor data)
}

/**
 * Visit context information
 */
export interface VisitContext {
  motivoConsulta?: string; // Reason for visit
  objetivos?: string; // Visit objectives
  resolucionAnterior?: string; // Previous visit resolution/outcome
}

/**
 * Therapy information
 */
export interface Therapy {
  basal: TherapyField; // Basal insulin
  rapida: TherapyField; // Rapid-acting insulin
  ratio: TherapyField; // Insulin:Carbohydrate ratio
  sensibilidad: TherapyField; // Insulin sensitivity factor
  bomba?: TherapyField; // Insulin pump details
  sensor?: TherapyField; // CGM sensor details
  otherMedications?: TherapyField[]; // Other diabetes medications
}

/**
 * Glucose evidence from manual or sensor data
 */
export interface GlucoseEvidence {
  // Manual SMBG data
  manualSMBG?: {
    avg7d: number;
    avg14d: number;
    avg30d: number;
    tir: number; // Time in range percentage
    cv: number; // Coefficient of variation
    readingCount: number;
  };

  // Sensor/CGM snapshot
  sensorSnapshot?: {
    avg7d: number;
    avg14d: number;
    avg30d: number;
    tir: number;
    tar: number; // Time above range
    tbr: number; // Time below range
    cv: number;
    gmi: number; // Glucose Management Indicator
    readingCount: number;
  };

  // Photo evidence (e.g., logbook photo)
  photoEvidence?: {
    url: string;
    uploadedAt: string;
    description?: string;
  };

  provenance: DataProvenance;
  lastUpdated: string; // ISO 8601
}

/**
 * Visit resolution/outcome
 */
export interface Resolution {
  therapyChanges?: string; // Changes to therapy
  derivacion?: string; // Referral information
  recetas?: string; // Prescriptions
  followUpDate?: string; // Next appointment date
  educationProvided?: string[]; // Education topics covered
  goalsSet?: string[]; // Patient goals
}

/**
 * Complete clinical form
 */
export interface ClinicalForm {
  id: string;
  appointmentId: string;
  patientId: string;
  providerId: string;

  // Form sections
  visitContext: VisitContext;
  therapy: Therapy;
  glucoseEvidence: GlucoseEvidence;
  resolution: Resolution;

  // Metadata
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  status: 'draft' | 'completed' | 'reviewed';

  // Signatures
  patientSignature?: {
    signed: boolean;
    signedAt?: string;
    signatureData?: string; // Base64 encoded signature
  };
  providerSignature?: {
    signed: boolean;
    signedAt?: string;
    signatureData?: string;
    providerName: string;
    providerLicense?: string;
  };
}

/**
 * Clinical form template for quick form population
 */
export interface ClinicalFormTemplate {
  id: string;
  name: string;
  description?: string;
  template: Partial<ClinicalForm>;
  createdBy: string;
  createdAt: string;
  isDefault?: boolean;
}

/**
 * Clinical form save request
 */
export interface SaveClinicalFormRequest {
  appointmentId: string;
  form: Partial<ClinicalForm>;
  saveAsDraft?: boolean;
}
