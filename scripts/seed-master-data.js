const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

const dbUrl = process.env.POSTGRES_PRISMA_DATABASE_URL || process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});

async function seedMasterData() {
  console.log('Connecting and seeding roles and branches...');

  const defaultRoles = [
    { id: 'role_admin', name: 'admin', description: 'Full administrative access', permissions: ['*'] },
    { id: 'role_manager', name: 'manager', description: 'Branch & Operations Manager', permissions: ['leads:manage', 'enquiries:manage', 'reports:view'] },
    { id: 'role_executive', name: 'executive', description: 'Branch Executive', permissions: ['admissions:create', 'invoices:create'] },
    { id: 'role_telecaller', name: 'telecaller', description: 'Telecaller for enquiries and follow-ups', permissions: ['enquiries:read', 'calls:create'] },
    { id: 'role_counselor', name: 'counselor', description: 'Academic Counselor', permissions: ['enquiries:manage', 'admissions:create'] },
  ];

  for (const role of defaultRoles) {
    try {
      await prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description, permissions: role.permissions },
        create: {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          updatedAt: new Date(),
        },
      });
      console.log('Role seeded:', role.name);
    } catch (e) {
      console.error('Role error:', role.name, e.message);
    }
  }

  const defaultBranches = [
    { id: 'branch_main', name: 'Main Branch', address: 'Head Office, Default Branch', phone: '+91 9876543210', email: 'main@elevate.com' },
    { id: 'branch_calicut', name: 'Calicut Branch', address: 'Mavoor Road, Calicut', phone: '+91 9876543211', email: 'calicut@elevate.com' },
    { id: 'branch_kochi', name: 'Kochi Branch', address: 'MG Road, Kochi', phone: '+91 9876543212', email: 'kochi@elevate.com' },
  ];

  for (const branch of defaultBranches) {
    try {
      await prisma.branch.upsert({
        where: { name: branch.name },
        update: { address: branch.address, phone: branch.phone, email: branch.email },
        create: {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          isActive: true,
        },
      });
      console.log('Branch seeded:', branch.name);
    } catch (e) {
      console.error('Branch error:', branch.name, e.message);
    }
  }

  console.log('Master data seeding complete.');
}

seedMasterData()
  .catch((e) => {
    console.error('Fatal error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
