import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonToggle } from '@ionic/angular/standalone';
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
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, IonToggle, TranslateModule, AppIconComponent],
})
export class ProfilePreferencesComponent {
  @Input() currentTheme: ThemeMode = 'auto';
  @Input() currentLanguage: Language = Language.EN;
  @Input() currentGlucoseUnit: string = 'mg/dL';
  @Input() notificationsEnabled: boolean = false;

  @Output() notificationsToggle = new EventEmitter<CustomEvent<{ checked: boolean }>>();
  @Output() testNotification = new EventEmitter<void>();
  @Output() goToSettings = new EventEmitter<void>();

  onNotificationsToggle(event: CustomEvent<{ checked: boolean }>) {
    this.notificationsToggle.emit(event);
  }

  onTestNotification() {
    this.testNotification.emit();
  }

  onGoToSettings() {
    this.goToSettings.emit();
  }
}
