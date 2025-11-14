import { Routes } from '@angular/router';
import { OnboardingGuard } from './core/guards';

export const APP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: 'welcome',
    loadComponent: () => import('./welcome/welcome.page').then(m => m.WelcomePage),
  },
  {
    path: 'tabs',
    canMatch: [OnboardingGuard],
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
  },
  {
    path: 'dashboard',
    redirectTo: 'tabs/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'add-reading',
    canMatch: [OnboardingGuard],
    loadChildren: () =>
      import('./add-reading/add-reading.module').then(m => m.AddReadingPageModule),
  },
  {
    path: 'account-pending',
    loadChildren: () =>
      import('./account-pending/account-pending.module').then(m => m.AccountPendingPageModule),
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule),
  },
  {
    path: 'appointments',
    loadChildren: () =>
      import('./appointments/appointments.module').then(m => m.AppointmentsPageModule),
  },
  {
    path: 'dashboard/detail',
    canMatch: [OnboardingGuard],
    loadComponent: () =>
      import('./dashboard/dashboard-detail/dashboard-detail.page').then(m => m.DashboardDetailPage),
  },
  {
    path: 'integration-test',
    loadComponent: () => import('./testing/integration-test.page').then(m => m.IntegrationTestPage),
  },
];
