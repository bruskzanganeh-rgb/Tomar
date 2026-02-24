import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Generate next contract number in format SS-YYYY-NNN
 * e.g. SS-2026-001, SS-2026-002
 */
export async function generateContractNumber(supabase: SupabaseClient): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `SS-${year}-`

  const { data } = await supabase
    .from('contracts')
    .select('contract_number')
    .like('contract_number', `${prefix}%`)
    .order('contract_number', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].contract_number.replace(prefix, ''), 10)
    if (!isNaN(lastNum)) nextNum = lastNum + 1
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`
}
