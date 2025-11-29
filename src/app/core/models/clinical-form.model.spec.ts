/**
 * Unit tests for clinical form models
 * Tests enums, interfaces, and type definitions
 */

import {
  DataProvenance,
  TherapyField,
  VisitContext,
  Therapy,
  GlucoseEvidence,
  Resolution,
  ClinicalForm,
  ClinicalFormTemplate,
  SaveClinicalFormRequest,
} from './clinical-form.model';

describe('ClinicalFormModel', () => {
  describe('DataProvenance enum', () => {
    it('should have MANUAL provenance', () => {
      expect(DataProvenance.MANUAL).toBe('manual');
    });

    it('should have SENSOR provenance', () => {
      expect(DataProvenance.SENSOR).toBe('sensor');
    });

    it('should have CLINICIAN provenance', () => {
      expect(DataProvenance.CLINICIAN).toBe('clinician');
    });

    it('should have exactly 3 provenances', () => {
      const values = Object.values(DataProvenance);
      expect(values.length).toBe(3);
    });
  });

  describe('TherapyField interface', () => {
    it('should accept minimal therapy field', () => {
      const field: TherapyField = {
        value: 'Humalog 10 units',
        provenance: DataProvenance.MANUAL,
      };
      expect(field.value).toBe('Humalog 10 units');
      expect(field.provenance).toBe(DataProvenance.MANUAL);
    });

    it('should accept null value', () => {
      const field: TherapyField = {
        value: null,
        provenance: DataProvenance.MANUAL,
      };
      expect(field.value).toBeNull();
    });

    it('should accept field with all metadata', () => {
      const field: TherapyField = {
        value: 'Dexcom G6',
        provenance: DataProvenance.SENSOR,
        lastModified: '2024-01-15T10:00:00Z',
        modifiedBy: 'user123',
        locked: true,
      };
      expect(field.lastModified).toBe('2024-01-15T10:00:00Z');
      expect(field.modifiedBy).toBe('user123');
      expect(field.locked).toBe(true);
    });

    it('should accept all provenance types', () => {
      const provenances = [DataProvenance.MANUAL, DataProvenance.SENSOR, DataProvenance.CLINICIAN];
      provenances.forEach(provenance => {
        const field: TherapyField = {
          value: 'test',
          provenance,
        };
        expect(field.provenance).toBe(provenance);
      });
    });
  });

  describe('VisitContext interface', () => {
    it('should accept empty visit context', () => {
      const context: VisitContext = {};
      expect(Object.keys(context).length).toBe(0);
    });

    it('should accept visit context with all fields', () => {
      const context: VisitContext = {
        motivoConsulta: 'Routine checkup',
        objetivos: 'Optimize insulin dosing',
        resolucionAnterior: 'Increased basal insulin',
      };
      expect(context.motivoConsulta).toBe('Routine checkup');
      expect(context.objetivos).toBe('Optimize insulin dosing');
      expect(context.resolucionAnterior).toBe('Increased basal insulin');
    });
  });

  describe('Therapy interface', () => {
    it('should accept minimal therapy', () => {
      const therapy: Therapy = {
        basal: { value: 'Lantus 10u', provenance: DataProvenance.MANUAL },
        rapida: { value: 'Humalog', provenance: DataProvenance.MANUAL },
        ratio: { value: '1:15', provenance: DataProvenance.CLINICIAN },
        sensibilidad: { value: '1:50', provenance: DataProvenance.CLINICIAN },
      };
      expect(therapy.basal.value).toBe('Lantus 10u');
      expect(therapy.rapida.value).toBe('Humalog');
    });

    it('should accept therapy with all fields', () => {
      const therapy: Therapy = {
        basal: { value: 'Lantus 10u', provenance: DataProvenance.MANUAL },
        rapida: { value: 'Humalog', provenance: DataProvenance.MANUAL },
        ratio: { value: '1:15', provenance: DataProvenance.CLINICIAN },
        sensibilidad: { value: '1:50', provenance: DataProvenance.CLINICIAN },
        bomba: { value: 'Medtronic 670G', provenance: DataProvenance.SENSOR, locked: true },
        sensor: { value: 'Dexcom G6', provenance: DataProvenance.SENSOR, locked: true },
        otherMedications: [
          { value: 'Metformin 500mg', provenance: DataProvenance.CLINICIAN },
          { value: 'Vitamin D', provenance: DataProvenance.MANUAL },
        ],
      };
      expect(therapy.bomba?.value).toBe('Medtronic 670G');
      expect(therapy.sensor?.value).toBe('Dexcom G6');
      expect(therapy.otherMedications?.length).toBe(2);
    });
  });

  describe('GlucoseEvidence interface', () => {
    it('should accept manual SMBG evidence', () => {
      const evidence: GlucoseEvidence = {
        manualSMBG: {
          avg7d: 125,
          avg14d: 128,
          avg30d: 130,
          tir: 75,
          cv: 24,
          readingCount: 84,
        },
        provenance: DataProvenance.MANUAL,
        lastUpdated: '2024-01-15T10:00:00Z',
      };
      expect(evidence.manualSMBG?.avg7d).toBe(125);
      expect(evidence.provenance).toBe(DataProvenance.MANUAL);
    });

    it('should accept sensor snapshot evidence', () => {
      const evidence: GlucoseEvidence = {
        sensorSnapshot: {
          avg7d: 120,
          avg14d: 122,
          avg30d: 125,
          tir: 78,
          tar: 18,
          tbr: 4,
          cv: 22,
          gmi: 6.2,
          readingCount: 2016,
        },
        provenance: DataProvenance.SENSOR,
        lastUpdated: '2024-01-15T10:00:00Z',
      };
      expect(evidence.sensorSnapshot?.gmi).toBe(6.2);
      expect(evidence.sensorSnapshot?.readingCount).toBe(2016);
    });

    it('should accept photo evidence', () => {
      const evidence: GlucoseEvidence = {
        photoEvidence: {
          url: 'https://example.com/logbook.jpg',
          uploadedAt: '2024-01-15T09:00:00Z',
          description: 'Handwritten logbook for Jan 1-14',
        },
        provenance: DataProvenance.MANUAL,
        lastUpdated: '2024-01-15T10:00:00Z',
      };
      expect(evidence.photoEvidence?.url).toBe('https://example.com/logbook.jpg');
      expect(evidence.photoEvidence?.description).toBe('Handwritten logbook for Jan 1-14');
    });

    it('should accept combined evidence', () => {
      const evidence: GlucoseEvidence = {
        manualSMBG: {
          avg7d: 125,
          avg14d: 128,
          avg30d: 130,
          tir: 75,
          cv: 24,
          readingCount: 84,
        },
        sensorSnapshot: {
          avg7d: 120,
          avg14d: 122,
          avg30d: 125,
          tir: 78,
          tar: 18,
          tbr: 4,
          cv: 22,
          gmi: 6.2,
          readingCount: 2016,
        },
        provenance: DataProvenance.SENSOR,
        lastUpdated: '2024-01-15T10:00:00Z',
      };
      expect(evidence.manualSMBG).toBeDefined();
      expect(evidence.sensorSnapshot).toBeDefined();
    });
  });

  describe('Resolution interface', () => {
    it('should accept empty resolution', () => {
      const resolution: Resolution = {};
      expect(Object.keys(resolution).length).toBe(0);
    });

    it('should accept resolution with all fields', () => {
      const resolution: Resolution = {
        therapyChanges: 'Increased basal from 10u to 12u',
        derivacion: 'Referred to endocrinologist',
        recetas: 'Lantus 100 units/ml, 3 pens',
        followUpDate: '2024-02-15',
        educationProvided: ['Carb counting', 'Hypoglycemia management'],
        goalsSet: ['Maintain TIR > 70%', 'Reduce post-meal spikes'],
      };
      expect(resolution.therapyChanges).toBe('Increased basal from 10u to 12u');
      expect(resolution.educationProvided?.length).toBe(2);
      expect(resolution.goalsSet?.length).toBe(2);
    });
  });

  describe('ClinicalForm interface', () => {
    it('should accept draft form', () => {
      const form: ClinicalForm = {
        id: 'form123',
        appointmentId: 'appt456',
        patientId: 'patient789',
        providerId: 'provider012',
        visitContext: {
          motivoConsulta: 'Routine checkup',
        },
        therapy: {
          basal: { value: 'Lantus 10u', provenance: DataProvenance.MANUAL },
          rapida: { value: 'Humalog', provenance: DataProvenance.MANUAL },
          ratio: { value: '1:15', provenance: DataProvenance.CLINICIAN },
          sensibilidad: { value: '1:50', provenance: DataProvenance.CLINICIAN },
        },
        glucoseEvidence: {
          provenance: DataProvenance.MANUAL,
          lastUpdated: '2024-01-15T10:00:00Z',
        },
        resolution: {},
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        status: 'draft',
      };
      expect(form.status).toBe('draft');
      expect(form.completedAt).toBeUndefined();
    });

    it('should accept completed form with signatures', () => {
      const form: ClinicalForm = {
        id: 'form123',
        appointmentId: 'appt456',
        patientId: 'patient789',
        providerId: 'provider012',
        visitContext: {},
        therapy: {
          basal: { value: 'Lantus 10u', provenance: DataProvenance.MANUAL },
          rapida: { value: 'Humalog', provenance: DataProvenance.MANUAL },
          ratio: { value: '1:15', provenance: DataProvenance.CLINICIAN },
          sensibilidad: { value: '1:50', provenance: DataProvenance.CLINICIAN },
        },
        glucoseEvidence: {
          provenance: DataProvenance.MANUAL,
          lastUpdated: '2024-01-15T10:00:00Z',
        },
        resolution: {},
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        completedAt: '2024-01-15T11:00:00Z',
        status: 'completed',
        patientSignature: {
          signed: true,
          signedAt: '2024-01-15T10:45:00Z',
          signatureData: 'base64_encoded_signature',
        },
        providerSignature: {
          signed: true,
          signedAt: '2024-01-15T11:00:00Z',
          signatureData: 'base64_encoded_signature',
          providerName: 'Dr. Smith',
          providerLicense: 'MD12345',
        },
      };
      expect(form.status).toBe('completed');
      expect(form.patientSignature?.signed).toBe(true);
      expect(form.providerSignature?.signed).toBe(true);
      expect(form.providerSignature?.providerName).toBe('Dr. Smith');
    });

    it('should accept all status values', () => {
      const statuses: ClinicalForm['status'][] = ['draft', 'completed', 'reviewed'];
      statuses.forEach(status => {
        const form: ClinicalForm = {
          id: 'form123',
          appointmentId: 'appt456',
          patientId: 'patient789',
          providerId: 'provider012',
          visitContext: {},
          therapy: {
            basal: { value: null, provenance: DataProvenance.MANUAL },
            rapida: { value: null, provenance: DataProvenance.MANUAL },
            ratio: { value: null, provenance: DataProvenance.CLINICIAN },
            sensibilidad: { value: null, provenance: DataProvenance.CLINICIAN },
          },
          glucoseEvidence: {
            provenance: DataProvenance.MANUAL,
            lastUpdated: '2024-01-15T10:00:00Z',
          },
          resolution: {},
          createdAt: '2024-01-15T09:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          status,
        };
        expect(form.status).toBe(status);
      });
    });
  });

  describe('ClinicalFormTemplate interface', () => {
    it('should accept form template', () => {
      const template: ClinicalFormTemplate = {
        id: 'template123',
        name: 'Type 1 Diabetes Standard Visit',
        description: 'Standard template for T1D routine checkups',
        template: {
          visitContext: {
            motivoConsulta: 'Routine checkup',
          },
        },
        createdBy: 'provider012',
        createdAt: '2024-01-01T00:00:00Z',
        isDefault: true,
      };
      expect(template.name).toBe('Type 1 Diabetes Standard Visit');
      expect(template.isDefault).toBe(true);
    });

    it('should accept template without description', () => {
      const template: ClinicalFormTemplate = {
        id: 'template123',
        name: 'Quick Visit',
        template: {},
        createdBy: 'provider012',
        createdAt: '2024-01-01T00:00:00Z',
      };
      expect(template.description).toBeUndefined();
      expect(template.isDefault).toBeUndefined();
    });
  });

  describe('SaveClinicalFormRequest interface', () => {
    it('should accept minimal save request', () => {
      const request: SaveClinicalFormRequest = {
        appointmentId: 'appt456',
        form: {
          visitContext: {
            motivoConsulta: 'Routine checkup',
          },
        },
      };
      expect(request.appointmentId).toBe('appt456');
    });

    it('should accept save as draft request', () => {
      const request: SaveClinicalFormRequest = {
        appointmentId: 'appt456',
        form: {
          status: 'draft',
        },
        saveAsDraft: true,
      };
      expect(request.saveAsDraft).toBe(true);
    });

    it('should accept complete form update', () => {
      const request: SaveClinicalFormRequest = {
        appointmentId: 'appt456',
        form: {
          visitContext: {
            motivoConsulta: 'Routine checkup',
          },
          therapy: {
            basal: { value: 'Lantus 10u', provenance: DataProvenance.MANUAL },
            rapida: { value: 'Humalog', provenance: DataProvenance.MANUAL },
            ratio: { value: '1:15', provenance: DataProvenance.CLINICIAN },
            sensibilidad: { value: '1:50', provenance: DataProvenance.CLINICIAN },
          },
          status: 'completed',
        },
      };
      expect(request.form.status).toBe('completed');
    });
  });
});
