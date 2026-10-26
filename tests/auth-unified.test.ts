import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { auth } from '../src/lib/auth';
import { createUserAction } from '../src/lib/actions/auth';
import { getUserEffectivePermissions, hasFeatureAccess } from '../src/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_elevate_super_secure_jwt_secret_key_2026';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, extraInfo: string = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName} ${extraInfo ? `(${extraInfo})` : ''}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   PRODUCTION CRM AUTHENTICATION & RBAC TEST SUITE  ');
  console.log('====================================================\n');

  const testEmail = `test.employee.${Date.now()}@elevate.crm`;
  const testPassword = 'Password@2026!';
  let createdUserId: string | null = null;

  try {
    // -----------------------------------------------------------
    // Scenario 1: Existing Admin account integrity and permissions
    // -----------------------------------------------------------
    console.log('Scenario 1: Existing Admin Account Integrity');
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@elevate.com' },
      include: { userRole: true },
    });

    assert(admin !== null, 'Admin account exists in database');
    assert(admin?.id === 'cmulac21o000bse1ckve8jth7', 'Admin ID is cmulac21o000bse1ckve8jth7');
    assert(admin?.role === 'admin', 'Admin role is admin');
    assert(
      typeof admin?.password === 'string' && admin.password.startsWith('$2b$10$OJtm7mHM'),
      'Admin password hash preserved unchanged ($2b$10$OJtm7mHM...)'
    );

    const adminPerms = getUserEffectivePermissions(admin);
    assert(adminPerms.includes('*'), 'Admin effective permissions contain wildcard full access [*]');
    assert(hasFeatureAccess(admin, 'users_management'), 'Admin has access to users_management');
    assert(hasFeatureAccess(admin, 'invoices'), 'Admin has access to invoices');

    // -----------------------------------------------------------
    // Scenario 2: Create team member with registered password and login
    // -----------------------------------------------------------
    console.log('\nScenario 2: Team Member Creation & Immediate Login');
    const createResult = await auth.api.createUser({
      body: {
        name: 'Automated Test Employee',
        email: testEmail,
        password: testPassword,
        role: 'telecaller',
        branch: 'branch_calicut',
      },
    });

    assert(!!createResult?.user, 'Team member created via auth API');
    createdUserId = createResult?.user?.id || null;
    assert(createResult?.user?.email === testEmail.toLowerCase(), 'Created user email is normalized');

    // Login with registered credentials
    const loginResult = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: testPassword,
      },
    });

    assert(loginResult?.user !== null, 'Login succeeds with registered email and original password');
    assert(!!loginResult?.token, 'A valid JWT session token is returned');
    assert(loginResult?.error === null, 'No error returned on valid login');

    // Verify token validity
    const verifiedJwt = jwt.verify(loginResult.token!, JWT_SECRET) as any;
    assert(verifiedJwt?.id === createdUserId, 'JWT contains correct user id');
    assert(verifiedJwt?.email === testEmail.toLowerCase(), 'JWT contains correct email');
    assert(verifiedJwt?.role === 'telecaller', 'JWT contains correct assigned role');

    // -----------------------------------------------------------
    // Scenario 3: Incorrect password is rejected
    // -----------------------------------------------------------
    console.log('\nScenario 3: Incorrect Password Rejection');
    const wrongPassResult = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: 'IncorrectPassword@999',
      },
    });
    assert(wrongPassResult.user === null, 'Login with incorrect password returns null user');
    assert(wrongPassResult.token === null, 'Login with incorrect password returns null token');
    assert(wrongPassResult.error?.message === 'Invalid email or password', 'Generic error message returned');

    // -----------------------------------------------------------
    // Scenario 4: Unknown email is rejected
    // -----------------------------------------------------------
    console.log('\nScenario 4: Unknown Email Rejection');
    const unknownEmailResult = await auth.api.signInEmail({
      body: {
        email: 'completely.unknown.user@doesnotexist.org',
        password: 'anyPassword@123',
      },
    });
    assert(unknownEmailResult.user === null, 'Login with unknown email returns null user');
    assert(unknownEmailResult.error?.message === 'Invalid email or password', 'Generic error message returned');

    // -----------------------------------------------------------
    // Scenario 5: Consistent email normalization during creation and login
    // -----------------------------------------------------------
    console.log('\nScenario 5: Email Normalization (Case & Whitespace)');
    const upperCasedInput = `  ${testEmail.toUpperCase()}  `;
    const normalizedLoginResult = await auth.api.signInEmail({
      body: {
        email: upperCasedInput,
        password: testPassword,
      },
    });
    assert(
      normalizedLoginResult.user !== null && normalizedLoginResult.user.id === createdUserId,
      'Login succeeds with uppercase email and leading/trailing whitespace'
    );

    // -----------------------------------------------------------
    // Scenario 6: Duplicate account creation is safely rejected
    // -----------------------------------------------------------
    console.log('\nScenario 6: Duplicate Account Creation Rejection');
    let duplicateRejected = false;
    let duplicateErrorMessage = '';
    try {
      await auth.api.createUser({
        body: {
          name: 'Duplicate Attempt',
          email: testEmail.toUpperCase(),
          password: 'AnotherPassword@123',
          role: 'telecaller',
        },
      });
    } catch (err: any) {
      duplicateRejected = true;
      duplicateErrorMessage = err.message;
    }
    assert(duplicateRejected, 'Duplicate account creation throws an error');
    assert(
      duplicateErrorMessage.includes('already exists'),
      'Clear, actionable validation error returned for duplicate email'
    );

    // -----------------------------------------------------------
    // Scenario 7: Passwords securely hashed & never returned to client
    // -----------------------------------------------------------
    console.log('\nScenario 7: Password Security & Hash Validation');
    assert(createResult?.user?.password === undefined, 'Raw password is stripped from creation result');
    assert(loginResult?.user?.password === undefined, 'Password is stripped from login result');

    const rawDbUser = await prisma.user.findUnique({
      where: { id: createdUserId! },
    });
    assert(rawDbUser?.password !== testPassword, 'Password is NOT stored in plaintext');
    assert(
      typeof rawDbUser?.password === 'string' && rawDbUser.password.startsWith('$2b$10$'),
      'Password stored with bcrypt cost factor 10 ($2b$10$...)'
    );
    assert(rawDbUser?.password.length === 60, 'Bcrypt hash length is exactly 60 characters');

    // -----------------------------------------------------------
    // Scenario 8: Credential records created correctly
    // -----------------------------------------------------------
    console.log('\nScenario 8: Credential Account Records Parity');
    const credentialAccount = await prisma.account.findFirst({
      where: {
        userId: createdUserId!,
        providerId: 'credential',
      },
    });
    assert(credentialAccount !== null, 'Associated credential account record exists in database');
    assert(credentialAccount?.accountId === testEmail.toLowerCase(), 'Credential accountId matches normalized email');
    assert(credentialAccount?.password === rawDbUser?.password, 'Credential password hash matches user password hash');

    // -----------------------------------------------------------
    // Scenario 9: Missing or invalid credentials cannot create a session
    // -----------------------------------------------------------
    console.log('\nScenario 9: Missing Credentials Session Prevention');
    const emptyPasswordLogin = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: '',
      },
    });
    assert(emptyPasswordLogin.user === null, 'Empty password rejected');

    const emptyEmailLogin = await auth.api.signInEmail({
      body: {
        email: '',
        password: testPassword,
      },
    });
    assert(emptyEmailLogin.user === null, 'Empty email rejected');

    // -----------------------------------------------------------
    // Scenario 10: Regular users cannot obtain Admin permissions
    // -----------------------------------------------------------
    console.log('\nScenario 10: Privilege Escalation Prevention');
    const regularUserPermissions = getUserEffectivePermissions(loginResult.user as any);
    assert(!regularUserPermissions.includes('*'), 'Regular telecaller does not have wildcard admin [*]');
    assert(
      !regularUserPermissions.includes('users_management'),
      'Regular telecaller cannot access users_management'
    );
    assert(
      !regularUserPermissions.includes('data_management'),
      'Regular telecaller cannot access data_management'
    );

    // -----------------------------------------------------------
    // Scenario 11: Unauthorized feature access rejected by server
    // -----------------------------------------------------------
    console.log('\nScenario 11: Server-Side RBAC Enforcement');
    assert(!hasFeatureAccess(loginResult.user as any, 'users_management'), 'telecaller denied users_management');
    assert(!hasFeatureAccess(loginResult.user as any, 'invoices'), 'telecaller denied invoices');
    assert(hasFeatureAccess(loginResult.user as any, 'call_register'), 'telecaller allowed call_register');
    assert(hasFeatureAccess(loginResult.user as any, 'enquiries'), 'telecaller allowed enquiries');

    // -----------------------------------------------------------
    // Scenario 12: Branch restrictions are enforced
    // -----------------------------------------------------------
    console.log('\nScenario 12: Branch Restrictions Enforcement');
    assert(loginResult.user?.branch === 'branch_calicut', 'User is strictly assigned to branch_calicut');
    assert(verifiedJwt?.branch === 'branch_calicut', 'Branch scope is embedded in the cryptographically signed JWT');

    // -----------------------------------------------------------
    // Scenario 13: Transactional consistency on account creation
    // -----------------------------------------------------------
    console.log('\nScenario 13: Transactional Consistency');
    // Verify that both User and Account exist and agree
    const userInDb = await prisma.user.findUnique({
      where: { id: createdUserId! },
      include: { account: true },
    });
    assert(userInDb !== null, 'User persisted in DB');
    assert(userInDb?.account.length === 1, 'Exactly one credential account linked to user');
    assert(userInDb?.account[0].providerId === 'credential', 'Linked account is credential provider');

    // -----------------------------------------------------------
    // Scenario 14: Existing accounts login validation
    // -----------------------------------------------------------
    console.log('\nScenario 14: Existing Remediated Accounts Login');
    // Test employee@gmail.com with its original password employe@123
    const empLogin = await auth.api.signInEmail({
      body: {
        email: 'employee@gmail.com',
        password: 'employe@123',
      },
    });
    assert(empLogin.user !== null, 'employee@gmail.com successfully authenticates with original password');
    assert(empLogin.user?.role === 'counselor', 'employee@gmail.com preserves counselor role');

    // Test m.jasilof@gmail.com with its original password jasil@123
    const jasilLogin = await auth.api.signInEmail({
      body: {
        email: 'm.jasilof@gmail.com',
        password: 'jasil@123',
      },
    });
    assert(jasilLogin.user !== null, 'm.jasilof@gmail.com successfully authenticates with original password');
    assert(jasilLogin.user?.role === 'manager', 'm.jasilof@gmail.com preserves manager role');

    // -----------------------------------------------------------
    // Scenario 15: Banned accounts cannot authenticate
    // -----------------------------------------------------------
    console.log('\nScenario 15: Suspended / Banned Account Enforcement');
    // Temporarily mark created test user as banned
    await prisma.user.update({
      where: { id: createdUserId! },
      data: {
        banned: true,
        banReason: 'Account suspended for policy violation',
      },
    });

    const bannedLoginResult = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: testPassword,
      },
    });

    assert(bannedLoginResult.user === null, 'Banned account login rejected');
    assert(bannedLoginResult.token === null, 'Banned account receives no token');
    assert(
      bannedLoginResult.error?.message.includes('suspended') ||
        bannedLoginResult.error?.message.includes('banned'),
      'Error message mentions account suspension'
    );
  } finally {
    // Clean up test account
    if (createdUserId) {
      console.log('\n--- Cleaning up isolated test user data ---');
      await prisma.account.deleteMany({ where: { userId: createdUserId } });
      await prisma.session.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.delete({ where: { id: createdUserId } });
      console.log(`Cleaned up test user ${createdUserId}`);
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
