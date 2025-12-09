import { http, HttpResponse, delay } from 'msw'
import { MOCK_ROLES_DB, ALL_PERMISSIONS, generateMockRole } from '../data/users.mock'
import type { Role } from '@/types'

const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const rolesHandlers = [
  // GET /roles - List all roles
  http.get(`${getApiUrl()}/roles`, async () => {
    await delay(400)

    return HttpResponse.json({
      data: MOCK_ROLES_DB,
    })
  }),

  // GET /permissions - List all available permissions
  http.get(`${getApiUrl()}/permissions`, async () => {
    await delay(300)

    return HttpResponse.json({
      data: ALL_PERMISSIONS,
    })
  }),

  // GET /roles/:id - Get single role
  http.get(`${getApiUrl()}/roles/:id`, async ({ params }) => {
    await delay(300)
    const { id } = params
    const role = MOCK_ROLES_DB.find((r) => r.id === parseInt(id as string))

    if (!role) {
      return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    }

    return HttpResponse.json(role)
  }),

  // POST /roles - Create new role
  http.post(`${getApiUrl()}/roles`, async ({ request }) => {
    await delay(600)
    const body = (await request.json()) as Partial<Role>

    // Validate required fields
    if (!body.name || !body.permissions) {
      return HttpResponse.json(
        { message: 'Missing required fields: name, permissions' },
        { status: 400 }
      )
    }

    // Check if role name already exists
    if (MOCK_ROLES_DB.some((r) => r.name.toLowerCase() === body.name?.toLowerCase())) {
      return HttpResponse.json({ message: 'Role name already exists' }, { status: 409 })
    }

    const newRole = generateMockRole(body)
    MOCK_ROLES_DB.push(newRole)

    return HttpResponse.json(newRole, { status: 201 })
  }),

  // PATCH /roles/:id - Update role
  http.patch(`${getApiUrl()}/roles/:id`, async ({ params, request }) => {
    await delay(600)
    const { id } = params
    const body = (await request.json()) as Partial<Role>

    const index = MOCK_ROLES_DB.findIndex((r) => r.id === parseInt(id as string))

    if (index === -1) {
      return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    }

    // Don't allow updating Super Admin role
    if (MOCK_ROLES_DB[index].name === 'Super Admin') {
      return HttpResponse.json({ message: 'Cannot modify Super Admin role' }, { status: 403 })
    }

    // Check if new name already exists (excluding current role)
    if (
      body.name &&
      MOCK_ROLES_DB.some(
        (r) => r.name.toLowerCase() === body.name?.toLowerCase() && r.id !== parseInt(id as string)
      )
    ) {
      return HttpResponse.json({ message: 'Role name already exists' }, { status: 409 })
    }

    MOCK_ROLES_DB[index] = { ...MOCK_ROLES_DB[index], ...body }

    return HttpResponse.json(MOCK_ROLES_DB[index])
  }),

  // DELETE /roles/:id - Delete role
  http.delete(`${getApiUrl()}/roles/:id`, async ({ params }) => {
    await delay(500)
    const { id } = params
    const index = MOCK_ROLES_DB.findIndex((r) => r.id === parseInt(id as string))

    if (index === -1) {
      return HttpResponse.json({ message: 'Role not found' }, { status: 404 })
    }

    // Don't allow deleting predefined system roles
    if (['Super Admin', 'Teacher', 'Manager', 'Accountant', 'Receptionist'].includes(MOCK_ROLES_DB[index].name)) {
      return HttpResponse.json({ message: 'Cannot delete system role' }, { status: 403 })
    }

    MOCK_ROLES_DB.splice(index, 1)

    return HttpResponse.json({ message: 'Role deleted successfully' })
  }),
]
