// Demo mode - mock authentication without database

// Demo users for demonstration
const DEMO_USERS = [
  {
    id: 'demo-admin-1',
    email: 'admin@furnish.local',
    name: 'Admin User',
    password: 'Admin@1234',
    role: 'ADMIN',
    roleId: 'demo-role-admin',
  },
  {
    id: 'demo-staff-1',
    email: 'staff@furnish.local',
    name: 'Staff User',
    password: 'Staff@1234',
    role: 'STAFF',
    roleId: 'demo-role-staff',
  },
];

// Mock roles
const DEMO_ROLES = {
  'demo-role-admin': { id: 'demo-role-admin', name: 'ADMIN', permissions: { full: true } },
  'demo-role-staff': { id: 'demo-role-staff', name: 'STAFF', permissions: { billing: true } },
};

export async function verifyDemoUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = DEMO_USERS.find(u => u.email === normalizedEmail);
  
  if (!user) {
    return null;
  }
  
  // For demo, use plain text password comparison
  const passwordMatch = password === user.password;
  
  if (!passwordMatch) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleId: user.roleId,
  };
}

export function getDemoUserById(userId: string) {
  const user = DEMO_USERS.find(u => u.id === userId);
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleId: user.roleId,
  };
}

export function getDemoRole(roleId: string | number) {
  return DEMO_ROLES[String(roleId) as keyof typeof DEMO_ROLES] || null;
}

// Check if demo mode is enabled
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
}
