import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from '../../core/services/appointment.service';
import { Appointment, AppointmentResolutionResponse } from '../../core/models/appointment.model';
import { TranslationService } from '../../core/services/translation.service';
import { LoggerService } from '../../core/services/logger.service';
import { ROUTES } from '../../core/constants';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-appointment-detail',
  templateUrl: './appointment-detail.page.html',
  styleUrls: ['./appointment-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, AppIconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppointmentDetailPage implements OnInit {
  appointment: Appointment | null = null;
  resolution: AppointmentResolutionResponse | null = null;
  loading = false;
  loadingResolution = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService,
    private alertController: AlertController,
    private translationService: TranslationService,
    private logger: LoggerService
  ) {}

  ngOnInit() {
    const appointmentId = this.route.snapshot.paramMap.get('id');
    if (appointmentId) {
      this.loadAppointment(Number(appointmentId));
    } else {
      this.router.navigate([ROUTES.TABS_APPOINTMENTS]);
    }
  }

  /**
   * Load appointment details
   */
  async loadAppointment(id: number): Promise<void> {
    this.loading = true;
    try {
      this.appointment = await firstValueFrom(this.appointmentService.getAppointment(id));
      this.logger.info('UI', 'Appointment loaded', { appointmentId: id });

      // Also load resolution data
      this.loadResolution(id);
    } catch (error: unknown) {
      console.error('Error loading appointment:', error);
      await this.showError(
        (error as Error)?.message ||
          this.translationService.instant('appointments.errors.loadFailed')
      );
      this.router.navigate([ROUTES.TABS_APPOINTMENTS]);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Load appointment resolution data
   */
  async loadResolution(id: number): Promise<void> {
    this.loadingResolution = true;
    try {
      this.resolution = await firstValueFrom(this.appointmentService.getResolution(id));
      this.logger.info('UI', 'Resolution loaded', {
        appointmentId: id,
        resolution: this.resolution,
      });
    } catch (error: unknown) {
      // Resolution may not exist for pending appointments, which is expected
      this.logger.info('UI', 'Resolution not available', {
        appointmentId: id,
        error: (error as Error)?.message,
      });
      this.resolution = null;
    } finally {
      this.loadingResolution = false;
    }
  }

  /**
   * Format resolution date
   */
  formatResolutionDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Mapping from backend motive values to translation keys
   */
  private readonly motiveMapping: Record<string, string> = {
    // Spanish uppercase (backend format from MotivesEnum)
    AJUSTE: 'adjustment',
    HIPOGLUCEMIA: 'hypoglycemia',
    HIPERGLUCEMIA: 'hyperglycemia',
    CETOSIS: 'ketosis',
    DUDAS: 'questions',
    OTRO: 'other',
    // Legacy Spanish mappings
    CONTROL: 'control_routine',
    CONTROL_RUTINA: 'control_routine',
    SEGUIMIENTO: 'follow_up',
    EMERGENCIA: 'emergency',
    CONSULTA: 'consultation',
    // English lowercase (already correct)
    adjustment: 'adjustment',
    control_routine: 'control_routine',
    follow_up: 'follow_up',
    emergency: 'emergency',
    consultation: 'consultation',
    hypoglycemia: 'hypoglycemia',
    hyperglycemia: 'hyperglycemia',
    ketosis: 'ketosis',
    questions: 'questions',
    other: 'other',
  };

  /**
   * Mapping from backend insulin type values to translation keys
   */
  private readonly insulinTypeMapping: Record<string, string> = {
    rapida: 'rapid',
    RAPIDA: 'rapid',
    lenta: 'long',
    LENTA: 'long',
    corta: 'short',
    CORTA: 'short',
    intermedia: 'intermediate',
    INTERMEDIA: 'intermediate',
    mixta: 'mixed',
    MIXTA: 'mixed',
    ninguna: 'none',
    NINGUNA: 'none',
    rapid: 'rapid',
    short: 'short',
    intermediate: 'intermediate',
    long: 'long',
    mixed: 'mixed',
    none: 'none',
  };

  /**
   * Mapping from backend pump type values to translation keys
   */
  private readonly pumpTypeMapping: Record<string, string> = {
    jeringa: 'none',
    JERINGA: 'none',
    pluma: 'none',
    PLUMA: 'none',
    bomba: 'other',
    BOMBA: 'other',
    medtronic: 'medtronic',
    omnipod: 'omnipod',
    tandem: 'tandem',
    none: 'none',
    other: 'other',
  };

  /**
   * Format motive array to string
   */
  formatMotive(motive: string[]): string {
    if (!motive || motive.length === 0) return '-';
    return motive
      .map(m => {
        const mappedKey =
          this.motiveMapping[m] || this.motiveMapping[m.toUpperCase()] || m.toLowerCase();
        const translated = this.translationService.instant(`appointments.motives.${mappedKey}`);
        return translated && !translated.startsWith('appointments.motives.') ? translated : m;
      })
      .join(', ');
  }

  /**
   * Format insulin type
   */
  formatInsulinType(type: string): string {
    if (!type || this.isPlaceholderValue(type)) return '-';
    const mappedKey =
      this.insulinTypeMapping[type] ||
      this.insulinTypeMapping[type.toUpperCase()] ||
      type.toLowerCase();
    const translated = this.translationService.instant(`appointments.insulinTypes.${mappedKey}`);
    return translated && !translated.startsWith('appointments.insulinTypes.') ? translated : type;
  }

  /**
   * Format pump type
   */
  formatPumpType(type: string): string {
    if (!type || this.isPlaceholderValue(type)) return '-';
    const mappedKey =
      this.pumpTypeMapping[type] || this.pumpTypeMapping[type.toUpperCase()] || type.toLowerCase();
    const translated = this.translationService.instant(`appointments.pumpTypes.${mappedKey}`);
    return translated && !translated.startsWith('appointments.pumpTypes.') ? translated : type;
  }

  /**
   * Check if value is a placeholder (like "string" from OpenAPI defaults)
   */
  isPlaceholderValue(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      return (
        trimmed === '' || trimmed === 'string' || trimmed === 'null' || trimmed === 'undefined'
      );
    }
    return false;
  }

  /**
   * Format text field, handling placeholders
   */
  formatTextField(value: string | null | undefined): string {
    if (!value || this.isPlaceholderValue(value)) return '-';
    return value;
  }

  /**
   * Format number field, handling placeholders
   */
  formatNumberField(value: number | null | undefined, suffix: string = ''): string {
    if (value === null || value === undefined) return '-';
    return `${value}${suffix}`;
  }

  /**
   * Show error message
   */
  private async showError(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('app.error'),
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  /**
   * Navigate back
   */
  goBack(): void {
    this.router.navigate([ROUTES.TABS_APPOINTMENTS]);
  }
}
