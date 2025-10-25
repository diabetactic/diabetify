import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('../dashboard/tab1.module').then(m => m.Tab1PageModule),
      },
      {
        path: 'devices',
        loadChildren: () => import('../devices/tab1.module').then(m => m.Tab1PageModule),
      },
      {
        path: 'readings',
        loadChildren: () => import('../readings/tab1.module').then(m => m.Tab1PageModule),
      },
      {
        path: 'profile',
        loadChildren: () => import('../profile/tab1.module').then(m => m.Tab1PageModule),
      },
      {
        path: '',
        redirectTo: '/tabs/dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/dashboard',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
