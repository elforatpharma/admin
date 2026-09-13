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

CREATE OR REPLACE VIEW campaign_performance AS
SELECT
  coalesce(se.campaign, o.traffic_campaign, 'direct') AS campaign,
  coalesce(se.source, o.traffic_source, 'direct') AS source,
  count(DISTINCT se.session_id) AS sessions,
  count(DISTINCT o.id) AS orders,
  coalesce(sum(o.total), 0) AS revenue,
  CASE
    WHEN count(DISTINCT se.session_id) = 0 THEN 0
    ELSE round((count(DISTINCT o.id)::numeric / count(DISTINCT se.session_id)::numeric) * 100, 2)
  END AS conversion_rate
FROM store_events se
LEFT JOIN orders o ON o.session_id = se.session_id
GROUP BY 1, 2
ORDER BY revenue DESC, orders DESC;
