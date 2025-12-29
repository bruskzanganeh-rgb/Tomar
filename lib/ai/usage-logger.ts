import { createClient } from '@supabase/supabase-js'

// Supabase client for server-side logging
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Anthropic pricing per 1M tokens (December 2024)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
}

export type UsageType =
  | 'receipt_scan_text'
  | 'receipt_scan_vision'
  | 'document_classify_text'
  | 'document_classify_vision'
  | 'invoice_parse'

export type LogAiUsageParams = {
  usageType: UsageType
  model: string
  inputTokens: number
  outputTokens: number
  metadata?: Record<string, unknown>
}

/**
 * Calculate estimated cost in USD based on model and token usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model]
  if (!pricing) {
    // Fallback to Claude 3.5 Haiku pricing for unknown models
    console.warn(`Unknown model pricing: ${model}, using Claude 3.5 Haiku pricing`)
    return (inputTokens * 0.80 + outputTokens * 4.00) / 1_000_000
  }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

/**
 * Log AI usage to database for cost tracking
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  const { usageType, model, inputTokens, outputTokens, metadata } = params

  const estimatedCostUsd = calculateCost(model, inputTokens, outputTokens)

  try {
    const { error } = await supabase.from('ai_usage_logs').insert({
      usage_type: usageType,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCostUsd,
      metadata: metadata || null,
    })

    if (error) {
      // Log error but don't throw - we don't want to break the main functionality
      console.error('Failed to log AI usage:', error)
    }
  } catch (err) {
    // Silently fail - logging should never break the main flow
    console.error('AI usage logging error:', err)
  }
}

/**
 * Get human-readable label for usage type
 */
export function getUsageTypeLabel(usageType: UsageType): string {
  const labels: Record<UsageType, string> = {
    receipt_scan_text: 'Kvittoskanning (text)',
    receipt_scan_vision: 'Kvittoskanning (bild)',
    document_classify_text: 'Dokumentklassning (text)',
    document_classify_vision: 'Dokumentklassning (bild)',
    invoice_parse: 'Fakturaläsning',
  }
  return labels[usageType] || usageType
}
