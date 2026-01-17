import { Component, Input, OnInit } from '@angular/core';
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
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { UserProfile } from '@models/user-profile.model';

@Component({
  selector: 'app-diabetes-info-modal',
  templateUrl: './diabetes-info-modal.component.html',
  styleUrls: ['./diabetes-info-modal.component.scss'],
  standalone: true,
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
    IonSelect,
    IonSelectOption,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonLabel,
  ],
})
export class DiabetesInfoModalComponent implements OnInit {
  @Input() profile!: UserProfile;

  diabetesType: 'type1' | 'type2' | 'gestational' | 'other' = 'type1';
  diagnosisDate: string = '';

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    if (this.profile) {
      this.diabetesType = this.profile.diabetesType || 'type1';
      this.diagnosisDate = this.profile.diagnosisDate || new Date().toISOString();
    }
  }

  cancel() {
    this.modalController.dismiss(null, 'cancel');
  }

  save() {
    const data = {
      diabetesType: this.diabetesType,
      diagnosisDate: this.diagnosisDate,
    };
    this.modalController.dismiss(data, 'confirm');
  }
}
