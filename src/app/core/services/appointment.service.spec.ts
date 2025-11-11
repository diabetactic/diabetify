import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  AppointmentService,
  Appointment,
  Doctor,
  TimeSlot,
  CreateAppointmentRequest,
  AppointmentStats,
  ShareGlucoseResponse,
} from './appointment.service';
import { ApiGatewayService } from './api-gateway.service';
import { ReadingsService, TeleAppointmentReadingSummary } from './readings.service';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let apiGatewaySpy: jasmine.SpyObj<ApiGatewayService>;
  let readingsServiceSpy: jasmine.SpyObj<ReadingsService>;

  beforeEach(() => {
    // Create spy objects for dependencies
    const apiGatewaySpyObj = jasmine.createSpyObj('ApiGatewayService', ['request']);
    const readingsServiceSpyObj = jasmine.createSpyObj('ReadingsService', [
      'exportManualReadingsSummary',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AppointmentService,
        { provide: ApiGatewayService, useValue: apiGatewaySpyObj },
        { provide: ReadingsService, useValue: readingsServiceSpyObj },
      ],
    });

    service = TestBed.inject(AppointmentService);
    apiGatewaySpy = TestBed.inject(ApiGatewayService) as jasmine.SpyObj<ApiGatewayService>;
    readingsServiceSpy = TestBed.inject(ReadingsService) as jasmine.SpyObj<ReadingsService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Gateway Integration Tests', () => {
    describe('shareManualGlucoseData', () => {
      const mockSummary: TeleAppointmentReadingSummary = {
        generatedAt: '2024-01-31T12:00:00.000Z',
        range: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z',
        },
        unit: 'mg/dL',
        totalReadings: 120,
        statistics: {
          average: 142.5,
          minimum: 78,
          maximum: 210,
        },
        readings: [
          {
            id: 'reading-1',
            time: '2024-01-15T10:00:00.000Z',
            value: 142,
            status: 'normal',
          },
          {
            id: 'reading-2',
            time: '2024-01-16T10:00:00.000Z',
            value: 156,
            status: 'normal',
          },
        ],
      };

      it('should call correct gateway endpoint with default 30-day window', done => {
        const appointmentId = 'apt-123';
        const mockResponse: ShareGlucoseResponse = {
          shared: true,
          message: '120 lecturas compartidas exitosamente',
          recordCount: 120,
        };

        // Mock ReadingsService to return summary
        readingsServiceSpy.exportManualReadingsSummary.and.returnValue(
          Promise.resolve(mockSummary)
        );

        // Mock ApiGatewayService to return successful response
        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockResponse,
          })
        );

        service.shareManualGlucoseData(appointmentId).subscribe({
          next: response => {
            // Verify ReadingsService was called with 30 days (default)
            expect(readingsServiceSpy.exportManualReadingsSummary).toHaveBeenCalledWith(30);

            // Verify ApiGatewayService was called with correct endpoint and payload
            expect(apiGatewaySpy.request).toHaveBeenCalledWith(
              'appointments.shareGlucose',
              jasmine.objectContaining({
                body: jasmine.objectContaining({
                  startDate: jasmine.any(String),
                  endDate: jasmine.any(String),
                  manualReadingsSummary: mockSummary,
                }),
              }),
              { id: appointmentId }
            );

            // Verify response
            expect(response.shared).toBe(true);
            expect(response.recordCount).toBe(120);
            done();
          },
          error: err => fail(err),
        });
      });

      it('should use custom days parameter when provided', done => {
        const appointmentId = 'apt-456';
        const customDays = 7;
        const mockResponse: ShareGlucoseResponse = {
          shared: true,
          message: '35 lecturas compartidas',
          recordCount: 35,
        };

        readingsServiceSpy.exportManualReadingsSummary.and.returnValue(
          Promise.resolve(mockSummary)
        );

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockResponse,
          })
        );

        service.shareManualGlucoseData(appointmentId, { days: customDays }).subscribe({
          next: () => {
            // Verify ReadingsService was called with custom days
            expect(readingsServiceSpy.exportManualReadingsSummary).toHaveBeenCalledWith(customDays);
            done();
          },
          error: err => fail(err),
        });
      });

      it('should use custom date range when provided', done => {
        const appointmentId = 'apt-789';
        const customRange = {
          start: new Date('2024-01-15'),
          end: new Date('2024-02-15'),
        };
        const mockResponse: ShareGlucoseResponse = {
          shared: true,
          message: '95 lecturas compartidas',
          recordCount: 95,
        };

        readingsServiceSpy.exportManualReadingsSummary.and.returnValue(
          Promise.resolve(mockSummary)
        );

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockResponse,
          })
        );

        service.shareManualGlucoseData(appointmentId, { dateRange: customRange }).subscribe({
          next: () => {
            // Verify correct date range was sent
            const callArgs = apiGatewaySpy.request.calls.mostRecent().args;
            const requestBody = callArgs[1]?.body as any;

            expect(requestBody.startDate).toBe(customRange.start.toISOString());
            expect(requestBody.endDate).toBe(customRange.end.toISOString());

            // Verify days calculation (31 days between Jan 15 and Feb 15)
            expect(readingsServiceSpy.exportManualReadingsSummary).toHaveBeenCalledWith(31);
            done();
          },
          error: err => fail(err),
        });
      });

      it('should send complete summary with readings array', done => {
        const appointmentId = 'apt-123';
        const mockResponse: ShareGlucoseResponse = {
          shared: true,
          message: 'Data shared',
          recordCount: 120,
        };

        readingsServiceSpy.exportManualReadingsSummary.and.returnValue(
          Promise.resolve(mockSummary)
        );

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockResponse,
          })
        );

        service.shareManualGlucoseData(appointmentId).subscribe({
          next: () => {
            const callArgs = apiGatewaySpy.request.calls.mostRecent().args;
            const requestBody = callArgs[1]?.body as any;

            // Verify payload structure
            expect(requestBody).toEqual(
              jasmine.objectContaining({
                startDate: jasmine.any(String),
                endDate: jasmine.any(String),
                manualReadingsSummary: jasmine.objectContaining({
                  generatedAt: jasmine.any(String),
                  range: jasmine.any(Object),
                  unit: 'mg/dL',
                  totalReadings: 120,
                  statistics: jasmine.objectContaining({
                    average: 142.5,
                    minimum: 78,
                    maximum: 210,
                  }),
                  readings: jasmine.any(Array),
                }),
              })
            );

            // Verify manualReadingsSummary has expected structure
            expect(requestBody.manualReadingsSummary.statistics.average).toBeDefined();
            expect(requestBody.manualReadingsSummary.readings.length).toBe(2);
            done();
          },
          error: err => fail(err),
        });
      });

      it('should handle error when no readings available', done => {
        const appointmentId = 'apt-123';

        // Mock ReadingsService to throw error (no readings)
        readingsServiceSpy.exportManualReadingsSummary.and.returnValue(
          Promise.reject(new Error('No hay lecturas de glucosa en el rango especificado'))
        );

        service.shareManualGlucoseData(appointmentId).subscribe({
          next: () => fail('should have thrown error'),
          error: error => {
            expect(error.message).toContain('No hay lecturas');
            expect(apiGatewaySpy.request).not.toHaveBeenCalled();
            done();
          },
        });
      });

      it('should handle API gateway errors', done => {
        const appointmentId = 'apt-123';
        const mockError = {
          success: false,
          error: {
            message: 'Failed to share glucose data',
            code: 'SHARE_FAILED',
          },
        };

        readingsServiceSpy.exportManualReadingsSummary.and.returnValue(
          Promise.resolve(mockSummary)
        );

        apiGatewaySpy.request.and.returnValue(throwError(() => mockError));

        service.shareManualGlucoseData(appointmentId).subscribe({
          next: () => fail('should have thrown error'),
          error: error => {
            expect(error).toEqual(mockError);
            done();
          },
        });
      });
    });

    describe('getAppointments', () => {
      it('should call correct gateway endpoint with filters', done => {
        const mockAppointments: Appointment[] = [
          {
            id: '1',
            patientId: 'patient1',
            doctorId: 'doctor1',
            doctorName: 'Dr. Smith',
            date: '2024-02-15',
            startTime: '10:00',
            endTime: '10:30',
            status: 'confirmed',
            urgency: 'routine',
            reason: 'Regular checkup',
          },
        ];

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockAppointments,
          })
        );

        const startDate = new Date('2024-02-01');
        const endDate = new Date('2024-02-28');

        service.getAppointments('confirmed', startDate, endDate).subscribe({
          next: appointments => {
            expect(apiGatewaySpy.request).toHaveBeenCalledWith(
              'appointments.list',
              jasmine.objectContaining({
                params: jasmine.objectContaining({
                  status: 'confirmed',
                  start_date: startDate.toISOString(),
                  end_date: endDate.toISOString(),
                }),
              })
            );
            expect(appointments).toEqual(mockAppointments);
            done();
          },
          error: err => fail(err),
        });
      });

      it('should update appointments$ observable', done => {
        const mockAppointments: Appointment[] = [
          {
            id: '1',
            patientId: 'patient1',
            doctorId: 'doctor1',
            date: '2024-02-15',
            startTime: '10:00',
            endTime: '10:30',
            status: 'confirmed',
            urgency: 'routine',
            reason: 'Checkup',
          },
        ];

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockAppointments,
          })
        );

        let emittedAppointments: Appointment[] = [];
        service.appointments$.subscribe(appointments => {
          emittedAppointments = appointments;
        });

        service.getAppointments().subscribe({
          next: () => {
            expect(emittedAppointments).toEqual(mockAppointments);
            done();
          },
          error: err => fail(err),
        });
      });
    });

    describe('createAppointment', () => {
      it('should call correct gateway endpoint with request body', done => {
        const request: CreateAppointmentRequest = {
          doctorId: 'doctor1',
          date: '2024-02-20',
          startTime: '10:00',
          endTime: '10:30',
          urgency: 'routine',
          reason: 'Regular checkup',
          shareGlucoseData: true,
        };

        const mockResponse: Appointment = {
          id: 'new-apt-id',
          patientId: 'patient1',
          ...request,
          status: 'pending',
        };

        apiGatewaySpy.request.and.returnValues(
          of({
            success: true,
            data: mockResponse,
          }),
          of({ success: true, data: [] }) // refresh call
        );

        service.createAppointment(request).subscribe({
          next: appointment => {
            expect(apiGatewaySpy.request).toHaveBeenCalledWith(
              'appointments.create',
              jasmine.objectContaining({
                body: request,
              })
            );
            expect(appointment).toEqual(mockResponse);
            done();
          },
          error: err => fail(err),
        });
      });
    });

    describe('cancelAppointment', () => {
      it('should call correct gateway endpoint with reason', done => {
        const appointmentId = 'apt-123';
        const reason = 'Patient requested cancellation';
        const mockResponse: Appointment = {
          id: appointmentId,
          patientId: 'patient1',
          doctorId: 'doctor1',
          date: '2024-02-20',
          startTime: '10:00',
          endTime: '10:30',
          status: 'cancelled',
          urgency: 'routine',
          reason: 'Checkup',
          cancelledReason: reason,
        };

        apiGatewaySpy.request.and.returnValues(
          of({
            success: true,
            data: mockResponse,
          }),
          of({ success: true, data: [] }) // refresh call
        );

        service.cancelAppointment(appointmentId, reason).subscribe({
          next: appointment => {
            expect(apiGatewaySpy.request).toHaveBeenCalledWith(
              'appointments.cancel',
              jasmine.objectContaining({
                body: {
                  status: 'cancelled',
                  cancelledReason: reason,
                },
              }),
              { id: appointmentId }
            );
            expect(appointment.status).toBe('cancelled');
            done();
          },
          error: err => fail(err),
        });
      });
    });

    describe('rescheduleAppointment', () => {
      it('should call correct gateway endpoint with new time', done => {
        const appointmentId = 'apt-123';
        const newDate = '2024-02-25';
        const newStartTime = '14:00';
        const newEndTime = '14:30';

        const mockResponse: Appointment = {
          id: appointmentId,
          patientId: 'patient1',
          doctorId: 'doctor1',
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          status: 'rescheduled',
          urgency: 'routine',
          reason: 'Checkup',
        };

        apiGatewaySpy.request.and.returnValues(
          of({
            success: true,
            data: mockResponse,
          }),
          of({ success: true, data: [] }) // refresh call
        );

        service.rescheduleAppointment(appointmentId, newDate, newStartTime, newEndTime).subscribe({
          next: appointment => {
            expect(apiGatewaySpy.request).toHaveBeenCalledWith(
              'appointments.reschedule',
              jasmine.objectContaining({
                body: {
                  date: newDate,
                  startTime: newStartTime,
                  endTime: newEndTime,
                  status: 'rescheduled',
                },
              }),
              { id: appointmentId }
            );
            expect(appointment.date).toBe(newDate);
            done();
          },
          error: err => fail(err),
        });
      });
    });

    describe('getDoctors', () => {
      it('should call correct gateway endpoint with specialty filter', done => {
        const mockDoctors: Doctor[] = [
          {
            id: 'doctor1',
            name: 'Dr. Smith',
            specialty: 'Endocrinology',
            title: 'MD',
            email: 'smith@clinic.com',
            languages: ['English', 'Spanish'],
          },
        ];

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockDoctors,
          })
        );

        service.getDoctors('Endocrinology').subscribe({
          next: doctors => {
            expect(apiGatewaySpy.request).toHaveBeenCalledWith(
              'appointments.doctors',
              jasmine.objectContaining({
                params: { specialty: 'Endocrinology' },
              })
            );
            expect(doctors).toEqual(mockDoctors);
            done();
          },
          error: err => fail(err),
        });
      });
    });

    describe('getAvailableSlots', () => {
      it('should call correct gateway endpoint with parameters', done => {
        const doctorId = 'doctor1';
        const date = new Date('2024-02-20');
        const days = 7;

        const mockSlots: TimeSlot[] = [
          {
            date: '2024-02-20',
            startTime: '10:00',
            endTime: '10:30',
            available: true,
            doctorId: doctorId,
          },
        ];

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockSlots,
          })
        );

        service.getAvailableSlots(doctorId, date, days).subscribe({
          next: slots => {
            expect(apiGatewaySpy.request).toHaveBeenCalledWith(
              'appointments.slots',
              jasmine.objectContaining({
                params: {
                  doctor_id: doctorId,
                  start_date: date.toISOString(),
                  days: days.toString(),
                },
              })
            );
            expect(slots).toEqual(mockSlots);
            done();
          },
          error: err => fail(err),
        });
      });
    });

    describe('getStatistics', () => {
      it('should call correct gateway endpoint', done => {
        const mockStats: AppointmentStats = {
          totalAppointments: 50,
          completedAppointments: 40,
          upcomingAppointments: 5,
          cancelledAppointments: 5,
          averageWaitTime: 15,
          lastAppointmentDate: '2024-02-10',
          nextAppointmentDate: '2024-02-20',
        };

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockStats,
          })
        );

        service.getStatistics().subscribe({
          next: stats => {
            expect(apiGatewaySpy.request).toHaveBeenCalledWith('appointments.stats');
            expect(stats).toEqual(mockStats);
            done();
          },
          error: err => fail(err),
        });
      });
    });

    describe('joinVideoCall', () => {
      it('should call correct gateway endpoint', done => {
        const appointmentId = 'apt-123';
        const mockResponse = {
          url: 'https://video.platform.com/room/12345',
          token: 'jwt-token-for-video',
        };

        apiGatewaySpy.request.and.returnValue(
          of({
            success: true,
            data: mockResponse,
          })
        );

        service.joinVideoCall(appointmentId).subscribe({
          next: response => {
            expect(apiGatewaySpy.request).toHaveBeenCalledWith(
              'appointments.joinCall',
              jasmine.objectContaining({
                body: {},
              }),
              { id: appointmentId }
            );
            expect(response.url).toBe(mockResponse.url);
            done();
          },
          error: err => fail(err),
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle gateway authentication errors', done => {
      const mockError = {
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'AUTH_REQUIRED',
        },
      };

      apiGatewaySpy.request.and.returnValue(throwError(() => mockError));

      service.getAppointments().subscribe({
        next: () => fail('should have thrown error'),
        error: error => {
          expect(error).toEqual(mockError);
          done();
        },
      });
    });

    it('should handle gateway not found errors', done => {
      const mockError = {
        success: false,
        error: {
          message: 'Appointment not found',
          code: 'NOT_FOUND',
        },
      };

      apiGatewaySpy.request.and.returnValue(throwError(() => mockError));

      service.getAppointment('non-existent').subscribe({
        next: () => fail('should have thrown error'),
        error: error => {
          expect(error).toEqual(mockError);
          done();
        },
      });
    });

    it('should handle gateway server errors', done => {
      const mockError = {
        success: false,
        error: {
          message: 'Server error',
          code: 'INTERNAL_ERROR',
        },
      };

      apiGatewaySpy.request.and.returnValue(throwError(() => mockError));

      service.getAppointments().subscribe({
        next: () => fail('should have thrown error'),
        error: error => {
          expect(error).toEqual(mockError);
          done();
        },
      });
    });
  });
});
