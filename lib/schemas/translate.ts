import { z } from 'zod'

export const translateSchema = z.object({
  text: z.string().min(1).max(200),
  targetLang: z.string().min(2).max(5).default('en'),
})

export type TranslateData = z.infer<typeof translateSchema>
