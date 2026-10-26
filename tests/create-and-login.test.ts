import prisma from '../src/lib/prisma';
import { auth } from '../src/lib/auth';

async function testFullLifecycle() {
  console.log('Testing full user lifecycle: creation -> persistence -> login -> verification...');

  const uniqueSuffix = Date.now();
  const email = `new.engineer.${uniqueSuffix}@elevate.crm`;
  const password = `Engineer@SecurePass${uniqueSuffix}!`;

  // 1. Create User via auth.api.createUser
  const createRes = await auth.api.createUser({
    body: {
      name: `Field Engineer ${uniqueSuffix}`,
      email,
      password,
      role: 'job_orders',
      branch: 'branch_kochi',
    },
  });

  if (!createRes.user) {
    throw new Error('Failed to create user: ' + JSON.stringify(createRes));
  }

  const userId = createRes.user.id;
  console.log('User created:', { id: userId, email: createRes.user.email, role: createRes.user.role });

  // 2. Verify password is NOT plaintext in DB
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (dbUser?.password === password) {
    throw new Error('SECURITY VIOLATION: Password stored in plaintext!');
  }
  if (!dbUser?.password?.startsWith('$2b$10$')) {
    throw new Error('SECURITY VIOLATION: Password not hashed with bcrypt $2b$10$!');
  }
  console.log('Password securely hashed with bcrypt cost factor 10');

  // 3. Test HTTP login against Fastify backend
  const httpRes = await fetch('http://127.0.0.1:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const httpJson = await httpRes.json();
  if (!httpJson.success || !httpJson.data?.token) {
    throw new Error('HTTP login failed: ' + JSON.stringify(httpJson));
  }
  console.log('HTTP login successful! Token received:', httpJson.data.token.substring(0, 25) + '...');

  // 4. Test API login against auth.api.signInEmail
  const apiLoginRes = await auth.api.signInEmail({
    body: { email, password },
  });
  if (!apiLoginRes.user || !apiLoginRes.token) {
    throw new Error('API login failed: ' + JSON.stringify(apiLoginRes));
  }
  console.log('API signInEmail successful!');

  // 5. Clean up test user
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  console.log('Cleaned up test user');

  console.log('LIFECYCLE TEST COMPLETED SUCCESSFULLY WITH 100% SUCCESS!');
}

testFullLifecycle()
  .catch((e) => {
    console.error('Lifecycle test error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
