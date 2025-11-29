import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AppointmentsPage } from './appointments.page';

const routes: Routes = [
  {
    path: '',
    component: AppointmentsPage,
  },
  {
    path: 'create',
    loadChildren: () =>
      import('./appointment-create/appointment-create.module').then(
        m => m.AppointmentCreatePageModule
      ),
  },
  {
    path: 'appointment-detail/:id',
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
