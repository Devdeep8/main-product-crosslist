export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' },
] as const

export const PROJECT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-blue-100 text-blue-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'ARCHIVED', label: 'Archived', color: 'bg-gray-100 text-gray-800' },
] as const

export const TASK_STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'REVIEW', label: 'Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DONE', label: 'Done', color: 'bg-green-100 text-green-800' },
] as const

export const DEFAULT_COLUMNS = [
  { name: 'To Do', color: '#6B7280' },
  { name: 'In Progress', color: '#3B82F6' },
  { name: 'Review', color: '#F59E0B' },
  { name: 'Done', color: '#10B981' },
] as const

export const CURRENCY_SYMBOL = '₹'

export const TIME_TRACKING_INTERVALS = [
  { value: 0.25, label: '15 min' },
  { value: 0.5, label: '30 min' },
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 4, label: '4 hours' },
  { value: 8, label: '8 hours' },
] as const

export const ACTIVITY_TYPES = {
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_MOVED: 'task_moved',
  TASK_ASSIGNED: 'task_assigned',
  COMMENT_ADDED: 'comment_added',
  TIME_LOGGED: 'time_logged',
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  WORKSPACE_CREATED: 'workspace_created',
  MEMBER_ADDED: 'member_added',
} as const 