import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';
import { SettingsPage } from './settings.page';

const routes: Routes = [
  {
    path: '',
    component: SettingsPage,
    canActivate: [AuthGuard],
  },
  {
    path: 'advanced',
    canActivate: [AuthGuard],
    loadChildren: () => import('./advanced/advanced.module').then(m => m.AdvancedPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
