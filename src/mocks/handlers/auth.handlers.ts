import { http, HttpResponse, delay } from 'msw'
import { MOCK_USERS_DB } from '../data/users.mock'

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  return url.replace(/\/api$/, '') // Remove trailing /api if exists
}

// Generate mock auth token
const generateMockToken = (userId: number): string => {
  return `mock_token_${userId}_${Date.now()}`
}

// Extract user from token
const getUserFromToken = (token: string) => {
  const match = token.match(/mock_token_(\d+)_/)
  if (!match) return null

  const userId = parseInt(match[1])
  const user = MOCK_USERS_DB.find((u) => u.id === userId)
  if (!user) return null

  // Return user without password
  const { password, ...userWithoutPassword } = user
  return userWithoutPassword
}

export const authHandlers = [
  // POST /auth/login
  http.post(`${getApiUrl()}/auth/login`, async ({ request }) => {
    await delay(800) // Simulate network latency

    const body = await request.json() as { phone_or_email: string; password: string }
    const { phone_or_email, password } = body

    // Find matching user by email or phone
    const user = MOCK_USERS_DB.find(
      (u) => (u.email === phone_or_email || u.phone === phone_or_email) && u.password === password
    )

    if (!user) {
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = generateMockToken(user.id)

    return HttpResponse.json({
      access_token: token,
      token_type: 'Bearer'
    }, { status: 200 })
  }),

  // GET /auth/me
  http.get(`${getApiUrl()}/auth/me`, async ({ request }) => {
    await delay(300)

    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = getUserFromToken(token)

    if (!user) {
      return HttpResponse.json({ detail: 'Invalid token' }, { status: 401 })
    }

    // Return in the format specified by API docs
    const permissions = user.roles.flatMap(role => role.permissions?.map(p => p.code) || [])

    return HttpResponse.json({
      user,
      permissions
    })
  }),

  // POST /auth/logout
  http.post(`${getApiUrl()}/auth/logout`, async () => {
    await delay(300)
    return HttpResponse.json({ message: 'Logged out successfully' }, { status: 200 })
  }),
]
