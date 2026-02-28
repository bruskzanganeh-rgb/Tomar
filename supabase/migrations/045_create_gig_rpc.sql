-- RPC function for external agents to create gigs with explicit company_id
-- This bypasses any PostgREST column-handling quirks

CREATE OR REPLACE FUNCTION create_gig(
  p_user_id UUID,
  p_company_id UUID,
  p_date DATE,
  p_gig_type_id UUID,
  p_status gig_status DEFAULT 'accepted',
  p_client_id UUID DEFAULT NULL,
  p_venue TEXT DEFAULT NULL,
  p_fee NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'SEK',
  p_project_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_position_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_travel_expense NUMERIC DEFAULT NULL,
  p_response_deadline DATE DEFAULT NULL,
  p_invoice_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO gigs (
    user_id, company_id, date, gig_type_id, status,
    client_id, venue, fee, currency, project_name,
    notes, position_id, start_date, end_date,
    travel_expense, response_deadline, invoice_notes
  ) VALUES (
    p_user_id, p_company_id, p_date, p_gig_type_id, p_status,
    p_client_id, p_venue, p_fee, p_currency, p_project_name,
    p_notes, p_position_id, p_start_date, p_end_date,
    p_travel_expense, p_response_deadline, p_invoice_notes
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Also create one for clients
CREATE OR REPLACE FUNCTION create_client(
  p_user_id UUID,
  p_company_id UUID,
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_org_number TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_reference_person TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_vat_number TEXT DEFAULT NULL,
  p_invoice_language TEXT DEFAULT 'sv',
  p_payment_terms INTEGER DEFAULT 30,
  p_client_code TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO clients (
    user_id, company_id, name, email, org_number, address,
    reference_person, country_code, vat_number, invoice_language,
    payment_terms, client_code, notes
  )
  VALUES (
    p_user_id, p_company_id, p_name, p_email, p_org_number, p_address,
    p_reference_person, p_country_code, p_vat_number, p_invoice_language,
    p_payment_terms, p_client_code, p_notes
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Grant execute to service_role and authenticated
GRANT EXECUTE ON FUNCTION create_gig TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION create_client TO service_role, authenticated;
