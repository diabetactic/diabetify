import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSelect, IonSelectOption, IonToggle } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { ThemeMode } from '@models/user-profile.model';
import { Language } from '@services/translation.service';

@Component({
  selector: 'app-profile-preferences',
  templateUrl: './profile-preferences.component.html',
  styleUrls: ['./profile-preferences.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonSelect, IonSelectOption, IonToggle, TranslateModule, AppIconComponent],
})
export class ProfilePreferencesComponent {
  @Input() currentTheme: ThemeMode = 'auto';
  @Input() currentLanguage: Language = Language.EN;
  @Input() currentGlucoseUnit: string = 'mg/dL';
  @Input() notificationsEnabled: boolean = false;
  @Input() unitOptions: { value: string; label: string }[] = [];

  @Output() themeChange = new EventEmitter<CustomEvent<{ value: ThemeMode }>>();
  @Output() languageChange = new EventEmitter<CustomEvent<{ value: Language }>>();
  @Output() glucoseUnitChange = new EventEmitter<CustomEvent<{ value: string }>>();
  @Output() notificationsToggle = new EventEmitter<CustomEvent<{ checked: boolean }>>();
  @Output() goToSettings = new EventEmitter<void>();

  onThemeChange(event: CustomEvent<{ value: ThemeMode }>) {
    this.themeChange.emit(event);
  }

  onLanguageChange(event: CustomEvent<{ value: Language }>) {
    this.languageChange.emit(event);
  }

  onGlucoseUnitChange(event: CustomEvent<{ value: string }>) {
    this.glucoseUnitChange.emit(event);
  }

  onNotificationsToggle(event: CustomEvent<{ checked: boolean }>) {
    this.notificationsToggle.emit(event);
  }

  onGoToSettings() {
    this.goToSettings.emit();
  }

  trackByUnitOption(index: number, option: { value: string; label: string }): string {
    return option.value;
  }
}
