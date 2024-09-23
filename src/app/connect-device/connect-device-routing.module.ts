import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConnectDevicePage } from './connect-device.page';

const routes: Routes = [
  {
    path: '',
    component: ConnectDevicePage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConnectDevicePageRoutingModule {}
