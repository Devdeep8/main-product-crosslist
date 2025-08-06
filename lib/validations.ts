import { z } from 'zod'

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password must be at most 32 characters'),
});


export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const workspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  description: z.string().optional(),
})

export const projectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  estimatedHours: z.number().min(0).optional(),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  assigneeId: z.string().optional(),
})

export const columnSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  color: z.string().default('#6B7280'),
})

export const timeEntrySchema = z.object({
  hours: z.number().min(0.1, 'Hours must be at least 0.1'),
  description: z.string().optional(),
  date: z.date(),
})

export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type WorkspaceInput = z.infer<typeof workspaceSchema>
export type ProjectInput = z.infer<typeof projectSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type ColumnInput = z.infer<typeof columnSchema>
export type TimeEntryInput = z.infer<typeof timeEntrySchema>
export type CommentInput = z.infer<typeof commentSchema> 