import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonAvatar, IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { UserProfile } from '@models/user-profile.model';
import { AuthState } from '@services/tidepool-auth.service';
import { TranslationService } from '@services/translation.service';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-profile-header',
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, IonAvatar, IonButton, TranslateModule, AppIconComponent],
})
export class ProfileHeaderComponent {
  @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;
  @Input() profile: UserProfile | null = null;
  @Input() authState: AuthState | null = null;
  @Output() avatarSelected = new EventEmitter<Event>();
  @Output() editProfile = new EventEmitter<void>();

  constructor(private translationService: TranslationService) {}

  get avatarUrl(): string | undefined {
    return this.profile?.avatar?.imagePath;
  }

  get greeting(): string {
    return this.translationService.instant('profile.greeting', {
      name: this.getFirstName(),
    });
  }

  get emailText(): string {
    const email = this.profile?.email ?? this.authState?.email ?? '';
    if (email.trim()) {
      return email;
    }
    return this.translationService.instant('profile.notAvailable');
  }

  get memberSinceText(): string {
    return this.formatMemberSince();
  }

  onAvatarSelected(event: Event) {
    this.avatarSelected.emit(event);
  }

  onTriggerAvatarUpload() {
    this.avatarInput?.nativeElement.click();
  }

  onEditProfile() {
    this.editProfile.emit();
  }

  private getFirstName(): string {
    const name = this.profile?.name || '';
    const trimmed = name.trim();
    if (!trimmed) {
      return this.translationService.instant('profile.defaultName');
    }
    const [first] = trimmed.split(' ');
    return first || trimmed;
  }

  private formatMemberSince(): string {
    if (!this.profile?.createdAt) {
      return this.translationService.instant('profile.memberSince.recent');
    }
    const createdDate = new Date(this.profile.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
      return this.translationService.instant('profile.memberSince.recent');
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const key = months === 1 ? 'profile.memberSince.month' : 'profile.memberSince.months';
      return this.translationService.instant(key, { count: months });
    } else {
      const years = Math.floor(diffDays / 365);
      const key = years === 1 ? 'profile.memberSince.year' : 'profile.memberSince.years';
      return this.translationService.instant(key, { count: years });
    }
  }
}
