import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AppointmentsPage } from './appointments.page';

const routes: Routes = [
  {
    path: '',
    component: AppointmentsPage,
  },
  {
    path: 'appointment-detail',
    loadChildren: () =>
      import('./appointment-detail/appointment-detail.module').then(
        m => m.AppointmentDetailPageModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppointmentsPageRoutingModule {}
