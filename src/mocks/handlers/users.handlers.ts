import { http, HttpResponse, delay } from 'msw'
import { MOCK_USERS_DB, generateMockUser, type MockUserWithPassword } from '../data/users.mock'
import type { User } from '@/types'

const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Remove password from user object before returning
const sanitizeUser = (user: MockUserWithPassword): User => {
  const { password, ...userWithoutPassword } = user
  return userWithoutPassword
}

export const usersHandlers = [
  // GET /users - List users with pagination and filters
  http.get(`${getApiUrl()}/users`, async ({ request }) => {
    await delay(600)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const page_size = parseInt(url.searchParams.get('page_size') || '10')
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') as 'active' | 'inactive' | null
    const role_id = url.searchParams.get('role_id')

    let filtered = [...MOCK_USERS_DB]

    // Filter by search (name, email, phone)
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.full_name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.phone.includes(searchLower)
      )
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter((u) => u.status === status)
    }

    // Filter by role
    if (role_id) {
      const roleIdNum = parseInt(role_id)
      filtered = filtered.filter((u) => u.roles.some((r) => r.id === roleIdNum))
    }

    const total = filtered.length
    const total_pages = Math.ceil(total / page_size)
    const start = (page - 1) * page_size
    const end = start + page_size

    return HttpResponse.json({
      data: filtered.slice(start, end).map(sanitizeUser),
      meta: { page, page_size, total, total_pages },
    })
  }),

  // GET /users/:id - Get single user
  http.get(`${getApiUrl()}/users/:id`, async ({ params }) => {
    await delay(400)
    const { id } = params
    const user = MOCK_USERS_DB.find((u) => u.id === parseInt(id as string))

    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return HttpResponse.json(sanitizeUser(user))
  }),

  // POST /users - Create new user
  http.post(`${getApiUrl()}/users`, async ({ request }) => {
    await delay(800)
    const body = (await request.json()) as Partial<MockUserWithPassword>

    // Validate required fields
    if (!body.email || !body.phone || !body.full_name || !body.password) {
      return HttpResponse.json(
        { message: 'Missing required fields: email, phone, full_name, password' },
        { status: 400 }
      )
    }

    // Check if email already exists
    if (MOCK_USERS_DB.some((u) => u.email === body.email)) {
      return HttpResponse.json({ message: 'Email already exists' }, { status: 409 })
    }

    // Check if phone already exists
    if (MOCK_USERS_DB.some((u) => u.phone === body.phone)) {
      return HttpResponse.json({ message: 'Phone number already exists' }, { status: 409 })
    }

    const newUser = generateMockUser(body)
    MOCK_USERS_DB.push(newUser)

    return HttpResponse.json(sanitizeUser(newUser), { status: 201 })
  }),

  // PATCH /users/:id - Update user
  http.patch(`${getApiUrl()}/users/:id`, async ({ params, request }) => {
    await delay(700)
    const { id } = params
    const body = (await request.json()) as Partial<MockUserWithPassword>

    const index = MOCK_USERS_DB.findIndex((u) => u.id === parseInt(id as string))

    if (index === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Check if email already exists (excluding current user)
    if (body.email && MOCK_USERS_DB.some((u) => u.email === body.email && u.id !== parseInt(id as string))) {
      return HttpResponse.json({ message: 'Email already exists' }, { status: 409 })
    }

    // Check if phone already exists (excluding current user)
    if (body.phone && MOCK_USERS_DB.some((u) => u.phone === body.phone && u.id !== parseInt(id as string))) {
      return HttpResponse.json({ message: 'Phone number already exists' }, { status: 409 })
    }

    // Don't allow password in update via this endpoint (use separate password reset endpoint)
    const { password, ...updateData } = body

    MOCK_USERS_DB[index] = { ...MOCK_USERS_DB[index], ...updateData }

    return HttpResponse.json(sanitizeUser(MOCK_USERS_DB[index]))
  }),

  // DELETE /users/:id - Delete user
  http.delete(`${getApiUrl()}/users/:id`, async ({ params }) => {
    await delay(500)
    const { id } = params
    const index = MOCK_USERS_DB.findIndex((u) => u.id === parseInt(id as string))

    if (index === -1) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Don't allow deleting super admin
    if (MOCK_USERS_DB[index].is_super_admin) {
      return HttpResponse.json({ message: 'Cannot delete super admin user' }, { status: 403 })
    }

    MOCK_USERS_DB.splice(index, 1)

    return HttpResponse.json({ message: 'User deleted successfully' })
  }),
]
