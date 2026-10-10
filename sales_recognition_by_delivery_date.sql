-- Record the first delivery time for completed orders and report completed
-- sales by delivery date (legacy rows fall back to created_at when needed).
BEGIN;

CREATE OR REPLACE FUNCTION public.set_order_delivered_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF coalesce(NEW.status_code, '') = 'delivered'
     OR public.derive_order_status_code(NEW.status) = 'delivered' THEN
    NEW.delivered_at := coalesce(NEW.delivered_at, now());
  ELSE
    NEW.delivered_at := NULL;
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS zz_orders_set_delivered_at ON public.orders;
CREATE TRIGGER zz_orders_set_delivered_at
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_delivered_at();

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_start timestamp with time zone := (v_today::timestamp at time zone 'Africa/Cairo');
  v_next timestamp with time zone := ((v_today + 1)::timestamp at time zone 'Africa/Cairo');
  v_month_start date := date_trunc('month', v_today::timestamp)::date;
  v_prev_month_start date := (date_trunc('month', v_today::timestamp) - interval '1 month')::date;
  v_year_start date := date_trunc('year', v_today::timestamp)::date;
  v_prev_year_start date := (date_trunc('year', v_today::timestamp) - interval '1 year')::date;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_ONLY' using errcode = '42501';
  end if;

  with base as (
    select
      o.id,o.total,o.created_at,o.items,o.payment_method,o.payment_status,
      o.coupon_code,o.discount_amount,o.order_source,o.delivered_at,
      case
        when o.status_code in ('pending','paid','processing','shipped','delivered','cancelled') then o.status_code
        when coalesce(o.status,'') ~ 'ملغي|ملغى|إلغاء|الغاء|مرتجع|returned|refund|رفض' then 'cancelled'
        when coalesce(o.status,'') ~ 'تم التوصيل|تم التسليم|تسليم|توصيل|deliver' then 'delivered'
        when coalesce(o.status,'') ~ 'مع المندوب|المندوب|تم الشحن|shipped|خرج للشحن' then 'shipped'
        when coalesce(o.status,'') ~ 'مدفوع|تم الدفع|دفع تم|تم السداد|paid' then 'paid'
        when coalesce(o.status,'') ~ 'قيد التجهيز|التجهيز|تجهيز|processing' then 'processing'
        else 'pending'
      end as sc,
      nullif(lower(btrim(coalesce(o.phone,''))),'') as phone_key,
      nullif(lower(btrim(coalesce(o.customerName,o.customer_name,''))),'') as name_key
    from public.orders o
  ),
  delivered as (
    select * from base where sc='delivered'
  ),
  payments as (
    select coalesce(nullif(btrim(payment_method),''),'غير محدد') as method, count(*)::int as cnt
    from base where lower(coalesce(payment_status,''))='paid'
    group by 1 order by cnt desc
  ),
  top_products as (
    select i->>'name' as name, sum(greatest(coalesce(nullif(i->>'qty','')::numeric,1),1)) as qty
    from delivered d
    cross join lateral jsonb_array_elements(case when jsonb_typeof(d.items)='array' then d.items else '[]'::jsonb end) i
    where coalesce((i->>'isGift')::boolean,false)=false
      and nullif(btrim(i->>'name'),'') is not null
    group by 1 order by qty desc limit 1
  ),
  daily as (
    select gs::date as day,
      coalesce((select sum(d.total) from delivered d where (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date=gs::date),0) as cur,
      coalesce((select sum(d.total) from delivered d where (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date=(gs::date - interval '1 month')::date),0) as prev
    from generate_series(v_month_start, v_today, interval '1 day') gs
  ),
  weekly as (
    select gs::date as week_start,
      coalesce((select sum(d.total) from delivered d where (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date >= gs::date and (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date < (gs::date + interval '7 day')::date),0) as cur,
      coalesce((select sum(d.total) from delivered d where (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date >= (gs::date - interval '56 day')::date and (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date < (gs::date - interval '49 day')::date),0) as prev
    from generate_series(
      date_trunc('week', v_today::timestamp)::date - interval '49 day',
      date_trunc('week', v_today::timestamp)::date,
      interval '7 day'
    ) gs
  ),
  monthly as (
    select extract(month from gs)::int as m, gs::date as month_start,
      coalesce((select sum(d.total) from delivered d where (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date >= gs::date and (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date < (gs::date + interval '1 month')::date),0) as cur,
      coalesce((select sum(d.total) from delivered d where (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date >= (gs::date - interval '1 year')::date and (coalesce(d.delivered_at,d.created_at) at time zone 'Africa/Cairo')::date < (gs::date - interval '11 month')::date),0) as prev
    from generate_series(v_year_start, v_year_start + interval '11 month', interval '1 month') gs
  )
  select jsonb_build_object(
    'total_orders',(select count(*) from base),
    'delivered_orders',(select count(*) from base where sc='delivered'),
    'cancelled_orders',(select count(*) from base where sc='cancelled'),
    'pending_orders',(select count(*) from base where sc in ('pending','paid','processing','shipped')),
    'paid_orders',(select count(*) from base where lower(coalesce(payment_status,''))='paid'),
    'coupon_orders',(select count(*) from base where coupon_code is not null or coalesce(discount_amount,0)>0),
    'total_sales',coalesce((select sum(total) from delivered),0),
    'aov',coalesce((select avg(total) from delivered),0),
    'customer_count',(
      select count(distinct coalesce(phone_key,name_key))
      from base
      where coalesce(phone_key,name_key) is not null
    ),
    'total_products',(select count(*) from public.products),
    'low_stock_count',(select count(*) from public.products where stock is not null and stock between 1 and 5),
    'out_of_stock_count',(select count(*) from public.products where stock=0),
    'direct_orders',(select count(*) from base where coalesce(order_source,'website')='website'),
    'contact_orders',(select count(*) from base where order_source in ('whatsapp','phone')),
    'avg_delivery_hours',coalesce((select avg(extract(epoch from (delivered_at-created_at))/3600.0) from delivered where delivered_at is not null),0),
    'today_orders',(select count(*) from base where created_at>=v_start and created_at<v_next),
    'today_delivered_sales',coalesce((select sum(total) from delivered where coalesce(delivered_at,created_at)>=v_start and coalesce(delivered_at,created_at)<v_next),0),
    'today_sessions',coalesce((select count(distinct session_id) from public.visitor_events where created_at>=v_start and created_at<v_next and session_id is not null),0),
    'page_loads',coalesce((select sum(count) from public.visitors),0),
    'current_month_sales',coalesce((select sum(total) from delivered where (coalesce(delivered_at,created_at) at time zone 'Africa/Cairo')::date>=v_month_start),0),
    'previous_month_sales',coalesce((select sum(total) from delivered where (coalesce(delivered_at,created_at) at time zone 'Africa/Cairo')::date>=v_prev_month_start and (coalesce(delivered_at,created_at) at time zone 'Africa/Cairo')::date<v_month_start),0),
    'payments',coalesce((select jsonb_agg(jsonb_build_object('method',method,'count',cnt) order by cnt desc) from payments),'[]'::jsonb),
    'top_product',coalesce((select jsonb_build_object('name',name,'qty',qty) from top_products),'null'::jsonb),
    'daily_chart',coalesce((select jsonb_agg(jsonb_build_object('day',day,'cur',cur,'prev',prev) order by day) from daily),'[]'::jsonb),
    'weekly_chart',coalesce((select jsonb_agg(jsonb_build_object('week_start',week_start,'cur',cur,'prev',prev) order by week_start) from weekly),'[]'::jsonb),
    'monthly_chart',coalesce((select jsonb_agg(jsonb_build_object('month',m,'cur',cur,'prev',prev) order by month_start) from monthly),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$
;

COMMIT;
