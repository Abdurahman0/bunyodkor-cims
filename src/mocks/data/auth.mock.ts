import { faker } from '@faker-js/faker'
import type { UserRead, TokenResponse, PermissionRead, RoleWithPermissions } from '@/types/api'

interface MockUser {
  id: number
  email: string
  password: string // Only for mock - never expose in real code
  full_name: string
  phone: string
  is_super_admin: boolean
  status: 'active' | 'inactive'
  roles: RoleWithPermissions[]
}

const createMockPermissions = (codes: string[]): PermissionRead[] => {
  return codes.map((code, index) => ({
    id: index + 1,
    code,
    description: `Permission to ${code.replace('.', ' ')}`,
    created_at: faker.date.past().toISOString(),
  }))
}

const createMockRole = (name: string, permissions: string[]): RoleWithPermissions => ({
  id: faker.number.int({ min: 1, max: 100 }),
  name,
  description: `${name} role`,
  permissions: createMockPermissions(permissions),
  created_at: faker.date.past().toISOString(),
})

// Mock users with different roles
export const MOCK_USERS: Record<string, MockUser> = {
  admin: {
    id: 1,
    email: 'admin@bunyodkor.uz',
    password: 'admin123',
    full_name: 'Admin User',
    phone: '+998901234567',
    is_super_admin: true,
    status: 'active',
    roles: [createMockRole('Super Admin', ['*'])],
  },
  teacher: {
    id: 2,
    email: 'teacher@bunyodkor.uz',
    password: 'teacher123',
    full_name: 'Teacher User',
    phone: '+998901234568',
    is_super_admin: false,
    status: 'active',
    roles: [
      createMockRole('Teacher', [
        'students.view',
        'groups.view',
        'attendance.create',
        'attendance.view',
      ]),
    ],
  },
  manager: {
    id: 3,
    email: 'manager@bunyodkor.uz',
    password: 'manager123',
    full_name: 'Manager User',
    phone: '+998901234569',
    is_super_admin: false,
    status: 'active',
    roles: [
      createMockRole('Manager', [
        'students.*',
        'groups.*',
        'contracts.*',
        'transactions.*',
        'reports.view',
      ]),
    ],
  },
}

export const generateMockAuthResponse = (user: MockUser): TokenResponse => ({
  access_token: `mock_token_${user.id}_${Date.now()}`,
  token_type: 'bearer',
})

export const getUserFromToken = (token: string): UserRead | null => {
  // Extract user ID from mock token
  const match = token.match(/mock_token_(\d+)_/)
  if (!match) return null

  const userId = parseInt(match[1])
  const mockUser = Object.values(MOCK_USERS).find((u) => u.id === userId)

  if (!mockUser) return null

  // Return user without password
  const { password, ...userWithoutPassword } = mockUser
  return {
    ...userWithoutPassword,
    created_at: faker.date.past({ years: 1 }).toISOString(),
  }
}
