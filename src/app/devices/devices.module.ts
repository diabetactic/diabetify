import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DevicesPage } from './devices.page';

import { DevicesPageRoutingModule } from './devices-routing.module';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, DevicesPageRoutingModule, DevicesPage],
})
export class DevicesPageModule {}
