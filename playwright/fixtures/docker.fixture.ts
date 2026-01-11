import { test as baseTest } from './index';
import { AdminClient } from '../helpers/api/admin-client';
import { PRIMARY_USER, SECONDARY_USER, isDockerMode } from '../config/test-config';

export interface DockerTestFixtures {
  dockerSetup: void;
  cleanSlate: void;
}

export const dockerTest = baseTest.extend<DockerTestFixtures>({
  dockerSetup: [
    async ({ authenticatedAdminApi }, use) => {
      if (!isDockerMode) {
        await use();
        return;
      }

      await authenticatedAdminApi.setupTestEnvironment();
      await use();
    },
    { auto: true },
  ],

  cleanSlate: [
    async ({ request }, use) => {
      if (!isDockerMode) {
        await use();
        return;
      }

      const admin = new AdminClient(request);
      await admin.login();

      await admin.resetTestUser(PRIMARY_USER.dni);
      await admin.resetTestUser(SECONDARY_USER.dni);

      await use();

      await admin.resetTestUser(PRIMARY_USER.dni);
      await admin.resetTestUser(SECONDARY_USER.dni);
    },
    { auto: false },
  ],
});

export { isDockerMode };
