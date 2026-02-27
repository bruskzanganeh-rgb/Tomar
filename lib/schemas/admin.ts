import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  company_name: z.string().max(200).optional(),
  mode: z.enum(['invite', 'create']),
}).refine(
  (data) => data.mode !== 'create' || (data.password && data.password.length >= 6),
  { message: 'Password required for create mode', path: ['password'] }
)

export const changeTierSchema = z.object({
  plan: z.enum(['free', 'pro', 'team']),
})

export const configSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(10000),
})

export const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const orgMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['member', 'admin', 'owner']).optional(),
})
