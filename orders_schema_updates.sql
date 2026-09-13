-- ==========================================
-- SQL Schema Updates: Orders payment/coupon fields
-- Elforat Pharma
-- ==========================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS merchant_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paymob_order_id TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_order_id ON orders(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code);
