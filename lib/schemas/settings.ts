import { z } from 'zod'

export const testEmailSchema = z.object({
  provider: z.enum(['platform', 'smtp']).optional(),
  to_email: z.string().email(),
  smtp_host: z.string().optional(),
  smtp_port: z.number().optional(),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_from_email: z.string().optional(),
  smtp_from_name: z.string().optional(),
})

export type TestEmailData = z.infer<typeof testEmailSchema>
