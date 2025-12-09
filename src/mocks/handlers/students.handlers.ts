import { http, HttpResponse, delay } from 'msw'
import { MOCK_STUDENTS_DB, generateMockStudent } from '../data/students.mock'
import type { Student } from '@/types'

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  return url.replace(/\/api$/, '')
}

export const studentsHandlers = [
  // GET /students - List with pagination and filters
  http.get(`${getApiUrl()}/students`, async ({ request }) => {
    await delay(600)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('page_size') || '20')
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status')
    const groupId = url.searchParams.get('group_id')

    let filtered = [...MOCK_STUDENTS_DB]

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.first_name.toLowerCase().includes(searchLower) ||
          s.last_name.toLowerCase().includes(searchLower) ||
          s.phone.includes(search)
      )
    }

    if (status) {
      filtered = filtered.filter((s) => s.status === status)
    }

    if (groupId) {
      filtered = filtered.filter((s) => s.group_id === parseInt(groupId))
    }

    // Pagination
    const total = filtered.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const data = filtered.slice(start, end)

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

  // GET /students/:id - Get single student
  http.get(`${getApiUrl()}/students/:id`, async ({ params }) => {
    await delay(400)

    const { id } = params
    const student = MOCK_STUDENTS_DB.find((s) => s.id === parseInt(id as string))

    if (!student) {
      return HttpResponse.json({ detail: 'Student not found' }, { status: 404 })
    }

    return HttpResponse.json(student)
  }),

  // POST /students - Create student
  http.post(`${getApiUrl()}/students`, async ({ request }) => {
    await delay(800)

    const body = await request.json() as Partial<Student>
    const newStudent = generateMockStudent(body)

    MOCK_STUDENTS_DB.unshift(newStudent)

    return HttpResponse.json(newStudent, { status: 201 })
  }),

  // PATCH /students/:id - Update student
  http.patch(`${getApiUrl()}/students/:id`, async ({ params, request }) => {
    await delay(700)

    const { id } = params
    const body = await request.json() as Partial<Student>
    const index = MOCK_STUDENTS_DB.findIndex((s) => s.id === parseInt(id as string))

    if (index === -1) {
      return HttpResponse.json({ detail: 'Student not found' }, { status: 404 })
    }

    MOCK_STUDENTS_DB[index] = {
      ...MOCK_STUDENTS_DB[index],
      ...body,
    }

    return HttpResponse.json(MOCK_STUDENTS_DB[index])
  }),

  // DELETE /students/:id - Delete student
  http.delete(`${getApiUrl()}/students/:id`, async ({ params }) => {
    await delay(500)

    const { id } = params
    const index = MOCK_STUDENTS_DB.findIndex((s) => s.id === parseInt(id as string))

    if (index === -1) {
      return HttpResponse.json({ detail: 'Student not found' }, { status: 404 })
    }

    MOCK_STUDENTS_DB.splice(index, 1)

    return HttpResponse.json({ message: 'Student deleted successfully' })
  }),
]
