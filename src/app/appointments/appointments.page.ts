import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MockDataService, MockAppointment } from '../core/services/mock-data.service';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
  standalone: false,
})
export class AppointmentsPage implements OnInit {
  appointments: MockAppointment[] = [];
  upcomingAppointments: MockAppointment[] = [];
  pastAppointments: MockAppointment[] = [];
  segment: 'upcoming' | 'past' = 'upcoming';
  loading = true;

  constructor(
    private mockData: MockDataService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAppointments();
  }

  loadAppointments() {
    this.loading = true;

    this.mockData.getAppointments().subscribe(appointments => {
      this.appointments = appointments;

      this.upcomingAppointments = appointments.filter(a => a.status === 'upcoming');

      this.pastAppointments = appointments.filter(
        a => a.status === 'completed' || a.status === 'cancelled'
      );

      this.loading = false;
    });
  }

  get displayedAppointments(): MockAppointment[] {
    return this.segment === 'upcoming' ? this.upcomingAppointments : this.pastAppointments;
  }

  cancelAppointment(id: string) {
    if (confirm('¿Estás seguro de cancelar esta cita?')) {
      this.mockData.cancelAppointment(id).subscribe(() => {
        console.log('✅ Cita cancelada');
        this.loadAppointments();
      });
    }
  }

  viewDetails(appointment: MockAppointment) {
    // Navegar a detalles o mostrar modal
    this.router.navigate(['/appointment-details', appointment.id]);
  }

  addNewAppointment() {
    this.router.navigate(['/appointments/create']);
  }

  refreshAppointments(event?: any) {
    this.loadAppointments();
    if (event) {
      setTimeout(() => event.target.complete(), 1000);
    }
  }

  getAppointmentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      control_routine: 'Control de Rutina',
      emergency: 'Emergencia',
      follow_up: 'Seguimiento',
      nutritionist: 'Nutricionista',
    };
    return labels[type] || type;
  }

  getAppointmentTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      control_routine: '📋',
      emergency: '🚨',
      follow_up: '🔄',
      nutritionist: '🥗',
    };
    return icons[type] || '📅';
  }

  getDaysUntil(date: Date): number {
    const now = new Date();
    const appointmentDate = new Date(date);
    const diff = appointmentDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
