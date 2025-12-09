import { faker } from '@faker-js/faker'
import type { Transaction } from '@/types'

const SOURCES: Array<'payme' | 'click' | 'bank' | 'cash' | 'manual'> = [
  'payme',
  'click',
  'bank',
  'cash',
  'manual',
]

const STATUSES: Array<'pending' | 'success' | 'failed' | 'cancelled' | 'unassigned'> = [
  'success',
  'success',
  'success',
  'pending',
  'failed',
  'unassigned',
]

export const generateMockTransaction = (overrides?: Partial<Transaction>): Transaction => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  external_id: faker.helpers.arrayElement([
    faker.string.uuid(),
    undefined,
  ]),
  amount: faker.number.int({ min: 100000, max: 5000000 }),
  source: faker.helpers.arrayElement(SOURCES),
  status: faker.helpers.arrayElement(STATUSES),
  paid_at: faker.date.recent({ days: 30 }).toISOString(),
  comment: faker.helpers.arrayElement([
    faker.lorem.sentence(),
    undefined,
  ]),
  student_id: faker.helpers.arrayElement([
    faker.number.int({ min: 1, max: 100 }),
    undefined,
  ]),
  contract_id: faker.helpers.arrayElement([
    faker.number.int({ min: 1, max: 200 }),
    undefined,
  ]),
  created_by_user_id: faker.helpers.arrayElement([
    faker.number.int({ min: 1, max: 10 }),
    undefined,
  ]),
  created_at: faker.date.recent({ days: 30 }).toISOString(),
  ...overrides,
})

export const generateMockTransactions = (count: number = 500): Transaction[] => {
  return Array.from({ length: count }, () => generateMockTransaction())
}

export const MOCK_TRANSACTIONS_DB = generateMockTransactions(500)
