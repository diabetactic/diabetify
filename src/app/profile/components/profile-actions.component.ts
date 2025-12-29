import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-profile-actions',
  templateUrl: './profile-actions.component.html',
  styleUrls: ['./profile-actions.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, TranslateModule, AppIconComponent],
})
export class ProfileActionsComponent {
  @Output() signOut = new EventEmitter<void>();

  onSignOut() {
    this.signOut.emit();
  }
}
