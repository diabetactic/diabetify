import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AppointmentDetailPage } from './appointment-detail.page';

const routes: Routes = [
  {
    path: '',
    component: AppointmentDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppointmentDetailPageRoutingModule {}
