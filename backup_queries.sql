-- ==========================================
-- Manual backup/export queries
-- Run each SELECT in Supabase SQL Editor and export result as CSV.
-- ==========================================

SELECT * FROM orders ORDER BY created_at DESC;
SELECT * FROM products ORDER BY created_at DESC NULLS LAST;
SELECT * FROM coupons ORDER BY created_at DESC;
SELECT * FROM messages ORDER BY created_at DESC;
SELECT * FROM settings ORDER BY updated_at DESC NULLS LAST;
SELECT * FROM visitors;
SELECT * FROM visitor_events ORDER BY created_at DESC;
SELECT * FROM store_events ORDER BY created_at DESC;
SELECT * FROM campaign_performance;
