// Debug script to check users in database
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debug() {
  console.log('Checking database...');
  
  try {
    // Check roles
    const roles = await prisma.role.findMany();
    console.log('Roles:', JSON.stringify(roles, null, 2));
    
    // Check users
    const users = await prisma.user.findMany({
      include: { role: true }
    });
    console.log('Users:', JSON.stringify(users, null, 2));
    
    // Check if email matches
    const user = await prisma.user.findUnique({
      where: { email: 'admin@furnish.local' },
      include: { role: true }
    });
    console.log('Found user admin@furnish.local:', user ? 'YES' : 'NO');
    if (user) {
      console.log('User isActive:', user.isActive);
      console.log('Password hash length:', user.passwordHash.length);
      console.log('Password hash starts with:', user.passwordHash.substring(0, 10));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
