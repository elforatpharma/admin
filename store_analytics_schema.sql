-- ==========================================
-- Store analytics events + order session linkage
-- Elforat Pharma
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'ahmedsalamaahmed21@gmail.com';
$$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS traffic_source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS traffic_campaign TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_traffic_source ON orders(traffic_source);
CREATE INDEX IF NOT EXISTS idx_orders_traffic_campaign ON orders(traffic_campaign);

CREATE TABLE IF NOT EXISTS store_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  coupon_code TEXT,
  cart_total NUMERIC,
  page_path TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  device_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_events_created_at ON store_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_events_event_created ON store_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_events_session_id ON store_events(session_id);
CREATE INDEX IF NOT EXISTS idx_store_events_product_id ON store_events(product_id);
CREATE INDEX IF NOT EXISTS idx_store_events_campaign ON store_events(campaign);

ALTER TABLE store_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_store_events" ON store_events;
CREATE POLICY "public_insert_store_events" ON store_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_store_events" ON store_events;
CREATE POLICY "auth_read_store_events" ON store_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE VIEW public.campaign_performance
WITH (security_invoker = true)
AS
WITH session_attribution AS (
  SELECT DISTINCT ON (se.session_id)
    se.session_id,
    COALESCE(NULLIF(se.campaign, ''), 'direct') AS campaign,
    COALESCE(NULLIF(se.source, ''), 'direct') AS source
  FROM public.store_events AS se
  WHERE se.session_id IS NOT NULL
    AND btrim(se.session_id) <> ''
    AND lower(COALESCE(se.event_name, '')) NOT LIKE '%test%'
    AND lower(se.session_id) NOT LIKE '%test%'
    AND lower(se.session_id) <> '__test__'
  ORDER BY se.session_id, se.created_at ASC, se.id ASC
),
orders_by_session AS (
  SELECT
    o.session_id,
    COUNT(DISTINCT o.id) AS orders,
    COALESCE(SUM(o.total) FILTER (
      WHERE lower(COALESCE(o.status_code, '')) = 'delivered'
         OR lower(COALESCE(o.status, '')) IN ('delivered', 'تم التوصيل')
    ), 0) AS revenue
  FROM public.orders AS o
  WHERE o.session_id IS NOT NULL
  GROUP BY o.session_id
),
session_rows AS (
  SELECT
    sa.campaign,
    sa.source,
    sa.session_id,
    COALESCE(obs.orders, 0) AS orders,
    COALESCE(obs.revenue, 0) AS revenue
  FROM session_attribution AS sa
  LEFT JOIN orders_by_session AS obs ON obs.session_id = sa.session_id
)
SELECT
  campaign,
  source,
  COUNT(DISTINCT session_id) AS sessions,
  SUM(orders)::bigint AS orders,
  COALESCE(SUM(revenue), 0) AS revenue,
  CASE WHEN COUNT(DISTINCT session_id) = 0 THEN 0
       ELSE ROUND((SUM(orders)::numeric / COUNT(DISTINCT session_id)::numeric) * 100, 2)
  END AS conversion_rate
FROM session_rows
GROUP BY campaign, source
ORDER BY revenue DESC, orders DESC;
