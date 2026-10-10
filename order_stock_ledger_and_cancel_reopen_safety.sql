-- Order stock ledger and cancellation/reopening safeguards.
-- Applied to Supabase on 2026-10-10 and verified with temporary transaction-flow tests.
BEGIN;

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS order_id uuid;

-- No FK here: orders_reserve_stock is a BEFORE INSERT trigger, so the order row
-- is not yet visible when the reservation ledger entry is inserted.
ALTER TABLE public.inventory
  DROP CONSTRAINT IF EXISTS inventory_order_id_fkey;

CREATE INDEX IF NOT EXISTS inventory_order_id_idx
  ON public.inventory(order_id);
CREATE INDEX IF NOT EXISTS inventory_product_created_idx
  ON public.inventory(product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.orders_reserve_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  r record;
  items jsonb;
  order_label text;
BEGIN
  items := to_jsonb(NEW.items);

  -- Do not reserve stock for an order created already cancelled.
  IF public.derive_order_status_code(NEW.status) = 'cancelled' THEN
    NEW.stock_restored := true;
    RETURN NEW;
  END IF;

  IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN
    RETURN NEW;
  END IF;

  order_label := coalesce(nullif(NEW.order_number, ''), NEW.id::text);

  FOR r IN
    SELECT (i->>'id') AS pid,
           sum(greatest(coalesce(nullif(i->>'qty','')::int,1),1)) AS qty
    FROM jsonb_array_elements(items) i
    WHERE NOT (coalesce((i->>'isGift')::boolean,false) AND (i->>'id') LIKE E'gift\\_%')
      AND i->>'id' IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  LOOP
    UPDATE public.products
       SET stock = stock - r.qty
     WHERE id::text = r.pid
       AND (stock IS NULL OR stock >= r.qty);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ORDER_OUT_OF_STOCK:%', r.pid USING ERRCODE='P0001';
    END IF;

    INSERT INTO public.inventory(product_id, order_id, quantity_change, reason)
    VALUES (r.pid::uuid, NEW.id, -r.qty, 'حجز مخزون للطلب #' || order_label);
  END LOOP;

  NEW.stock_restored := false;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.orders_restore_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  r record;
  items jsonb;
  was_cancelled boolean;
  is_cancelled boolean;
  order_label text;
BEGIN
  was_cancelled :=
    coalesce(OLD.status_code, '') = 'cancelled'
    OR public.derive_order_status_code(OLD.status) = 'cancelled';

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Label changes are authoritative; status-code sync triggers run later.
    is_cancelled := public.derive_order_status_code(NEW.status) = 'cancelled';
  ELSIF NEW.status_code IS DISTINCT FROM OLD.status_code THEN
    -- If only the canonical code changes, trust it before the label sync runs.
    is_cancelled := coalesce(NEW.status_code, '') = 'cancelled';
  ELSE
    is_cancelled :=
      coalesce(NEW.status_code, '') = 'cancelled'
      OR public.derive_order_status_code(NEW.status) = 'cancelled';
  END IF;

  IF was_cancelled = is_cancelled THEN
    RETURN NEW;
  END IF;

  items := to_jsonb(NEW.items);
  IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN
    RETURN NEW;
  END IF;

  order_label := coalesce(nullif(NEW.order_number, ''), NEW.id::text);

  IF is_cancelled THEN
    IF coalesce(OLD.stock_restored, false) THEN
      RETURN NEW;
    END IF;

    FOR r IN
      SELECT (i->>'id') AS pid,
             sum(greatest(coalesce(nullif(i->>'qty','')::int,1),1)) AS qty
      FROM jsonb_array_elements(items) i
      WHERE NOT (coalesce((i->>'isGift')::boolean,false) AND (i->>'id') LIKE E'gift\\_%')
        AND i->>'id' IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    LOOP
      UPDATE public.products SET stock = stock + r.qty WHERE id::text = r.pid;
      IF FOUND THEN
        INSERT INTO public.inventory(product_id, order_id, quantity_change, reason)
        VALUES (r.pid::uuid, NEW.id, r.qty, 'استرجاع مخزون بسبب إلغاء الطلب #' || order_label);
      END IF;
    END LOOP;

    NEW.stock_restored := true;
    RETURN NEW;
  END IF;

  -- Reopening a cancelled order reserves stock again. If unavailable, reject
  -- the status change to avoid overselling.
  IF coalesce(OLD.stock_restored, false) THEN
    FOR r IN
      SELECT (i->>'id') AS pid,
             sum(greatest(coalesce(nullif(i->>'qty','')::int,1),1)) AS qty
      FROM jsonb_array_elements(items) i
      WHERE NOT (coalesce((i->>'isGift')::boolean,false) AND (i->>'id') LIKE E'gift\\_%')
        AND i->>'id' IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    LOOP
      UPDATE public.products
         SET stock = stock - r.qty
       WHERE id::text = r.pid
         AND (stock IS NULL OR stock >= r.qty);

      IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_OUT_OF_STOCK:%', r.pid USING ERRCODE='P0001';
      END IF;

      INSERT INTO public.inventory(product_id, order_id, quantity_change, reason)
      VALUES (r.pid::uuid, NEW.id, -r.qty, 'إعادة حجز مخزون بعد إعادة فتح الطلب #' || order_label);
    END LOOP;
  END IF;

  NEW.stock_restored := false;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND coalesce(OLD.stock,0) IS DISTINCT FROM coalesce(NEW.stock,0) THEN
    -- Order-trigger stock changes are logged with their order_id above.
    -- Only top-level/manual stock edits are logged here to avoid duplicates.
    IF pg_trigger_depth() = 1 THEN
      INSERT INTO public.inventory(product_id, quantity_change, reason)
      VALUES (
        NEW.id,
        coalesce(NEW.stock,0) - coalesce(OLD.stock,0),
        'تعديل مباشر لرصيد المنتج'
      );
    END IF;

    IF coalesce(NEW.stock,0)=0 AND coalesce(OLD.stock,0)>0 THEN
      INSERT INTO public.admin_activity_log(action,entity_type,entity_id,details,actor)
      VALUES('product_out_of_stock','product',NEW.id::text,jsonb_build_object('name',NEW.name,'stock',NEW.stock),'system');
      INSERT INTO public.admin_notifications(type,title,body,entity_type,entity_id)
      VALUES('out_of_stock','🔴 نفد المخزون',coalesce(NEW.name,'منتج')||' أصبح غير متوفر.','product',NEW.id::text);
    ELSIF coalesce(NEW.stock,0)>0 AND coalesce(NEW.stock,0)<=5
      AND (coalesce(OLD.stock,0)>5 OR OLD.stock IS NULL) THEN
      INSERT INTO public.admin_activity_log(action,entity_type,entity_id,details,actor)
      VALUES('product_low_stock','product',NEW.id::text,jsonb_build_object('name',NEW.name,'stock',NEW.stock),'system');
      INSERT INTO public.admin_notifications(type,title,body,entity_type,entity_id)
      VALUES('low_stock','⚠️ مخزون منخفض',coalesce(NEW.name,'منتج')||' — المتبقي: '||NEW.stock::text,'product',NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

COMMIT;
