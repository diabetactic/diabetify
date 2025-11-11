import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { AppointmentDetailPageRoutingModule } from './appointment-detail-routing.module';

import { AppointmentDetailPage } from './appointment-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AppointmentDetailPageRoutingModule,
    TranslateModule,
  ],
  declarations: [AppointmentDetailPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppointmentDetailPageModule {}
