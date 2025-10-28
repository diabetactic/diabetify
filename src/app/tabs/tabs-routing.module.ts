import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../dashboard/dashboard.module').then(m => m.DashboardPageModule),
      },
      {
        path: 'readings',
        loadChildren: () => import('../readings/readings.module').then(m => m.ReadingsPageModule),
      },
      {
        path: 'appointments',
        loadChildren: () =>
          import('../appointments/appointments.module').then(m => m.AppointmentsPageModule),
      },
      {
        path: 'trends',
        loadChildren: () => import('../trends/trends.module').then(m => m.TrendsPageModule),
      },
      {
        path: 'profile',
        loadChildren: () => import('../profile/profile.module').then(m => m.ProfilePageModule),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
