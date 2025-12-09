import { faker } from '@faker-js/faker'
import type { User, Role, Permission } from '@/types'

// All available permissions in the system
export const ALL_PERMISSIONS: Permission[] = [
  { id: 1, code: 'students.view', description: 'View students' },
  { id: 2, code: 'students.create', description: 'Create students' },
  { id: 3, code: 'students.edit', description: 'Edit students' },
  { id: 4, code: 'students.delete', description: 'Delete students' },
  { id: 5, code: 'groups.view', description: 'View groups' },
  { id: 6, code: 'groups.create', description: 'Create groups' },
  { id: 7, code: 'groups.edit', description: 'Edit groups' },
  { id: 8, code: 'groups.delete', description: 'Delete groups' },
  { id: 9, code: 'transactions.view', description: 'View transactions' },
  { id: 10, code: 'transactions.create', description: 'Create transactions' },
  { id: 11, code: 'transactions.edit', description: 'Edit transactions' },
  { id: 12, code: 'transactions.delete', description: 'Delete transactions' },
  { id: 13, code: 'contracts.view', description: 'View contracts' },
  { id: 14, code: 'contracts.create', description: 'Create contracts' },
  { id: 15, code: 'contracts.edit', description: 'Edit contracts' },
  { id: 16, code: 'contracts.delete', description: 'Delete contracts' },
  { id: 17, code: 'attendance.view', description: 'View attendance' },
  { id: 18, code: 'attendance.create', description: 'Create attendance' },
  { id: 19, code: 'reports.view', description: 'View reports' },
  { id: 20, code: 'users.view', description: 'View users' },
  { id: 21, code: 'users.create', description: 'Create users' },
  { id: 22, code: 'users.edit', description: 'Edit users' },
  { id: 23, code: 'users.delete', description: 'Delete users' },
  { id: 24, code: 'roles.view', description: 'View roles' },
  { id: 25, code: 'roles.create', description: 'Create roles' },
  { id: 26, code: 'roles.edit', description: 'Edit roles' },
  { id: 27, code: 'roles.delete', description: 'Delete roles' },
]

// Predefined roles
export const MOCK_ROLES_DB: Role[] = [
  {
    id: 1,
    name: 'Super Admin',
    description: 'Full system access',
    permissions: ALL_PERMISSIONS,
  },
  {
    id: 2,
    name: 'Teacher',
    description: 'Teaching staff with limited access',
    permissions: ALL_PERMISSIONS.filter((p) =>
      ['students.view', 'groups.view', 'attendance.view', 'attendance.create'].includes(p.code)
    ),
  },
  {
    id: 3,
    name: 'Manager',
    description: 'Administrative manager',
    permissions: ALL_PERMISSIONS.filter(
      (p) =>
        p.code.startsWith('students.') ||
        p.code.startsWith('groups.') ||
        p.code.startsWith('contracts.') ||
        p.code.startsWith('transactions.') ||
        p.code === 'reports.view'
    ),
  },
  {
    id: 4,
    name: 'Accountant',
    description: 'Finance department',
    permissions: ALL_PERMISSIONS.filter(
      (p) =>
        p.code.startsWith('transactions.') ||
        p.code.startsWith('contracts.') ||
        p.code === 'students.view' ||
        p.code === 'reports.view'
    ),
  },
  {
    id: 5,
    name: 'Receptionist',
    description: 'Front desk staff',
    permissions: ALL_PERMISSIONS.filter((p) =>
      ['students.view', 'students.create', 'students.edit', 'groups.view'].includes(p.code)
    ),
  },
]

// Mock users database (with password for mock login)
export interface MockUserWithPassword extends User {
  password: string
}

export const MOCK_USERS_DB: MockUserWithPassword[] = [
  {
    id: 1,
    phone: '+998901234567',
    email: 'admin@bunyodkor.uz',
    password: 'admin123',
    full_name: 'Super Admin',
    is_super_admin: true,
    status: 'active',
    created_at: faker.date.past({ years: 1 }).toISOString(),
    roles: [MOCK_ROLES_DB[0]], // Super Admin role
  },
  {
    id: 2,
    phone: '+998901234568',
    email: 'teacher@bunyodkor.uz',
    password: 'teacher123',
    full_name: 'John Doe',
    is_super_admin: false,
    status: 'active',
    created_at: faker.date.past({ years: 1 }).toISOString(),
    roles: [MOCK_ROLES_DB[1]], // Teacher role
  },
  {
    id: 3,
    phone: '+998901234569',
    email: 'manager@bunyodkor.uz',
    password: 'manager123',
    full_name: 'Jane Smith',
    is_super_admin: false,
    status: 'active',
    created_at: faker.date.past({ years: 1 }).toISOString(),
    roles: [MOCK_ROLES_DB[2]], // Manager role
  },
  {
    id: 4,
    phone: '+998901234570',
    email: 'accountant@bunyodkor.uz',
    password: 'accountant123',
    full_name: 'Alice Johnson',
    is_super_admin: false,
    status: 'active',
    created_at: faker.date.past({ years: 1 }).toISOString(),
    roles: [MOCK_ROLES_DB[3]], // Accountant role
  },
  {
    id: 5,
    phone: '+998901234571',
    email: 'receptionist@bunyodkor.uz',
    password: 'receptionist123',
    full_name: 'Bob Williams',
    is_super_admin: false,
    status: 'active',
    created_at: faker.date.past({ years: 1 }).toISOString(),
    roles: [MOCK_ROLES_DB[4]], // Receptionist role
  },
]

// Generate additional mock users
for (let i = 6; i <= 20; i++) {
  const randomRole = faker.helpers.arrayElement(MOCK_ROLES_DB.slice(1)) // Exclude Super Admin
  MOCK_USERS_DB.push({
    id: i,
    phone: `+99890${faker.string.numeric(7)}`,
    email: faker.internet.email().toLowerCase(),
    password: 'password123',
    full_name: faker.person.fullName(),
    is_super_admin: false,
    status: faker.helpers.arrayElement(['active', 'inactive'] as const),
    created_at: faker.date.past({ years: 2 }).toISOString(),
    roles: [randomRole],
  })
}

// Generate a mock user
export const generateMockUser = (data?: Partial<MockUserWithPassword>): MockUserWithPassword => {
  const id = MOCK_USERS_DB.length + 1
  const role = data?.roles?.[0] || faker.helpers.arrayElement(MOCK_ROLES_DB.slice(1))

  return {
    id,
    phone: data?.phone || `+99890${faker.string.numeric(7)}`,
    email: data?.email || faker.internet.email().toLowerCase(),
    password: data?.password || 'password123',
    full_name: data?.full_name || faker.person.fullName(),
    is_super_admin: data?.is_super_admin ?? false,
    status: data?.status || 'active',
    created_at: new Date().toISOString(),
    roles: data?.roles || [role],
  }
}

// Generate a mock role
export const generateMockRole = (data?: Partial<Role>): Role => {
  const id = MOCK_ROLES_DB.length + 1

  return {
    id,
    name: data?.name || faker.person.jobTitle(),
    description: data?.description || faker.lorem.sentence(),
    permissions: data?.permissions || [],
  }
}
