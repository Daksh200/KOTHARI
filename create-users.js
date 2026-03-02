// Simple script to create users - run with: node create-users.js
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUsers() {
  console.log('Creating users...');
  
  try {
    // Create roles
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN', permissions: { full: true } }
    });

    const staffRole = await prisma.role.upsert({
      where: { name: 'STAFF' },
      update: {},
      create: { name: 'STAFF', permissions: { billing: true } }
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin@1234', 10);
    await prisma.user.upsert({
      where: { email: 'admin@furnish.local' },
      update: {
        name: 'Admin',
        passwordHash: hashedPassword,
        roleId: adminRole.id,
        isActive: true,
      },
      create: {
        email: 'admin@furnish.local',
        name: 'Admin',
        passwordHash: hashedPassword,
        roleId: adminRole.id,
        isActive: true,
      }
    });

    // Create staff user
    const staffPassword = await bcrypt.hash('Staff@1234', 10);
    await prisma.user.upsert({
      where: { email: 'staff@furnish.local' },
      update: {
        name: 'Staff',
        passwordHash: staffPassword,
        roleId: staffRole.id,
        isActive: true,
      },
      create: {
        email: 'staff@furnish.local',
        name: 'Staff',
        passwordHash: staffPassword,
        roleId: staffRole.id,
        isActive: true,
      }
    });

    console.log('Users created successfully!');
    console.log('Admin: admin@furnish.local / Admin@1234');
    console.log('Staff: staff@furnish.local / Staff@1234');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();
