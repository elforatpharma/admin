-- Secure admin-only read endpoint for recent inventory movements.
CREATE OR REPLACE FUNCTION public.admin_recent_inventory_movements(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  product_name text,
  quantity_change integer,
  reason text,
  created_at timestamptz,
  order_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT i.id, i.product_id, p.name, i.quantity_change, i.reason, i.created_at, i.order_id
  FROM public.inventory AS i
  LEFT JOIN public.products AS p ON p.id = i.product_id
  ORDER BY i.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 20), 50));
END
$function$;

REVOKE ALL ON FUNCTION public.admin_recent_inventory_movements(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_inventory_movements(integer) TO authenticated;
