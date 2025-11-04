import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonicModule,
  AlertController,
  LoadingController,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AppointmentService } from '../../core/services/appointment.service';
import { DemoDataService } from '../../core/services/demo-data.service';
import { ReadingsService } from '../../core/services/readings.service';
import { LocalAuthService } from '../../core/services/local-auth.service';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  experience: string;
  rating: number;
  reviews: number;
  availableDays: string[];
  nextAvailable?: string;
  profileImage?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  doctorId: string;
  date: string;
}

interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  icon: string;
}

@Component({
  selector: 'app-appointment-create',
  templateUrl: './appointment-create.page.html',
  styleUrls: ['./appointment-create.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppointmentCreatePage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Wizard steps
  currentStep = 1;
  totalSteps = 4;

  // Step 1: Select Doctor
  doctors: Doctor[] = [];
  selectedDoctor: Doctor | null = null;
  doctorSearchTerm = '';
  filteredDoctors: Doctor[] = [];

  // Step 2: Select Date & Time
  selectedDate: string = '';
  minDate: string = '';
  maxDate: string = '';
  timeSlots: TimeSlot[] = [];
  selectedTimeSlot: TimeSlot | null = null;

  // Step 3: Appointment Details
  appointmentTypes: AppointmentType[] = [];
  selectedType: AppointmentType | null = null;
  appointmentNotes = '';
  shareGlucoseData = false;
  glucoseDataDays = 30;

  // Step 4: Confirmation
  confirmationData: any = null;

  // UI state
  isLoading = false;
  loadingDoctors = false;
  loadingTimeSlots = false;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private appointmentService: AppointmentService,
    private demoDataService: DemoDataService,
    private readingsService: ReadingsService,
    private authService: LocalAuthService
  ) {
    // Set date constraints
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    const maxDateObj = new Date();
    maxDateObj.setMonth(maxDateObj.getMonth() + 3);
    this.maxDate = maxDateObj.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadDoctors();
    this.loadAppointmentTypes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load available doctors
   */
  private async loadDoctors() {
    this.loadingDoctors = true;
    try {
      this.doctors = await firstValueFrom(this.demoDataService.getDoctors());
      this.filteredDoctors = [...this.doctors];
    } catch (error) {
      console.error('Error loading doctors:', error);
      await this.showToast('Error al cargar la lista de doctores', 'danger');
    } finally {
      this.loadingDoctors = false;
    }
  }

  /**
   * Load appointment types
   */
  private async loadAppointmentTypes() {
    try {
      this.appointmentTypes = await firstValueFrom(this.demoDataService.getAppointmentTypes());
      // Pre-select regular type
      this.selectedType = this.appointmentTypes.find(t => t.id === 'regular') || null;
    } catch (error) {
      console.error('Error loading appointment types:', error);
    }
  }

  /**
   * Filter doctors by search term
   */
  onDoctorSearch(event: any) {
    const searchTerm = event.detail.value?.toLowerCase() || '';
    this.doctorSearchTerm = searchTerm;

    if (!searchTerm) {
      this.filteredDoctors = [...this.doctors];
    } else {
      this.filteredDoctors = this.doctors.filter(
        doctor =>
          doctor.name.toLowerCase().includes(searchTerm) ||
          doctor.specialty.toLowerCase().includes(searchTerm) ||
          doctor.hospital.toLowerCase().includes(searchTerm)
      );
    }
  }

  /**
   * Select a doctor
   */
  selectDoctor(doctor: Doctor) {
    this.selectedDoctor = doctor;
    // Pre-select the next available date
    if (doctor.nextAvailable) {
      this.selectedDate = doctor.nextAvailable;
      this.loadTimeSlots();
    }
  }

  /**
   * Handle date change
   */
  onDateChange(event: any) {
    this.selectedDate = event.detail.value;
    this.selectedTimeSlot = null;
    this.loadTimeSlots();
  }

  /**
   * Load available time slots for selected doctor and date
   */
  private async loadTimeSlots() {
    if (!this.selectedDoctor || !this.selectedDate) {
      return;
    }

    this.loadingTimeSlots = true;
    try {
      this.timeSlots = await firstValueFrom(
        this.demoDataService.getTimeSlots(this.selectedDoctor.id, this.selectedDate)
      );
    } catch (error) {
      console.error('Error loading time slots:', error);
      await this.showToast('Error al cargar los horarios disponibles', 'danger');
    } finally {
      this.loadingTimeSlots = false;
    }
  }

  /**
   * Select a time slot
   */
  selectTimeSlot(slot: TimeSlot) {
    if (slot.available) {
      this.selectedTimeSlot = slot;
    }
  }

  /**
   * Select appointment type
   */
  selectAppointmentType(type: AppointmentType) {
    this.selectedType = type;
  }

  /**
   * Go to next step
   */
  async nextStep() {
    // Validation
    if (this.currentStep === 1 && !this.selectedDoctor) {
      await this.showToast('Por favor, selecciona un doctor', 'warning');
      return;
    }

    if (this.currentStep === 2 && (!this.selectedDate || !this.selectedTimeSlot)) {
      await this.showToast('Por favor, selecciona fecha y hora', 'warning');
      return;
    }

    if (this.currentStep === 3 && !this.selectedType) {
      await this.showToast('Por favor, selecciona el tipo de cita', 'warning');
      return;
    }

    // Move to next step
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;

      // Prepare confirmation data
      if (this.currentStep === 4) {
        await this.prepareConfirmation();
      }
    }
  }

  /**
   * Go to previous step
   */
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  /**
   * Prepare confirmation data
   */
  private async prepareConfirmation() {
    const user = this.authService.getCurrentUser();

    this.confirmationData = {
      doctor: this.selectedDoctor,
      date: this.selectedDate,
      time: this.selectedTimeSlot?.time,
      type: this.selectedType,
      notes: this.appointmentNotes,
      shareGlucose: this.shareGlucoseData,
      glucoseDays: this.glucoseDataDays,
      patient: {
        name: user ? `${user.firstName} ${user.lastName}` : 'Usuario',
        email: user?.email || '',
      },
    };
  }

  /**
   * Create the appointment
   */
  async createAppointment() {
    const loading = await this.loadingController.create({
      message: 'Creando cita médica...',
    });
    await loading.present();

    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Prepare appointment data
      const appointmentData = {
        patientId: user.id,
        patientName: `${user.firstName} ${user.lastName}`,
        doctorId: this.selectedDoctor!.id,
        doctorName: this.selectedDoctor!.name,
        specialty: this.selectedDoctor!.specialty,
        date: this.selectedDate,
        time: this.selectedTimeSlot!.time,
        type: this.selectedType!.id,
        location: this.selectedDoctor!.hospital,
        notes: this.appointmentNotes,
        status: 'pending' as const,
      };

      // Create appointment
      const appointment = await firstValueFrom(
        this.appointmentService.createAppointment(appointmentData)
      );

      // Share glucose data if enabled
      if (this.shareGlucoseData && appointment.id) {
        try {
          const dateRange = {
            end: new Date(),
            start: new Date(Date.now() - this.glucoseDataDays * 24 * 60 * 60 * 1000),
          };
          await firstValueFrom(this.appointmentService.shareGlucoseData(appointment.id, dateRange));
        } catch (error) {
          console.error('Error sharing glucose data:', error);
          // Continue anyway, just log the error
        }
      }

      await loading.dismiss();
      await this.showToast('Cita médica creada exitosamente', 'success');

      // Navigate to appointment detail
      this.router.navigate(['/tabs/appointments', appointment.id]);
    } catch (error) {
      console.error('Error creating appointment:', error);
      await loading.dismiss();
      await this.showToast('Error al crear la cita médica', 'danger');
    }
  }

  /**
   * Cancel appointment creation
   */
  async cancel() {
    const alert = await this.alertController.create({
      header: 'Cancelar',
      message: '¿Estás seguro de que deseas cancelar? Se perderán todos los datos ingresados.',
      buttons: [
        {
          text: 'Continuar editando',
          role: 'cancel',
        },
        {
          text: 'Cancelar cita',
          handler: () => {
            this.router.navigate(['/tabs/appointments']);
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Get step progress percentage
   */
  get stepProgress(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  /**
   * Check if can proceed to next step
   */
  get canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedDoctor;
      case 2:
        return !!this.selectedDate && !!this.selectedTimeSlot;
      case 3:
        return !!this.selectedType;
      case 4:
        return true;
      default:
        return false;
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
