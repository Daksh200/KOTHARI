require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting simple seed...');
  
  try {
    // Create roles
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN', permissions: JSON.stringify({ full: true }) }
    });

    const staffRole = await prisma.role.upsert({
      where: { name: 'STAFF' },
      update: {},
      create: { name: 'STAFF', permissions: JSON.stringify({ billing: true }) }
    });

    console.log('Roles created');

    // Create admin user
    const hashedPassword = await bcrypt.hash('123456', 10);
    await prisma.user.upsert({
      where: { email: 'daksh@123' },
      update: {},
      create: {
        email: 'daksh@123',
        name: 'Admin',
        passwordHash: hashedPassword,
        roleId: adminRole.id
      }
    });

    // Create staff user
    const staffPassword = await bcrypt.hash('qwerty', 10);
    await prisma.user.upsert({
      where: { email: 'staff@123' },
      update: {},
      create: {
        email: 'staff@123',
        name: 'Staff',
        passwordHash: staffPassword,
        roleId: staffRole.id
      }
    });

    console.log('Users created');
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
