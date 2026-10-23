import prisma from '../src/lib/prisma';

async function main() {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
    const branches = await prisma.branch.findMany();
    const roles = await prisma.role.findMany();

    console.log('=== DATABASE STATUS ===');
    console.log('Users count:', users.length, users);
    console.log('Branches count:', branches.length, branches);
    console.log('Roles count:', roles.length, roles);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
