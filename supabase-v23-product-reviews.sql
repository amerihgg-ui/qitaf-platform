-- شغّل هذا الملف مرة واحدة لإضافة تقييم كل منتج في الطلب المستلم.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.platform_users where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and active and can_admin);
$$;
grant execute on function public.is_platform_admin() to authenticated;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_name text not null,
  customer_email text not null,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique(order_id,product_id)
);
alter table public.product_reviews enable row level security;
grant select,insert,update,delete on public.product_reviews to authenticated;
drop policy if exists "product_reviews_own_read" on public.product_reviews;
create policy "product_reviews_own_read" on public.product_reviews for select to authenticated
using (lower(customer_email)=lower(coalesce(auth.jwt()->>'email','')) or public.is_platform_admin());
drop policy if exists "product_reviews_delivered_insert" on public.product_reviews;
create policy "product_reviews_delivered_insert" on public.product_reviews for insert to authenticated
with check (
  lower(customer_email)=lower(coalesce(auth.jwt()->>'email',''))
  and exists(select 1 from public.orders o where o.id=order_id and lower(product_reviews.customer_email)=lower(o.email) and o.status='تم التسليم')
);
drop policy if exists "product_reviews_admin_manage" on public.product_reviews;
create policy "product_reviews_admin_manage" on public.product_reviews for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());

create or replace function public.has_platform_permission(p_permission text)
returns boolean language sql stable security definer set search_path=public as $$
  select case
    when p_permission='store' then coalesce((select active and can_store from public.platform_users where lower(email)=lower(coalesce(auth.jwt()->>'email','')) limit 1),true)
    when p_permission='driver' then coalesce((select active and can_driver from public.platform_users where lower(email)=lower(coalesce(auth.jwt()->>'email','')) limit 1),false)
    when p_permission='admin' then public.is_platform_admin()
    else false end;
$$;
grant execute on function public.has_platform_permission(text) to authenticated;
drop policy if exists "authenticated_catalog_read" on public.products;
create policy "authenticated_catalog_read" on public.products for select to authenticated using (public.has_platform_permission('store') or public.has_platform_permission('driver'));
drop policy if exists "authenticated_categories_read" on public.categories;
create policy "authenticated_categories_read" on public.categories for select to authenticated using (public.has_platform_permission('store') or public.has_platform_permission('driver'));
drop policy if exists "authenticated_settings_read" on public.platform_settings;
create policy "authenticated_settings_read" on public.platform_settings for select to authenticated using (true);
drop policy if exists "customer_orders_read" on public.orders;
create policy "customer_orders_read" on public.orders for select to authenticated using (lower(email)=lower(coalesce(auth.jwt()->>'email','')));
drop policy if exists "customer_orders_insert" on public.orders;
create policy "customer_orders_insert" on public.orders for insert to authenticated with check (lower(email)=lower(coalesce(auth.jwt()->>'email','')) and public.has_platform_permission('store'));
drop policy if exists "driver_orders_read" on public.orders;
create policy "driver_orders_read" on public.orders for select to authenticated using (public.has_platform_permission('driver'));
drop policy if exists "driver_orders_update" on public.orders;
create policy "driver_orders_update" on public.orders for update to authenticated using (public.has_platform_permission('driver')) with check (public.has_platform_permission('driver'));
drop policy if exists "customer_profile_read" on public.customers;
create policy "customer_profile_read" on public.customers for select to authenticated using (lower(email)=lower(coalesce(auth.jwt()->>'email','')));
drop policy if exists "customer_profile_insert" on public.customers;
create policy "customer_profile_insert" on public.customers for insert to authenticated with check (lower(email)=lower(coalesce(auth.jwt()->>'email','')));
drop policy if exists "customer_profile_update" on public.customers;
create policy "customer_profile_update" on public.customers for update to authenticated using (lower(email)=lower(coalesce(auth.jwt()->>'email',''))) with check (lower(email)=lower(coalesce(auth.jwt()->>'email','')));
