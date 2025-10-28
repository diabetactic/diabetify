import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  AppointmentService,
  Appointment,
  Doctor,
  TimeSlot,
  CreateAppointmentRequest,
  AppointmentStats,
} from './appointment.service';
import { environment } from '../../../environments/environment';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.backendServices.appointments.baseUrl}${environment.backendServices.appointments.apiPath}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AppointmentService],
    });
    service = TestBed.inject(AppointmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAppointments', () => {
    it('should retrieve appointments with filters', () => {
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
        {
          id: '2',
          patientId: 'patient1',
          doctorId: 'doctor2',
          doctorName: 'Dr. Jones',
          date: '2024-02-20',
          startTime: '14:00',
          endTime: '14:30',
          status: 'pending',
          urgency: 'urgent',
          reason: 'High glucose levels',
        },
      ];

      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');

      service.getAppointments('confirmed', startDate, endDate).subscribe(appointments => {
        expect(appointments).toEqual(mockAppointments);
      });

      const req = httpMock.expectOne(request => {
        return (
          request.url === `${baseUrl}/appointments` &&
          request.params.get('status') === 'confirmed' &&
          request.params.get('start_date') === startDate.toISOString() &&
          request.params.get('end_date') === endDate.toISOString()
        );
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockAppointments);
    });

    it('should update appointments subject after fetching', () => {
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

      let emittedAppointments: Appointment[] = [];
      service.appointments$.subscribe(appointments => {
        emittedAppointments = appointments;
      });

      service.getAppointments().subscribe();

      const req = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      req.flush(mockAppointments);

      expect(emittedAppointments).toEqual(mockAppointments);
    });

    it('should identify upcoming appointment correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const mockAppointments: Appointment[] = [
        {
          id: '1',
          patientId: 'patient1',
          doctorId: 'doctor1',
          date: futureDate.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '10:30',
          status: 'confirmed',
          urgency: 'routine',
          reason: 'Checkup',
        },
        {
          id: '2',
          patientId: 'patient1',
          doctorId: 'doctor2',
          date: '2020-01-01',
          startTime: '14:00',
          endTime: '14:30',
          status: 'completed',
          urgency: 'routine',
          reason: 'Old appointment',
        },
      ];

      let upcomingAppointment: Appointment | null = null;
      service.upcomingAppointment$.subscribe(apt => {
        upcomingAppointment = apt;
      });

      service.getAppointments().subscribe();

      const req = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      req.flush(mockAppointments);

      expect(upcomingAppointment).toBeTruthy();
      expect(upcomingAppointment!).toEqual(mockAppointments[0]);
    });
  });

  describe('createAppointment', () => {
    it('should create a new appointment', () => {
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
        id: 'new-appointment-id',
        patientId: 'patient1',
        ...request,
        status: 'pending',
      };

      service.createAppointment(request).subscribe(appointment => {
        expect(appointment).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/appointments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);

      // Verify refresh is called
      const refreshReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      refreshReq.flush([]);
    });

    it('should handle appointment creation errors', () => {
      const request: CreateAppointmentRequest = {
        doctorId: 'doctor1',
        date: '2024-02-20',
        startTime: '10:00',
        endTime: '10:30',
        urgency: 'routine',
        reason: 'Checkup',
      };

      service.createAppointment(request).subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toContain('Time slot is no longer available');
        },
      });

      const firstReq = httpMock.expectOne(`${baseUrl}/appointments`);
      expect(firstReq.request.method).toBe('POST');
      firstReq.flush(null, { status: 409, statusText: 'Conflict' });

      const retryReq = httpMock.expectOne(`${baseUrl}/appointments`);
      expect(retryReq.request.method).toBe('POST');
      retryReq.flush(null, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel an appointment with reason', () => {
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

      service.cancelAppointment(appointmentId, reason).subscribe(appointment => {
        expect(appointment.status).toBe('cancelled');
        expect(appointment.cancelledReason).toBe(reason);
      });

      const req = httpMock.expectOne(`${baseUrl}/appointments/${appointmentId}/cancel`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        status: 'cancelled',
        cancelledReason: reason,
      });
      req.flush(mockResponse);

      // Verify refresh is called
      const refreshReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      refreshReq.flush([]);
    });
  });

  describe('rescheduleAppointment', () => {
    it('should reschedule an appointment to new time', () => {
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

      service
        .rescheduleAppointment(appointmentId, newDate, newStartTime, newEndTime)
        .subscribe(appointment => {
          expect(appointment.date).toBe(newDate);
          expect(appointment.startTime).toBe(newStartTime);
          expect(appointment.status).toBe('rescheduled');
        });

      const req = httpMock.expectOne(`${baseUrl}/appointments/${appointmentId}/reschedule`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'rescheduled',
      });
      req.flush(mockResponse);

      // Verify refresh is called
      const refreshReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      refreshReq.flush([]);
    });
  });

  describe('getDoctors', () => {
    it('should retrieve list of doctors', () => {
      const mockDoctors: Doctor[] = [
        {
          id: 'doctor1',
          name: 'Dr. Smith',
          specialty: 'Endocrinology',
          title: 'MD',
          email: 'smith@clinic.com',
          languages: ['English', 'Spanish'],
        },
        {
          id: 'doctor2',
          name: 'Dr. Jones',
          specialty: 'Endocrinology',
          title: 'MD, PhD',
          email: 'jones@clinic.com',
          languages: ['English'],
        },
      ];

      service.getDoctors('Endocrinology').subscribe(doctors => {
        expect(doctors.length).toBe(2);
        expect(doctors).toEqual(mockDoctors);
      });

      const req = httpMock.expectOne(`${baseUrl}/doctors?specialty=Endocrinology`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDoctors);
    });

    it('should retrieve all doctors without filter', () => {
      const mockDoctors: Doctor[] = [];

      service.getDoctors().subscribe(doctors => {
        expect(doctors).toEqual(mockDoctors);
      });

      const req = httpMock.expectOne(`${baseUrl}/doctors`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDoctors);
    });
  });

  describe('getAvailableSlots', () => {
    it('should retrieve available time slots for a doctor', () => {
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
        {
          date: '2024-02-20',
          startTime: '10:30',
          endTime: '11:00',
          available: false,
          doctorId: doctorId,
        },
        {
          date: '2024-02-21',
          startTime: '14:00',
          endTime: '14:30',
          available: true,
          doctorId: doctorId,
        },
      ];

      service.getAvailableSlots(doctorId, date, days).subscribe(slots => {
        expect(slots.length).toBe(3);
        const availableSlots = slots.filter(s => s.available);
        expect(availableSlots.length).toBe(2);
      });

      const req = httpMock.expectOne(request => {
        return (
          request.url === `${baseUrl}/slots` &&
          request.params.get('doctor_id') === doctorId &&
          request.params.get('start_date') === date.toISOString() &&
          request.params.get('days') === days.toString()
        );
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockSlots);
    });
  });

  describe('getStatistics', () => {
    it('should retrieve appointment statistics', () => {
      const mockStats: AppointmentStats = {
        totalAppointments: 50,
        completedAppointments: 40,
        upcomingAppointments: 5,
        cancelledAppointments: 5,
        averageWaitTime: 15,
        lastAppointmentDate: '2024-02-10',
        nextAppointmentDate: '2024-02-20',
      };

      service.getStatistics().subscribe(stats => {
        expect(stats).toEqual(mockStats);
        expect(stats.totalAppointments).toBe(50);
      });

      const req = httpMock.expectOne(`${baseUrl}/appointments/stats`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });
  });

  describe('shareGlucoseData', () => {
    it('should share glucose data for an appointment with date range', () => {
      const appointmentId = 'apt-123';
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const mockResponse = {
        shared: true,
        recordCount: 150,
      };

      service.shareGlucoseData(appointmentId, dateRange).subscribe(response => {
        expect(response.shared).toBe(true);
        expect(response.recordCount).toBe(150);
      });

      const req = httpMock.expectOne(`${baseUrl}/appointments/${appointmentId}/share-glucose`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      req.flush(mockResponse);
    });

    it('should share all glucose data when no date range specified', () => {
      const appointmentId = 'apt-123';

      const mockResponse = {
        shared: true,
        recordCount: 500,
      };

      service.shareGlucoseData(appointmentId).subscribe(response => {
        expect(response.shared).toBe(true);
        expect(response.recordCount).toBe(500);
      });

      const req = httpMock.expectOne(`${baseUrl}/appointments/${appointmentId}/share-glucose`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });
  });

  describe('joinVideoCall', () => {
    it('should return video call URL and token', () => {
      const appointmentId = 'apt-123';
      const mockResponse = {
        url: 'https://video.platform.com/room/12345',
        token: 'jwt-token-for-video',
      };

      service.joinVideoCall(appointmentId).subscribe(response => {
        expect(response.url).toBe(mockResponse.url);
        expect(response.token).toBe(mockResponse.token);
      });

      const req = httpMock.expectOne(`${baseUrl}/appointments/${appointmentId}/join-call`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', () => {
      service.getAppointments().subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toContain('Unauthorized');
        },
      });

      const firstReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      expect(firstReq.request.method).toBe('GET');
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      const secondReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      expect(secondReq.request.method).toBe('GET');
      secondReq.flush(null, { status: 401, statusText: 'Unauthorized' });

      const thirdReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      expect(thirdReq.request.method).toBe('GET');
      thirdReq.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 404 not found error', () => {
      service.getAppointment('non-existent').subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toContain('not found');
        },
      });

      const firstReq = httpMock.expectOne(`${baseUrl}/appointments/non-existent`);
      expect(firstReq.request.method).toBe('GET');
      firstReq.flush(null, { status: 404, statusText: 'Not Found' });

      const secondReq = httpMock.expectOne(`${baseUrl}/appointments/non-existent`);
      expect(secondReq.request.method).toBe('GET');
      secondReq.flush(null, { status: 404, statusText: 'Not Found' });

      const thirdReq = httpMock.expectOne(`${baseUrl}/appointments/non-existent`);
      expect(thirdReq.request.method).toBe('GET');
      thirdReq.flush(null, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 500 server error', () => {
      service.getAppointments().subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toContain('Server error');
        },
      });

      const firstReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      expect(firstReq.request.method).toBe('GET');
      firstReq.flush(null, { status: 500, statusText: 'Internal Server Error' });

      const secondReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      expect(secondReq.request.method).toBe('GET');
      secondReq.flush(null, { status: 500, statusText: 'Internal Server Error' });

      const thirdReq = httpMock.expectOne(`${baseUrl}/appointments?limit=50&offset=0`);
      expect(thirdReq.request.method).toBe('GET');
      thirdReq.flush(null, { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
