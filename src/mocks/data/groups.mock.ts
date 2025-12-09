import { faker } from '@faker-js/faker'
import type { Group } from '@/types'

const COURSE_NAMES = [
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'Mobile Development',
  'DevOps Engineering',
  'Data Science',
  'UI/UX Design',
]

const DAYS = ['Mon-Wed-Fri', 'Tue-Thu-Sat', 'Mon-Wed', 'Tue-Thu', 'Weekend']

export const generateMockGroup = (overrides?: Partial<Group>): Group => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  name: `${faker.helpers.arrayElement(COURSE_NAMES)} - ${faker.helpers.arrayElement(['Beginner', 'Intermediate', 'Advanced'])}`,
  description: faker.lorem.sentence(),
  schedule_days: faker.helpers.arrayElement(DAYS),
  schedule_time: `${faker.number.int({ min: 9, max: 18 })}:00-${faker.number.int({ min: 10, max: 20 })}:00`,
  coach_id: faker.number.int({ min: 1, max: 50 }),
  ...overrides,
})

export const generateMockGroups = (count: number = 30): Group[] => {
  return Array.from({ length: count }, () => generateMockGroup())
}

export const MOCK_GROUPS_DB = generateMockGroups(30)
