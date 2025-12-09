import { faker } from '@faker-js/faker'
import type { Student } from '@/types'

const STATUSES: Array<'active' | 'graduated' | 'dropped' | 'suspended'> = [
  'active',
  'active',
  'active',
  'active',
  'graduated',
  'dropped',
  'suspended',
]

export const generateMockStudent = (overrides?: Partial<Student>): Student => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  date_of_birth: faker.date.birthdate({ min: 10, max: 25, mode: 'age' }).toISOString().split('T')[0],
  phone: faker.helpers.fromRegExp(/\+998[0-9]{9}/),
  address: faker.location.streetAddress({ useFullAddress: true }),
  photo_url: faker.helpers.arrayElement([
    faker.image.avatar(),
    undefined,
  ]),
  face_id: faker.helpers.arrayElement([
    faker.string.uuid(),
    undefined,
  ]),
  status: faker.helpers.arrayElement(STATUSES),
  group_id: faker.number.int({ min: 1, max: 30 }),
  created_at: faker.date.past({ years: 2 }).toISOString(),
  ...overrides,
})

export const generateMockStudents = (count: number = 100): Student[] => {
  return Array.from({ length: count }, () => generateMockStudent())
}

// Create a mutable database that persists during the session
export const MOCK_STUDENTS_DB = generateMockStudents(100)
