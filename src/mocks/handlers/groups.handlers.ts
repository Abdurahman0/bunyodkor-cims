import { http, HttpResponse, delay } from 'msw'
import { MOCK_GROUPS_DB, generateMockGroup } from '../data/groups.mock'
import type { Group } from '@/types'

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  return url.replace(/\/api$/, '')
}

export const groupsHandlers = [
  // GET /groups - List with pagination
  http.get(`${getApiUrl()}/groups`, async ({ request }) => {
    await delay(500)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('page_size') || '20')

    const total = MOCK_GROUPS_DB.length
    const start = (page - 1) * pageSize
    const data = MOCK_GROUPS_DB.slice(start, start + pageSize)

    return HttpResponse.json({
      data,
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    })
  }),

  // GET /groups/:id - Get single group
  http.get(`${getApiUrl()}/groups/:id`, async ({ params }) => {
    await delay(400)

    const group = MOCK_GROUPS_DB.find((g) => g.id === parseInt(params.id as string))

    if (!group) {
      return HttpResponse.json({ detail: 'Group not found' }, { status: 404 })
    }

    return HttpResponse.json(group)
  }),

  // POST /groups - Create group
  http.post(`${getApiUrl()}/groups`, async ({ request }) => {
    await delay(800)

    const body = await request.json() as Partial<Group>
    const newGroup = generateMockGroup(body)

    MOCK_GROUPS_DB.unshift(newGroup)

    return HttpResponse.json(newGroup, { status: 201 })
  }),

  // PATCH /groups/:id - Update group
  http.patch(`${getApiUrl()}/groups/:id`, async ({ params, request }) => {
    await delay(700)

    const { id } = params
    const body = await request.json() as Partial<Group>
    const index = MOCK_GROUPS_DB.findIndex((g) => g.id === parseInt(id as string))

    if (index === -1) {
      return HttpResponse.json({ detail: 'Group not found' }, { status: 404 })
    }

    MOCK_GROUPS_DB[index] = {
      ...MOCK_GROUPS_DB[index],
      ...body,
    }

    return HttpResponse.json(MOCK_GROUPS_DB[index])
  }),
]
