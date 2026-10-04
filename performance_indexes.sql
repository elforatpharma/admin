-- ==========================================
-- Performance indexes for dashboard/store reads
-- Elforat Pharma
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_active'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'priority'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_products_active_priority ON products(is_active, priority);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'is_active'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'coupons' AND column_name = 'expiry_date'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_coupons_active_expiry ON coupons(is_active, expiry_date);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_messages_status_created_at ON messages(status, created_at DESC);
  END IF;
END $$;
