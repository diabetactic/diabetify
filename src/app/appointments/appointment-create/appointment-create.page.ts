import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-appointment-create',
  templateUrl: './appointment-create.page.html',
  styleUrls: ['./appointment-create.page.scss'],
  standalone: false,
})
export class AppointmentCreatePage {
  appointmentForm: FormGroup;
  submitting = false;
  minDate: string;

  doctors = [
    { name: 'Dra. Sarah Johnson', specialty: 'Endocrinología Pediátrica' },
    { name: 'Lic. Maria Lopez', specialty: 'Nutrición' },
    { name: 'Dr. Carlos Mendez', specialty: 'Psicología' },
  ];

  appointmentTypes = [
    { value: 'control_routine', label: 'Control de Rutina' },
    { value: 'follow_up', label: 'Seguimiento' },
    { value: 'nutritionist', label: 'Nutricionista' },
    { value: 'emergency', label: 'Urgencia' },
  ];

  constructor(
    private fb: FormBuilder,
    private mockData: MockDataService,
    private router: Router
  ) {
    // Min date = hoy
    this.minDate = new Date().toISOString();

    this.appointmentForm = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required],
      doctor: ['', Validators.required],
      type: ['control_routine', Validators.required],
      notes: [''],
      reminders: [true],
    });
  }

  submitAppointment() {
    if (this.appointmentForm.invalid) return;

    this.submitting = true;

    const formValue = this.appointmentForm.value;
    const selectedDoctor = this.doctors.find(d => d.name === formValue.doctor);

    const appointment = {
      date: new Date(formValue.date),
      time: formValue.time,
      doctor: formValue.doctor,
      specialty: selectedDoctor?.specialty || 'General',
      hospital: 'Hospital Garrahan',
      location: 'Consultorio TBD (se confirmará)',
      type: formValue.type,
      notes: formValue.notes,
      reminders: formValue.reminders,
    };

    this.mockData.addAppointment(appointment).subscribe({
      next: appt => {
        console.log('✅ Cita creada:', appt);
        this.submitting = false;
        this.router.navigate(['/appointments']);
      },
      error: err => {
        console.error('Error creando cita:', err);
        this.submitting = false;
      },
    });
  }
}
