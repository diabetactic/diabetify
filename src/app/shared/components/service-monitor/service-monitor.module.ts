import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ServiceMonitorComponent } from './service-monitor.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [ServiceMonitorComponent],
  exports: [ServiceMonitorComponent],
})
export class ServiceMonitorComponentModule {}
