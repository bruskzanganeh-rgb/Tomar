import { z } from 'zod'

/**
 * Server-side environment variable validation.
 * Imported by instrumentation.ts to validate at startup.
 *
 * Required vars crash the build if missing.
 * Optional vars (AI, Stripe price IDs) are validated only if present.
 */
const serverEnvSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Stripe (required for billing)
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  // AI features (optional — app works without them)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let _validated = false

export function validateEnv(): ServerEnv {
  if (_validated) return process.env as unknown as ServerEnv

  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`).join('\n')
    console.error(`\n❌ Invalid environment variables:\n${formatted}\n`)
    throw new Error('Missing or invalid environment variables. See above for details.')
  }

  _validated = true
  return result.data
}
