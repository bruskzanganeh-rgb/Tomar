export type ContractStatus = 'draft' | 'sent_to_reviewer' | 'reviewed' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'

export type Contract = {
  id: string
  company_id: string | null
  contract_number: string
  tier: string
  annual_price: number
  currency: string
  billing_interval: string
  vat_rate_pct: number
  contract_start_date: string
  contract_duration_months: number
  custom_terms: Record<string, unknown>
  signer_name: string
  signer_email: string
  signer_title: string | null
  reviewer_name: string | null
  reviewer_email: string | null
  reviewer_title: string | null
  reviewer_token: string | null
  reviewer_token_expires_at: string | null
  reviewed_at: string | null
  signing_token: string | null
  token_expires_at: string | null
  status: ContractStatus
  document_hash_sha256: string | null
  signed_document_hash_sha256: string | null
  unsigned_pdf_path: string | null
  signed_pdf_path: string | null
  signature_image_path: string | null
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  created_at: string
  updated_at: string
}

export type ContractAuditEvent = 'created' | 'sent_to_reviewer' | 'reviewed' | 'approved' | 'sent' | 'resent' | 'viewed' | 'signed' | 'expired' | 'cancelled'

export type ContractAudit = {
  id: string
  contract_id: string
  event_type: ContractAuditEvent
  actor_email: string | null
  ip_address: string | null
  user_agent: string | null
  document_hash_sha256: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type ContractWithAudit = Contract & {
  audit_trail: ContractAudit[]
  company?: { company_name: string | null; org_number: string | null; address: string | null } | null
}

export type SignContractPayload = {
  signer_name: string
  signer_title?: string
  signature_image: string // base64 PNG
}
