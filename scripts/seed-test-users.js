#!/usr/bin/env node
/**
 * Seed Test Users Script
 *
 * Creates test users in the backend database for integration testing.
 * Each user has a unique DNI (40123456-40123463) to avoid queue conflicts.
 */

const SERVICE_URLS = {
  login: 'http://localhost:8003',
};

const TEST_USERS = [
  {
    dni: '40123456',
    password: 'thepassword',
    email: 'test40123456@diabetactic.com',
    name: 'Test',
    surname: 'User1',
    hospital_account: 'test_account_1',
  },
  {
    dni: '40123457',
    password: 'thepassword2',
    email: 'test40123457@diabetactic.com',
    name: 'Test',
    surname: 'User2',
    hospital_account: 'test_account_2',
  },
  {
    dni: '40123458',
    password: 'thepassword',
    email: 'test40123458@diabetactic.com',
    name: 'Test',
    surname: 'User3',
    hospital_account: 'test_account_3',
  },
  {
    dni: '40123459',
    password: 'thepassword',
    email: 'test40123459@diabetactic.com',
    name: 'Test',
    surname: 'User4',
    hospital_account: 'test_account_4',
  },
  {
    dni: '40123460',
    password: 'thepassword',
    email: 'test40123460@diabetactic.com',
    name: 'Test',
    surname: 'User5',
    hospital_account: 'test_account_5',
  },
  {
    dni: '40123461',
    password: 'thepassword',
    email: 'test40123461@diabetactic.com',
    name: 'Test',
    surname: 'User6',
    hospital_account: 'test_account_6',
  },
  {
    dni: '40123462',
    password: 'thepassword',
    email: 'test40123462@diabetactic.com',
    name: 'Test',
    surname: 'User7',
    hospital_account: 'test_account_7',
  },
  {
    dni: '40123463',
    password: 'thepassword',
    email: 'test40123463@diabetactic.com',
    name: 'Test',
    surname: 'User8',
    hospital_account: 'test_account_8',
  },
];

async function createUser(user) {
  try {
    const response = await fetch(`${SERVICE_URLS.login}/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...user,
        blocked: false,
        tidepool: null,
        times_measured: 0,
        streak: 0,
        max_streak: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If user already exists, that's fine
      if (
        response.status === 400 ||
        errorText.includes('already exists') ||
        errorText.includes('already has an account')
      ) {
        console.log(`✓ User ${user.dni} already exists`);
        return { success: true, existed: true };
      }
      throw new Error(`Failed to create user ${user.dni}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✓ Created user ${user.dni}`);
    return { success: true, existed: false, data };
  } catch (error) {
    console.error(`✗ Failed to create user ${user.dni}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function seedTestUsers() {
  console.log('🌱 Seeding test users...\n');

  const results = await Promise.all(TEST_USERS.map(createUser));

  const created = results.filter(r => r.success && !r.existed).length;
  const existed = results.filter(r => r.success && r.existed).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Already existed: ${existed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${TEST_USERS.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedTestUsers().catch(err => {
    console.error('❌ Seed script failed:', err);
    process.exit(1);
  });
}

module.exports = { seedTestUsers };
