-- قِطاف V11: شغّل الملف كاملًا مرة واحدة داخل Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '🍎',
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.categories add column if not exists image_url text;

create table if not exists public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete cascade,
  category_name text not null,
  unit text not null default 'كيلو',
  cost numeric(12,2) not null default 0,
  price numeric(12,2) not null default 0,
  currency text not null default 'ل.ت',
  stock numeric(12,2) not null default 0,
  icon text default '🍎',
  image_url text,
  offer_active boolean not null default false,
  discount_percent numeric(5,2) not null default 0,
  offer_price numeric(12,2),
  created_at timestamptz not null default now()
);
alter table public.products add column if not exists offer_active boolean not null default false;
alter table public.products add column if not exists discount_percent numeric(5,2) not null default 0;
alter table public.products add column if not exists offer_price numeric(12,2);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text not null,
  area text not null,
  address text,
  delivery_time text,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  status text not null default 'طلب جديد',
  rating int check (rating between 1 and 5),
  review text,
  review_date timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists cost_total numeric(12,2) not null default 0;
alter table public.orders add column if not exists profit_total numeric(12,2) not null default 0;
alter table public.orders add column if not exists payment_method text not null default 'نقدي';
alter table public.orders add column if not exists delivery_fee numeric(12,2) not null default 0;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null,
  phone text, currency text not null default 'ل.ت', created_at timestamptz not null default now()
);
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(), name text not null,
  phone text, areas text[] not null default '{}', active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(), supplier_id uuid references public.suppliers(id) on delete set null,
  product_id uuid references public.products(id) on delete restrict, quantity numeric(12,2) not null check(quantity>0),
  unit_cost numeric(12,2) not null check(unit_cost>=0), paid numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (quantity*unit_cost) stored,
  created_at timestamptz not null default now()
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(), title text not null,
  amount numeric(12,2) not null check(amount>0), notes text, created_at timestamptz not null default now()
);
create table if not exists public.sales_invoices (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete restrict,
  invoice_number text not null unique, revenue numeric(12,2) not null,
  cost numeric(12,2) not null, profit numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(), kind text not null,
  reference_id uuid, description text not null, amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create table if not exists public.platform_settings (
  id int primary key default 1 check(id=1),
  platform_name text not null default 'قِطاف',
  business_name text not null default 'للبيع والتوزيع',
  logo_url text, whatsapp text, phone text, email text, address text,
  footer_text text not null default 'خدمة موثوقة داخل مناطق التوصيل المحددة.',
  updated_at timestamptz not null default now()
);
insert into public.platform_settings(id) values(1) on conflict(id) do nothing;

alter table public.drivers add column if not exists email text;
alter table public.drivers add column if not exists national_id text;
alter table public.drivers add column if not exists vehicle_type text;
alter table public.drivers add column if not exists vehicle_plate text;
alter table public.drivers add column if not exists notes text;
alter table public.drivers add column if not exists extra_fields jsonb not null default '{}'::jsonb;
alter table public.suppliers add column if not exists email text;
alter table public.suppliers add column if not exists address text;
alter table public.suppliers add column if not exists notes text;
alter table public.suppliers add column if not exists extra_fields jsonb not null default '{}'::jsonb;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists notes text;
alter table public.customers add column if not exists extra_fields jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists assigned_driver_id uuid references public.drivers(id) on delete set null;
alter table public.platform_settings add column if not exists default_currency text not null default 'ل.ت';
alter table public.platform_settings add column if not exists low_stock_limit numeric not null default 2;
alter table public.platform_settings add column if not exists delivery_fee numeric not null default 0;
alter table public.platform_settings add column if not exists invoice_note text default 'شكرًا لتعاملكم معنا';
alter table public.platform_settings add column if not exists order_prefix text not null default 'ORD';

create or replace function public.complete_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order orders%rowtype; v_item jsonb; v_product products%rowtype;
v_cost numeric:=0; v_qty numeric; v_invoice text;
begin
  select * into v_order from orders where id=p_order_id for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  if v_order.delivered_at is not null then
    return jsonb_build_object('ok',true,'already_completed',true,'profit',v_order.profit_total);
  end if;
  for v_item in select * from jsonb_array_elements(v_order.items) loop
    v_qty:=coalesce((v_item->>'qty')::numeric,0);
    select * into v_product from products where id=(v_item->>'id')::uuid for update;
    if not found then raise exception 'منتج غير موجود: %',v_item->>'name'; end if;
    if v_product.stock<v_qty then raise exception 'المخزون غير كافٍ للمنتج: %',v_product.name; end if;
    update products set stock=stock-v_qty where id=v_product.id;
    v_cost:=v_cost+(v_product.cost*v_qty);
  end loop;
  v_invoice:='INV-'||replace(v_order.order_number,'#','');
  insert into sales_invoices(order_id,invoice_number,revenue,cost,profit)
  values(v_order.id,v_invoice,v_order.total,v_cost,v_order.total-v_cost);
  insert into financial_transactions(kind,reference_id,description,amount) values
  ('sale',v_order.id,'إيراد بيع '||v_order.order_number,v_order.total),
  ('cogs',v_order.id,'تكلفة بضاعة مباعة '||v_order.order_number,-v_cost);
  update orders set status='تم التسليم',delivered_at=now(),cost_total=v_cost,
  profit_total=total-v_cost where id=v_order.id;
  return jsonb_build_object('ok',true,'invoice',v_invoice,'revenue',v_order.total,'cost',v_cost,'profit',v_order.total-v_cost);
end $$;

create or replace function public.record_purchase(p_supplier_id uuid,p_product_id uuid,p_quantity numeric,p_unit_cost numeric,p_paid numeric default 0)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_old_stock numeric; v_old_cost numeric; v_new_cost numeric;
begin
  if p_quantity<=0 or p_unit_cost<0 or p_paid<0 or p_paid>(p_quantity*p_unit_cost) then raise exception 'بيانات الشراء غير صحيحة'; end if;
  select stock,cost into v_old_stock,v_old_cost from products where id=p_product_id for update;
  if not found then raise exception 'المنتج غير موجود'; end if;
  v_new_cost:=case when (v_old_stock+p_quantity)>0 then ((v_old_stock*v_old_cost)+(p_quantity*p_unit_cost))/(v_old_stock+p_quantity) else p_unit_cost end;
  insert into purchases(supplier_id,product_id,quantity,unit_cost,paid) values(p_supplier_id,p_product_id,p_quantity,p_unit_cost,p_paid) returning id into v_id;
  update products set stock=stock+p_quantity,cost=v_new_cost where id=p_product_id;
  if p_paid>0 then insert into financial_transactions(kind,reference_id,description,amount) values('purchase_payment',v_id,'مدفوعات شراء مخزون',-p_paid); end if;
  return v_id;
end $$;

create or replace function public.record_expense(p_title text,p_amount numeric,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  insert into expenses(title,amount,notes) values(p_title,p_amount,p_notes) returning id into v_id;
  insert into financial_transactions(kind,reference_id,description,amount) values('expense',v_id,p_title,-p_amount);
  return v_id;
end $$;

create or replace function public.reset_review_data()
returns void language plpgsql security definer set search_path=public as $$
begin
  truncate table financial_transactions,sales_invoices,expenses,purchases,orders,customers,drivers,suppliers,products,delivery_areas,categories restart identity cascade;
end $$;

alter table public.categories enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.suppliers enable row level security;
alter table public.drivers enable row level security;
alter table public.purchases enable row level security;
alter table public.expenses enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.platform_settings enable row level security;

-- سياسات مراجعة مؤقتة للموقع الثابت. تُستبدل بسياسات حسابات الإدارة لاحقًا.
do $$
declare t text;
begin
  foreach t in array array['categories','delivery_areas','products','customers','orders','suppliers','drivers','purchases','expenses','sales_invoices','financial_transactions','platform_settings'] loop
    execute format('drop policy if exists "review_all_%s" on public.%I', t, t);
    execute format('create policy "review_all_%s" on public.%I for all to anon using (true) with check (true)', t, t);
  end loop;
end $$;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=true, file_size_limit=5242880;

drop policy if exists "review_product_images_read" on storage.objects;
drop policy if exists "review_product_images_insert" on storage.objects;
drop policy if exists "review_product_images_delete" on storage.objects;
create policy "review_product_images_read" on storage.objects for select to anon using (bucket_id='product-images');
create policy "review_product_images_insert" on storage.objects for insert to anon with check (bucket_id='product-images');
create policy "review_product_images_delete" on storage.objects for delete to anon using (bucket_id='product-images');

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('brand-assets','brand-assets',true,5242880,array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do update set public=true, file_size_limit=5242880;
drop policy if exists "review_brand_assets_read" on storage.objects;
drop policy if exists "review_brand_assets_insert" on storage.objects;
drop policy if exists "review_brand_assets_update" on storage.objects;
create policy "review_brand_assets_read" on storage.objects for select to anon using (bucket_id='brand-assets');
create policy "review_brand_assets_insert" on storage.objects for insert to anon with check (bucket_id='brand-assets');
create policy "review_brand_assets_update" on storage.objects for update to anon using (bucket_id='brand-assets') with check (bucket_id='brand-assets');

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('category-images','category-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=true, file_size_limit=5242880;
drop policy if exists "review_category_images_read" on storage.objects;
drop policy if exists "review_category_images_insert" on storage.objects;
drop policy if exists "review_category_images_update" on storage.objects;
drop policy if exists "review_category_images_delete" on storage.objects;
create policy "review_category_images_read" on storage.objects for select to anon using (bucket_id='category-images');
create policy "review_category_images_insert" on storage.objects for insert to anon with check (bucket_id='category-images');
create policy "review_category_images_update" on storage.objects for update to anon using (bucket_id='category-images') with check (bucket_id='category-images');
create policy "review_category_images_delete" on storage.objects for delete to anon using (bucket_id='category-images');

grant usage on schema public to anon;
grant select,insert,update,delete on all tables in schema public to anon;
grant execute on function public.complete_order(uuid) to anon;
grant execute on function public.record_purchase(uuid,uuid,numeric,numeric,numeric) to anon;
grant execute on function public.record_expense(text,numeric,text) to anon;
grant execute on function public.reset_review_data() to anon;

-- V21: حسابات المستخدمين والصلاحيات
create table if not exists public.platform_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  can_store boolean not null default true,
  can_driver boolean not null default false,
  can_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_users(email,display_name,can_store,can_driver,can_admin,active)
values ('amerihgg@gmail.com','مالك المنصة',true,true,true,true)
on conflict(email) do update set can_store=true,can_driver=true,can_admin=true,active=true,updated_at=now();

alter table public.platform_users enable row level security;
drop policy if exists "users_read_own" on public.platform_users;
create policy "users_read_own" on public.platform_users for select to authenticated
using (lower(email)=lower(coalesce(auth.jwt()->>'email','')));

create or replace function public.my_platform_permissions()
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(
    (select jsonb_build_object(
      'email',email,'display_name',display_name,'can_store',can_store,
      'can_driver',can_driver,'can_admin',can_admin,'active',active)
     from platform_users
     where lower(email)=lower(coalesce(auth.jwt()->>'email','')) limit 1),
    jsonb_build_object('email',coalesce(auth.jwt()->>'email',''),'can_store',true,
      'can_driver',false,'can_admin',false,'active',true)
  );
$$;

create or replace function public.admin_list_permissions()
returns setof public.platform_users language plpgsql stable security definer set search_path=public as $$
begin
  if not exists(select 1 from platform_users where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and active and can_admin)
  then raise exception 'غير مصرح'; end if;
  return query select * from platform_users order by created_at desc;
end $$;

create or replace function public.admin_save_permission(
  p_email text,p_display_name text,p_can_store boolean,p_can_driver boolean,p_can_admin boolean,p_active boolean default true)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists(select 1 from platform_users where lower(email)=lower(coalesce(auth.jwt()->>'email','')) and active and can_admin)
  then raise exception 'غير مصرح'; end if;
  if trim(coalesce(p_email,''))='' then raise exception 'البريد مطلوب'; end if;
  insert into platform_users(email,display_name,can_store,can_driver,can_admin,active,updated_at)
  values(lower(trim(p_email)),nullif(trim(coalesce(p_display_name,'')),''),p_can_store,p_can_driver,p_can_admin,p_active,now())
  on conflict(email) do update set display_name=excluded.display_name,can_store=excluded.can_store,
    can_driver=excluded.can_driver,can_admin=excluded.can_admin,active=excluded.active,updated_at=now()
  returning id into v_id;
  return v_id;
end $$;

grant select on public.platform_users to authenticated;
grant execute on function public.my_platform_permissions() to authenticated;
grant execute on function public.admin_list_permissions() to authenticated;
grant execute on function public.admin_save_permission(text,text,boolean,boolean,boolean,boolean) to authenticated;

-- V21.2: سياسات المستخدم المسجل (إصلاح منع إضافة المنتجات والصور بعد Google Login)
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.platform_users
    where lower(email)=lower(coalesce(auth.jwt()->>'email',''))
      and active and can_admin
  );
$$;

grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.complete_order(uuid) to authenticated;
grant execute on function public.record_purchase(uuid,uuid,numeric,numeric,numeric) to authenticated;
grant execute on function public.record_expense(text,numeric,text) to authenticated;
grant execute on function public.reset_review_data() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['categories','delivery_areas','products','customers','orders','suppliers','drivers','purchases','expenses','sales_invoices','financial_transactions','platform_settings'] loop
    execute format('drop policy if exists "authenticated_admin_%s" on public.%I', t, t);
    execute format('create policy "authenticated_admin_%s" on public.%I for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin())', t, t);
  end loop;
end $$;

drop policy if exists "authenticated_product_images_admin" on storage.objects;
create policy "authenticated_product_images_admin" on storage.objects for all to authenticated
using (bucket_id='product-images' and public.is_platform_admin())
with check (bucket_id='product-images' and public.is_platform_admin());

drop policy if exists "authenticated_category_images_admin" on storage.objects;
create policy "authenticated_category_images_admin" on storage.objects for all to authenticated
using (bucket_id='category-images' and public.is_platform_admin())
with check (bucket_id='category-images' and public.is_platform_admin());

drop policy if exists "authenticated_brand_assets_admin" on storage.objects;
create policy "authenticated_brand_assets_admin" on storage.objects for all to authenticated
using (bucket_id='brand-assets' and public.is_platform_admin())
with check (bucket_id='brand-assets' and public.is_platform_admin());

-- V23: تقييم كل منتج داخل الطلب المستلم
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
