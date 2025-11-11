import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

import { AppointmentsPageRoutingModule } from './appointments-routing.module';

import { AppointmentsPage } from './appointments.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AppointmentsPageRoutingModule, TranslateModule],
  declarations: [AppointmentsPage],
})
export class AppointmentsPageModule {}
