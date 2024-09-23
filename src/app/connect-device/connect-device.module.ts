import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConnectDevicePage } from './connect-device.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { ConnectDevicePageRoutingModule } from './connect-device-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    ConnectDevicePageRoutingModule
  ],
  declarations: [ConnectDevicePage]
})
export class ConnectDevicePageModule {}
