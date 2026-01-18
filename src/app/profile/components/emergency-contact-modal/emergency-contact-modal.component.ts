import {
  Component,
  Input,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { UserProfile } from '@models/user-profile.model';

@Component({
  selector: 'app-emergency-contact-modal',
  templateUrl: './emergency-contact-modal.component.html',
  styleUrls: ['./emergency-contact-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
  ],
})
export class EmergencyContactModalComponent implements OnInit {
  @Input() profile!: UserProfile;

  name: string = '';
  relationship: string = '';
  phone: string = '';

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    if (this.profile && this.profile.emergencyContact) {
      this.name = this.profile.emergencyContact.name || '';
      this.relationship = this.profile.emergencyContact.relationship || '';
      this.phone = this.profile.emergencyContact.phone || '';
    }
  }

  cancel() {
    this.modalController.dismiss(null, 'cancel');
  }

  save() {
    const data = {
      name: this.name,
      relationship: this.relationship,
      phone: this.phone,
    };
    this.modalController.dismiss(data, 'confirm');
  }
}
