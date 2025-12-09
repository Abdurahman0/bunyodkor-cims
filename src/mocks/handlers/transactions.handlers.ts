import { http, HttpResponse, delay } from 'msw'
import { MOCK_TRANSACTIONS_DB, generateMockTransaction } from '../data/transactions.mock'
import type { Transaction } from '@/types'

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  return url.replace(/\/api$/, '')
}

export const transactionsHandlers = [
  // GET /transactions - List with pagination
  http.get(`${getApiUrl()}/transactions`, async ({ request }) => {
    await delay(600)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('page_size') || '20')
    const status = url.searchParams.get('status')
    const studentId = url.searchParams.get('student_id')

    let filtered = [...MOCK_TRANSACTIONS_DB]

    if (status) {
      filtered = filtered.filter((t) => t.status === status)
    }

    if (studentId) {
      filtered = filtered.filter((t) => t.student_id === parseInt(studentId))
    }

    const total = filtered.length
    const start = (page - 1) * pageSize
    const data = filtered.slice(start, start + pageSize)

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

  // GET /transactions/:id - Get single transaction
  http.get(`${getApiUrl()}/transactions/:id`, async ({ params }) => {
    await delay(400)

    const transaction = MOCK_TRANSACTIONS_DB.find((t) => t.id === parseInt(params.id as string))

    if (!transaction) {
      return HttpResponse.json({ detail: 'Transaction not found' }, { status: 404 })
    }

    return HttpResponse.json(transaction)
  }),

  // POST /transactions/manual - Create manual transaction
  http.post(`${getApiUrl()}/transactions/manual`, async ({ request }) => {
    await delay(800)

    const body = await request.json() as Partial<Transaction>
    const newTransaction = generateMockTransaction(body)

    MOCK_TRANSACTIONS_DB.unshift(newTransaction)

    return HttpResponse.json(newTransaction, { status: 201 })
  }),
]
