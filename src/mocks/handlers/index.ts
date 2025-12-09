import { authHandlers } from './auth.handlers'
import { studentsHandlers } from './students.handlers'
import { groupsHandlers } from './groups.handlers'
import { transactionsHandlers } from './transactions.handlers'
import { usersHandlers } from './users.handlers'
import { rolesHandlers } from './roles.handlers'
import { 
  reportsHandlers, 
  contractsHandlers, 
  coachHandlers, 
  gateHandlers, 
  settingsHandlers 
} from './additional.handlers'

export const handlers = [
  ...authHandlers,
  ...studentsHandlers,
  ...groupsHandlers,
  ...transactionsHandlers,
  ...usersHandlers,
  ...rolesHandlers,
  ...reportsHandlers,
  ...contractsHandlers,
  ...coachHandlers,
  ...gateHandlers,
  ...settingsHandlers,
]
