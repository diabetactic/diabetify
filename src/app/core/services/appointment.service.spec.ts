import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AppointmentService } from './appointment.service';
import { ApiGatewayService, ApiResponse } from './api-gateway.service';
import { TranslationService } from './translation.service';
import { NotificationService } from './notification.service';
import {
  Appointment,
  CreateAppointmentRequest,
  AppointmentQueueState,
  AppointmentQueueStateResponse,
} from '../models/appointment.model';

/**
 * Mock NotificationService for testing
 */
class MockNotificationService {
  scheduleAppointmentReminder = jest.fn().mockResolvedValue(undefined);
  cancelNotification = jest.fn().mockResolvedValue(undefined);
}

/**
 * Comprehensive test suite for AppointmentService
 * Tests appointment retrieval, creation, error handling, and mock mode
 */
describe('AppointmentService', () => {
  let service: AppointmentService;
  let apiGateway: jest.Mocked<ApiGatewayService>;
  let translationService: jest.Mocked<TranslationService>;

  // Mock appointments
  const mockAppointment1: Appointment = {
    appointment_id: 1,
    user_id: 1000,
    glucose_objective: 120,
    insulin_type: 'rapid',
    dose: 10,
    fast_insulin: 'Humalog',
    fixed_dose: 5,
    ratio: 10,
    sensitivity: 50,
    pump_type: 'none',
    control_data: 'Regular checkup - stable control',
    motive: ['control_routine'],
    other_motive: null,
    another_treatment: null,
  };

  const mockAppointment2: Appointment = {
    appointment_id: 2,
    user_id: 1000,
    glucose_objective: 110,
    insulin_type: 'long',
    dose: 20,
    fast_insulin: 'Lantus',
    fixed_dose: 20,
    ratio: 12,
    sensitivity: 40,
    pump_type: 'none',
    control_data: 'Dose adjustment needed',
    motive: ['adjustment', 'follow_up'],
    other_motive: 'Review morning readings',
    another_treatment: 'Metformin 500mg',
  };

  const mockAppointments: Appointment[] = [mockAppointment1, mockAppointment2];

  beforeEach(() => {
    const apiGatewaySpy = {
      request: jest.fn(),
    } as unknown as jest.Mocked<ApiGatewayService>;
    const translationSpy = {
      instant: jest.fn(),
    } as unknown as jest.Mocked<TranslationService>;

    TestBed.configureTestingModule({
      providers: [
        AppointmentService,
        { provide: ApiGatewayService, useValue: apiGatewaySpy },
        { provide: TranslationService, useValue: translationSpy },
        { provide: NotificationService, useClass: MockNotificationService },
      ],
    });

    service = TestBed.inject(AppointmentService);
    // Force non-mock mode to test API gateway calls
    (service as any).isMockMode = false;

    apiGateway = TestBed.inject(ApiGatewayService) as jest.Mocked<ApiGatewayService>;
    translationService = TestBed.inject(TranslationService) as jest.Mocked<TranslationService>;

    // Default translation behavior
    translationService.instant.mockImplementation((key: string) => key);
  });

  afterEach(() => {
    // Ensure no pending subscriptions
    if (service) {
      // Clean up any active subscriptions
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAppointments()', () => {
    describe('Success Cases', () => {
      it('should fetch appointments successfully', done => {
        const response: ApiResponse<Appointment[]> = {
          success: true,
          data: mockAppointments,
        };

        apiGateway.request.mockReturnValue(of(response));

        service.getAppointments().subscribe({
          next: appointments => {
            expect(appointments).toEqual(mockAppointments);
            expect(appointments.length).toBe(2);
            expect(apiGateway.request).toHaveBeenCalledWith('extservices.appointments.mine');
            done();
          },
          error: () => fail('should not have errored'),
        });
      });

      it('should update appointments$ observable', done => {
        const response: ApiResponse<Appointment[]> = {
          success: true,
          data: mockAppointments,
        };

        apiGateway.request.mockReturnValue(of(response));

        // Subscribe to appointments$ to verify it updates
        service.appointments$.subscribe(appointments => {
          if (appointments.length > 0) {
            expect(appointments).toEqual(mockAppointments);
            done();
          }
        });

        service.getAppointments().subscribe();
      });

      it('should return empty array when no appointments exist', done => {
        const response: ApiResponse<Appointment[]> = {
          success: true,
          data: [],
        };

        apiGateway.request.mockReturnValue(of(response));

        service.getAppointments().subscribe({
          next: appointments => {
            expect(appointments).toEqual([]);
            expect(appointments.length).toBe(0);
            done();
          },
        });
      });

      it('should fetch appointments with all optional fields populated', done => {
        const fullAppointment: Appointment = {
          ...mockAppointment1,
          appointment_id: 3,
          other_motive: 'Unusual spike in readings',
          another_treatment: 'Metformin 1000mg',
        };

        const response: ApiResponse<Appointment[]> = {
          success: true,
          data: [fullAppointment],
        };

        apiGateway.request.mockReturnValue(of(response));

        service.getAppointments().subscribe({
          next: appointments => {
            expect(appointments[0].other_motive).toBe('Unusual spike in readings');
            expect(appointments[0].another_treatment).toBe('Metformin 1000mg');
            done();
          },
        });
      });

      it('should handle appointments with multiple motives', done => {
        const multiMotiveAppointment: Appointment = {
          ...mockAppointment1,
          motive: ['control_routine', 'follow_up', 'adjustment', 'emergency'],
        };

        const response: ApiResponse<Appointment[]> = {
          success: true,
          data: [multiMotiveAppointment],
        };

        apiGateway.request.mockReturnValue(of(response));

        service.getAppointments().subscribe({
          next: appointments => {
            expect(appointments[0].motive.length).toBe(4);
            expect(appointments[0].motive).toContain('emergency');
            done();
          },
        });
      });
    });

    describe('Error Cases', () => {
      it('should handle API error response with message', done => {
        const errorResponse: ApiResponse<Appointment[]> = {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error',
            retryable: false,
          },
        };

        apiGateway.request.mockReturnValue(of(errorResponse));

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Internal server error');
            done();
          },
        });
      });

      it('should handle API error without message', done => {
        const errorResponse: ApiResponse<Appointment[]> = {
          success: false,
        };

        apiGateway.request.mockReturnValue(of(errorResponse));

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Failed to fetch appointments');
            done();
          },
        });
      });

      it('should handle network error', done => {
        const networkError = {
          error: {
            code: 'NETWORK_ERROR',
            message: 'Network connection failed',
            retryable: true,
          },
        };

        apiGateway.request.mockReturnValue(throwError(() => networkError));

        translationService.instant.mockReturnValue('Network error occurred');

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Network error occurred');
            expect(translationService.instant).toHaveBeenCalledWith(
              'appointments.errors.networkError'
            );
            done();
          },
        });
      });

      it('should handle UNAUTHORIZED error', done => {
        const unauthorizedError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token expired',
            retryable: false,
          },
        };

        apiGateway.request.mockReturnValue(throwError(() => unauthorizedError));

        translationService.instant.mockReturnValue('Unauthorized access');

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Unauthorized access');
            expect(translationService.instant).toHaveBeenCalledWith(
              'appointments.errors.unauthorized'
            );
            done();
          },
        });
      });

      it('should handle NOT_FOUND error', done => {
        const notFoundError = {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
            retryable: false,
          },
        };

        apiGateway.request.mockReturnValue(throwError(() => notFoundError));

        translationService.instant.mockReturnValue('Not found');

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Not found');
            expect(translationService.instant).toHaveBeenCalledWith('appointments.errors.notFound');
            done();
          },
        });
      });

      it('should handle SERVICE_UNAVAILABLE error', done => {
        const serviceUnavailableError = {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service is down',
            retryable: true,
          },
        };

        apiGateway.request.mockReturnValue(throwError(() => serviceUnavailableError));

        translationService.instant.mockReturnValue('Service unavailable');

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Service unavailable');
            expect(translationService.instant).toHaveBeenCalledWith(
              'appointments.errors.serviceUnavailable'
            );
            done();
          },
        });
      });

      it('should handle error with only error.message', done => {
        const simpleError = {
          message: 'Simple error message',
        };

        apiGateway.request.mockReturnValue(throwError(() => simpleError));

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Simple error message');
            done();
          },
        });
      });

      it('should handle string error', done => {
        apiGateway.request.mockReturnValue(throwError(() => 'String error'));

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('String error');
            done();
          },
        });
      });

      it('should handle unknown error format', done => {
        apiGateway.request.mockReturnValue(throwError(() => ({ unknown: 'format' })));

        service.getAppointments().subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('An error occurred');
            done();
          },
        });
      });
    });
  });

  describe('getAppointment()', () => {
    beforeEach(() => {
      const response: ApiResponse<Appointment[]> = {
        success: true,
        data: mockAppointments,
      };
      apiGateway.request.mockReturnValue(of(response));
    });

    describe('Success Cases', () => {
      it('should get appointment by id', done => {
        service.getAppointment(1).subscribe({
          next: appointment => {
            expect(appointment).toEqual(mockAppointment1);
            expect(appointment.appointment_id).toBe(1);
            done();
          },
          error: () => fail('should not have errored'),
        });
      });

      it('should get appointment with id 2', done => {
        service.getAppointment(2).subscribe({
          next: appointment => {
            expect(appointment).toEqual(mockAppointment2);
            expect(appointment.insulin_type).toBe('long');
            done();
          },
        });
      });

      it('should call getAppointments internally', done => {
        jest.spyOn(service, 'getAppointments');

        service.getAppointment(1).subscribe({
          next: () => {
            expect(service.getAppointments).toHaveBeenCalled();
            done();
          },
        });
      });
    });

    describe('Error Cases', () => {
      it('should throw error when appointment not found', done => {
        service.getAppointment(999).subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Appointment not found');
            done();
          },
        });
      });

      it('should throw error when appointment id is 0', done => {
        service.getAppointment(0).subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Appointment not found');
            done();
          },
        });
      });

      it('should throw error when appointment id is negative', done => {
        service.getAppointment(-1).subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Appointment not found');
            done();
          },
        });
      });

      it('should propagate getAppointments errors', done => {
        const errorResponse: ApiResponse<Appointment[]> = {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Network failed',
            retryable: true,
          },
        };

        apiGateway.request.mockReturnValue(of(errorResponse));

        service.getAppointment(1).subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBeTruthy();
            done();
          },
        });
      });
    });
  });

  describe('createAppointment()', () => {
    const createRequest: CreateAppointmentRequest = {
      glucose_objective: 100,
      insulin_type: 'rapid',
      dose: 15,
      fast_insulin: 'NovoLog',
      fixed_dose: 10,
      ratio: 15,
      sensitivity: 45,
      pump_type: 'medtronic',
      control_data: 'New treatment plan',
      motive: ['control_routine'],
    };

    const createdAppointment: Appointment = {
      ...createRequest,
      appointment_id: 3,
      user_id: 1000,
      other_motive: null,
      another_treatment: null,
      scheduled_date: undefined,
      reminder_minutes_before: 30,
    };

    describe('Success Cases', () => {
      it('should create appointment successfully', done => {
        const response: ApiResponse<Appointment> = {
          success: true,
          data: createdAppointment,
        };

        apiGateway.request.mockReturnValue(of(response));

        // Mock getAppointments for refresh
        const refreshResponse: ApiResponse<Appointment[]> = {
          success: true,
          data: [...mockAppointments, createdAppointment],
        };

        apiGateway.request
          .mockReturnValueOnce(of(response))
          .mockReturnValueOnce(of(refreshResponse));

        service.createAppointment(createRequest).subscribe({
          next: appointment => {
            expect(appointment).toEqual(createdAppointment);
            expect(appointment.appointment_id).toBe(3);
            expect(apiGateway.request).toHaveBeenCalledWith('extservices.appointments.create', {
              body: createRequest,
            });
            done();
          },
          error: () => fail('should not have errored'),
        });
      });

      it('should create appointment with optional fields', done => {
        const fullRequest: CreateAppointmentRequest = {
          ...createRequest,
          other_motive: 'Custom reason',
          another_treatment: 'Glimepiride 2mg',
        };

        const fullAppointment: Appointment = {
          ...fullRequest,
          appointment_id: 4,
          user_id: 1000,
          scheduled_date: undefined,
          reminder_minutes_before: 30,
        };

        const response: ApiResponse<Appointment> = {
          success: true,
          data: fullAppointment,
        };

        apiGateway.request.mockReturnValue(of(response));

        service.createAppointment(fullRequest).subscribe({
          next: appointment => {
            expect(appointment.other_motive).toBe('Custom reason');
            expect(appointment.another_treatment).toBe('Glimepiride 2mg');
            done();
          },
        });
      });

      it('should create appointment with multiple motives', done => {
        const multiMotiveRequest: CreateAppointmentRequest = {
          ...createRequest,
          motive: ['control_routine', 'follow_up', 'adjustment'],
        };

        const multiMotiveAppointment: Appointment = {
          ...multiMotiveRequest,
          appointment_id: 5,
          user_id: 1000,
          other_motive: null,
          another_treatment: null,
          scheduled_date: undefined,
          reminder_minutes_before: 30,
        };

        const response: ApiResponse<Appointment> = {
          success: true,
          data: multiMotiveAppointment,
        };

        apiGateway.request.mockReturnValue(of(response));

        service.createAppointment(multiMotiveRequest).subscribe({
          next: appointment => {
            expect(appointment.motive.length).toBe(3);
            expect(appointment.motive).toContain('adjustment');
            done();
          },
        });
      });

      it('should refresh appointments after creation', done => {
        const createResponse: ApiResponse<Appointment> = {
          success: true,
          data: createdAppointment,
        };

        const refreshResponse: ApiResponse<Appointment[]> = {
          success: true,
          data: [...mockAppointments, createdAppointment],
        };

        apiGateway.request
          .mockReturnValueOnce(of(createResponse))
          .mockReturnValueOnce(of(refreshResponse));

        service.createAppointment(createRequest).subscribe({
          next: () => {
            // Give time for refresh to trigger
            setTimeout(() => {
              expect(apiGateway.request).toHaveBeenCalledTimes(2);
              expect(apiGateway.request).toHaveBeenCalledWith('extservices.appointments.mine');
              done();
            }, 100);
          },
        });
      });

      it('should update appointments$ observable after creation', done => {
        const createResponse: ApiResponse<Appointment> = {
          success: true,
          data: createdAppointment,
        };

        const refreshResponse: ApiResponse<Appointment[]> = {
          success: true,
          data: [...mockAppointments, createdAppointment],
        };

        apiGateway.request
          .mockReturnValueOnce(of(createResponse))
          .mockReturnValueOnce(of(refreshResponse));

        let updateCount = 0;
        service.appointments$.subscribe(appointments => {
          updateCount++;
          if (updateCount === 2) {
            // After refresh
            expect(appointments.length).toBe(3);
            done();
          }
        });

        service.createAppointment(createRequest).subscribe();
      });
    });

    describe('Error Cases', () => {
      it('should handle creation error with message', done => {
        const errorResponse: ApiResponse<Appointment> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid glucose objective',
            retryable: false,
          },
        };

        apiGateway.request.mockReturnValue(of(errorResponse));

        service.createAppointment(createRequest).subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Invalid glucose objective');
            done();
          },
        });
      });

      it('should handle creation error without message', done => {
        const errorResponse: ApiResponse<Appointment> = {
          success: false,
        };

        apiGateway.request.mockReturnValue(of(errorResponse));

        service.createAppointment(createRequest).subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Failed to create appointment');
            done();
          },
        });
      });

      it('should handle network error during creation', done => {
        const networkError = {
          error: {
            code: 'NETWORK_ERROR',
            message: 'Connection timeout',
            retryable: true,
          },
        };

        apiGateway.request.mockReturnValue(throwError(() => networkError));

        translationService.instant.mockReturnValue('Network error');

        service.createAppointment(createRequest).subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Network error');
            done();
          },
        });
      });

      it('should handle unauthorized error during creation', done => {
        const unauthorizedError = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token expired',
            retryable: false,
          },
        };

        apiGateway.request.mockReturnValue(throwError(() => unauthorizedError));

        translationService.instant.mockReturnValue('Not authorized');

        service.createAppointment(createRequest).subscribe({
          next: () => fail('should have errored'),
          error: error => {
            expect(error.message).toBe('Not authorized');
            done();
          },
        });
      });

      it('should not fail if refresh fails after successful creation', done => {
        const createResponse: ApiResponse<Appointment> = {
          success: true,
          data: createdAppointment,
        };

        const refreshError: ApiResponse<Appointment[]> = {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Refresh failed',
            retryable: true,
          },
        };

        apiGateway.request
          .mockReturnValueOnce(of(createResponse))
          .mockReturnValueOnce(of(refreshError));

        // Spy on console.error to verify it logs but doesn't throw
        jest.spyOn(console, 'error');

        service.createAppointment(createRequest).subscribe({
          next: appointment => {
            expect(appointment).toEqual(createdAppointment);
            // Give time for refresh to fail
            setTimeout(() => {
              expect(console.error).toHaveBeenCalled();
              done();
            }, 100);
          },
          error: () => fail('should not error on successful creation even if refresh fails'),
        });
      });
    });
  });

  describe('getQueueState()', () => {
    it('should return queue state when successful', done => {
      const response: ApiResponse<AppointmentQueueStateResponse> = {
        success: true,
        data: { state: 'PENDING' as AppointmentQueueState, position: 1 },
      };

      apiGateway.request.mockReturnValue(of(response));

      service.getQueueState().subscribe({
        next: state => {
          expect(state.state).toBe('PENDING');
          expect(state.position).toBe(1);
          done();
        },
        error: () => fail('should not have errored'),
      });
    });

    it('should return NONE state on 404 error (ApiError format)', done => {
      // Simulate ApiGatewayService error structure
      const errorResponse: ApiResponse<AppointmentQueueStateResponse> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Not Found',
          statusCode: 404,
          retryable: false,
          details: { detail: 'Appointment does not exist' },
        },
      };

      apiGateway.request.mockReturnValue(throwError(() => errorResponse));

      service.getQueueState().subscribe({
        next: state => {
          expect(state.state).toBe('NONE');
          done();
        },
        error: err => fail(`should not have errored, got: ${err}`),
      });
    });

    it('should return NONE state on 404 status code in ApiError', done => {
      const errorResponse: ApiResponse<AppointmentQueueStateResponse> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Some other message',
          statusCode: 404, // Key check
          retryable: false,
        },
      };

      apiGateway.request.mockReturnValue(throwError(() => errorResponse));

      service.getQueueState().subscribe({
        next: state => {
          expect(state.state).toBe('NONE');
          done();
        },
        error: () => fail('should not have errored'),
      });
    });

    it('should throw error for other errors', done => {
      const errorResponse: ApiResponse<AppointmentQueueStateResponse> = {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal Error',
          statusCode: 500,
          retryable: false,
        },
      };

      apiGateway.request.mockReturnValue(throwError(() => errorResponse));

      service.getQueueState().subscribe({
        next: () => fail('should have errored'),
        error: error => {
          expect(error.message).toBe('Internal Error');
          done();
        },
      });
    });
  });

  describe('appointments$ Observable', () => {
    it('should emit initial empty array', done => {
      service.appointments$.subscribe({
        next: appointments => {
          expect(appointments).toEqual([]);
          done();
        },
      });
    });

    it('should emit updated appointments after getAppointments', done => {
      const response: ApiResponse<Appointment[]> = {
        success: true,
        data: mockAppointments,
      };

      apiGateway.request.mockReturnValue(of(response));

      let emissionCount = 0;
      service.appointments$.subscribe(appointments => {
        emissionCount++;
        if (emissionCount === 2) {
          // Skip initial emission
          expect(appointments).toEqual(mockAppointments);
          done();
        }
      });

      service.getAppointments().subscribe();
    });

    it('should allow multiple subscribers', done => {
      const response: ApiResponse<Appointment[]> = {
        success: true,
        data: mockAppointments,
      };

      apiGateway.request.mockReturnValue(of(response));

      let subscriber1Received = false;
      let subscriber2Received = false;

      service.appointments$.subscribe(appointments => {
        if (appointments.length > 0) {
          subscriber1Received = true;
          checkBothReceived();
        }
      });

      service.appointments$.subscribe(appointments => {
        if (appointments.length > 0) {
          subscriber2Received = true;
          checkBothReceived();
        }
      });

      function checkBothReceived() {
        if (subscriber1Received && subscriber2Received) {
          done();
        }
      }

      service.getAppointments().subscribe();
    });
  });

  describe('Edge Cases', () => {
    it('should handle appointment with zero values', done => {
      const zeroValueAppointment: Appointment = {
        ...mockAppointment1,
        glucose_objective: 0,
        dose: 0,
        fixed_dose: 0,
        ratio: 0,
        sensitivity: 0,
      };

      const response: ApiResponse<Appointment[]> = {
        success: true,
        data: [zeroValueAppointment],
      };

      apiGateway.request.mockReturnValue(of(response));

      service.getAppointments().subscribe({
        next: appointments => {
          expect(appointments[0].dose).toBe(0);
          expect(appointments[0].glucose_objective).toBe(0);
          done();
        },
      });
    });

    it('should handle appointment with empty motive array', done => {
      const emptyMotiveAppointment: Appointment = {
        ...mockAppointment1,
        motive: [],
      };

      const response: ApiResponse<Appointment[]> = {
        success: true,
        data: [emptyMotiveAppointment],
      };

      apiGateway.request.mockReturnValue(of(response));

      service.getAppointments().subscribe({
        next: appointments => {
          expect(appointments[0].motive).toEqual([]);
          expect(appointments[0].motive.length).toBe(0);
          done();
        },
      });
    });

    it('should handle very large appointment list', done => {
      const largeList: Appointment[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockAppointment1,
        appointment_id: i + 1,
      }));

      const response: ApiResponse<Appointment[]> = {
        success: true,
        data: largeList,
      };

      apiGateway.request.mockReturnValue(of(response));

      service.getAppointments().subscribe({
        next: appointments => {
          expect(appointments.length).toBe(1000);
          expect(appointments[999].appointment_id).toBe(1000);
          done();
        },
      });
    });

    it('should handle appointment with very long string fields', done => {
      const longStringAppointment: Appointment = {
        ...mockAppointment1,
        control_data: 'A'.repeat(10000),
        other_motive: 'B'.repeat(5000),
        another_treatment: 'C'.repeat(5000),
      };

      const response: ApiResponse<Appointment[]> = {
        success: true,
        data: [longStringAppointment],
      };

      apiGateway.request.mockReturnValue(of(response));

      service.getAppointments().subscribe({
        next: appointments => {
          expect(appointments[0].control_data!.length).toBe(10000);
          expect(appointments[0].other_motive!.length).toBe(5000);
          done();
        },
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous getAppointments calls', done => {
      const response: ApiResponse<Appointment[]> = {
        success: true,
        data: mockAppointments,
      };

      apiGateway.request.mockReturnValue(of(response));

      let callsCompleted = 0;

      service.getAppointments().subscribe(() => {
        callsCompleted++;
        if (callsCompleted === 3) done();
      });

      service.getAppointments().subscribe(() => {
        callsCompleted++;
        if (callsCompleted === 3) done();
      });

      service.getAppointments().subscribe(() => {
        callsCompleted++;
        if (callsCompleted === 3) done();
      });
    });

    it('should handle getAppointment and createAppointment concurrently', done => {
      const getResponse: ApiResponse<Appointment[]> = {
        success: true,
        data: mockAppointments,
      };

      const createResponse: ApiResponse<Appointment> = {
        success: true,
        data: { ...mockAppointment1, appointment_id: 999 },
      };

      // createAppointment internally calls refreshAppointments() which calls getAppointments()
      // So we need 3 return values: get, create, get (from refresh)
      apiGateway.request
        .mockReturnValueOnce(of(getResponse))
        .mockReturnValueOnce(of(createResponse))
        .mockReturnValueOnce(of(getResponse));

      let getCompleted = false;
      let createCompleted = false;

      service.getAppointments().subscribe(() => {
        getCompleted = true;
        if (createCompleted) done();
      });

      service
        .createAppointment({
          glucose_objective: 100,
          insulin_type: 'rapid',
          dose: 10,
          fast_insulin: 'test',
          fixed_dose: 5,
          ratio: 10,
          sensitivity: 50,
          pump_type: 'none',
          control_data: 'test',
          motive: ['control_routine'],
        })
        .subscribe(() => {
          createCompleted = true;
          if (getCompleted) done();
        });
    });
  });
});
