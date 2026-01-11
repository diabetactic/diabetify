import { test as base, expect } from '@playwright/test';
import { ApiClient } from '../helpers/api/client';
import { AdminClient } from '../helpers/api/admin-client';
import {
  LoginPage,
  TabsPage,
  DashboardPage,
  ReadingsPage,
  AddReadingPage,
  AppointmentsPage,
  AppointmentCreatePage,
  ProfilePage,
  TrendsPage,
  BolusCalculatorPage,
} from '../pages';
import { PRIMARY_USER, SECONDARY_USER, isDockerMode, type TestUser } from '../config/test-config';

export interface PageObjects {
  loginPage: LoginPage;
  tabsPage: TabsPage;
  dashboardPage: DashboardPage;
  readingsPage: ReadingsPage;
  addReadingPage: AddReadingPage;
  appointmentsPage: AppointmentsPage;
  appointmentCreatePage: AppointmentCreatePage;
  profilePage: ProfilePage;
  trendsPage: TrendsPage;
  bolusCalculatorPage: BolusCalculatorPage;
}

export interface TestFixtures {
  api: ApiClient;
  adminApi: AdminClient;
  pages: PageObjects;
  primaryUser: TestUser;
  secondaryUser: TestUser;
  authenticatedApi: ApiClient;
  authenticatedAdminApi: AdminClient;
}

export const test = base.extend<TestFixtures>({
  primaryUser: PRIMARY_USER,
  secondaryUser: SECONDARY_USER,

  api: async ({ request }, use) => {
    const client = new ApiClient(request);
    await use(client);
  },

  adminApi: async ({ request }, use) => {
    const client = new AdminClient(request);
    await use(client);
  },

  authenticatedApi: async ({ request, primaryUser }, use) => {
    const client = new ApiClient(request);
    await client.login(primaryUser);
    await use(client);
  },

  authenticatedAdminApi: async ({ request }, use) => {
    const client = new AdminClient(request);
    await client.login();
    await use(client);
  },

  pages: async ({ page }, use) => {
    const pageObjects: PageObjects = {
      loginPage: new LoginPage(page),
      tabsPage: new TabsPage(page),
      dashboardPage: new DashboardPage(page),
      readingsPage: new ReadingsPage(page),
      addReadingPage: new AddReadingPage(page),
      appointmentsPage: new AppointmentsPage(page),
      appointmentCreatePage: new AppointmentCreatePage(page),
      profilePage: new ProfilePage(page),
      trendsPage: new TrendsPage(page),
      bolusCalculatorPage: new BolusCalculatorPage(page),
    };
    await use(pageObjects);
  },
});

export { expect, isDockerMode };
export type { TestUser };
