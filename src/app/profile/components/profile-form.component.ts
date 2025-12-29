import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { UserProfile } from '@models/user-profile.model';
import { TranslationService } from '@services/translation.service';

@Component({
  selector: 'app-profile-form',
  templateUrl: './profile-form.component.html',
  styleUrls: ['./profile-form.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFormComponent {
  @Input() profile: UserProfile | null = null;
  @Output() editAge = new EventEmitter<void>();
  @Output() goToAchievements = new EventEmitter<void>();

  constructor(private translationService: TranslationService) {}

  get ageDescription(): string {
    if (this.profile?.age) {
      return `${this.profile.age} ${this.translationService.instant('profile.yearsOld')}`;
    }
    return this.translationService.instant('profile.notSet');
  }

  get diabetesSummary(): string {
    const pieces: string[] = [];
    const typeLabel = this.getDiabetesTypeLabel();
    if (typeLabel) {
      pieces.push(typeLabel);
    }
    const diagnosisLabel = this.getDiagnosisLabel();
    if (diagnosisLabel) {
      pieces.push(diagnosisLabel);
    }
    if (!pieces.length) {
      return this.translationService.instant('profile.notSet');
    }
    return pieces.join(' - ');
  }

  get emergencySummary(): string {
    const emergency = this.profile?.emergencyContact;
    if (!emergency) {
      return this.translationService.instant('profile.emergencyContactPlaceholder');
    }
    const parts: string[] = [];
    if (emergency.name) {
      if (emergency.relationship) {
        parts.push(
          this.translationService.instant('profile.emergencyContactWithRelationship', {
            name: emergency.name,
            relationship: emergency.relationship,
          })
        );
      } else {
        parts.push(emergency.name);
      }
    }
    if (emergency.phone) {
      parts.push(
        this.translationService.instant('profile.emergencyContactPhone', {
          phone: emergency.phone,
        })
      );
    }
    if (!parts.length) {
      return this.translationService.instant('profile.emergencyContactPlaceholder');
    }
    return parts.join(' - ');
  }

  get hasEmergencyContact(): boolean {
    return Boolean(this.profile?.emergencyContact);
  }

  onEditAge() {
    this.editAge.emit();
  }

  onGoToAchievements() {
    this.goToAchievements.emit();
  }

  private getDiabetesTypeLabel(): string | null {
    if (!this.profile?.diabetesType) {
      return null;
    }
    const key = `profile.${this.profile.diabetesType}`;
    return this.translationService.instant(key);
  }

  private getDiagnosisLabel(): string | null {
    if (!this.profile?.diagnosisDate) {
      return null;
    }
    const formatted = this.formatDateValue(this.profile.diagnosisDate);
    if (!formatted) {
      return null;
    }
    return this.translationService.instant('profile.diagnosisSummary', {
      date: formatted,
    });
  }

  private formatDateValue(value: string): string | null {
    if (!value) {
      return null;
    }
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      const locale = this.translationService.getCurrentLanguage() === 'es' ? 'es-ES' : 'en-US';
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return null;
    }
  }
}
