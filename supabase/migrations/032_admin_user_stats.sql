-- Consolidated admin user stats function
-- Replaces 5 separate count_by_user RPC calls with a single query
CREATE OR REPLACE FUNCTION admin_user_stats(p_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  invoice_count bigint,
  client_count bigint,
  position_count bigint,
  gig_type_count bigint,
  expense_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    u.id AS user_id,
    COALESCE(i.cnt, 0) AS invoice_count,
    COALESCE(c.cnt, 0) AS client_count,
    COALESCE(p.cnt, 0) AS position_count,
    COALESCE(g.cnt, 0) AS gig_type_count,
    COALESCE(e.cnt, 0) AS expense_count
  FROM unnest(p_user_ids) AS u(id)
  LEFT JOIN (SELECT invoices.user_id, count(*) AS cnt FROM invoices WHERE invoices.user_id = ANY(p_user_ids) GROUP BY invoices.user_id) i ON i.user_id = u.id
  LEFT JOIN (SELECT clients.user_id, count(*) AS cnt FROM clients WHERE clients.user_id = ANY(p_user_ids) GROUP BY clients.user_id) c ON c.user_id = u.id
  LEFT JOIN (SELECT positions.user_id, count(*) AS cnt FROM positions WHERE positions.user_id = ANY(p_user_ids) GROUP BY positions.user_id) p ON p.user_id = u.id
  LEFT JOIN (SELECT gig_types.user_id, count(*) AS cnt FROM gig_types WHERE gig_types.user_id = ANY(p_user_ids) GROUP BY gig_types.user_id) g ON g.user_id = u.id
  LEFT JOIN (SELECT expenses.user_id, count(*) AS cnt FROM expenses WHERE expenses.user_id = ANY(p_user_ids) GROUP BY expenses.user_id) e ON e.user_id = u.id;
$$;
