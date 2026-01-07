import { Routes } from '@angular/router';
import { OnboardingGuard } from './core/guards';

/**
 * Application routes configuration.
 * Used by main.ts with provideRouter().
 */
export const APP_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage),
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
    canMatch: [OnboardingGuard],
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
  {
    path: 'bolus-calculator',
    canMatch: [OnboardingGuard],
    loadComponent: () =>
      import('./bolus-calculator/bolus-calculator.page').then(m => m.BolusCalculatorPage),
  },
  {
    path: 'achievements',
    canMatch: [OnboardingGuard],
    loadComponent: () => import('./achievements/achievements.page').then(m => m.AchievementsPage),
  },
  {
    path: 'conflicts',
    canMatch: [OnboardingGuard],
    loadComponent: () => import('./conflicts/conflicts.page').then(m => m.ConflictsPage),
  },
  {
    path: 'tips',
    canMatch: [OnboardingGuard],
    loadComponent: () => import('./tips/tips.page').then(m => m.TipsPage),
  },
];
