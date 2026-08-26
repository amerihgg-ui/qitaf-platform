-- قِطاف V8: شغّل الملف كاملًا مرة واحدة داخل Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '🍎',
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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

alter table public.categories enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;

-- سياسات مراجعة مؤقتة للموقع الثابت. تُستبدل بسياسات حسابات الإدارة لاحقًا.
do $$
declare t text;
begin
  foreach t in array array['categories','delivery_areas','products','customers','orders'] loop
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

grant usage on schema public to anon;
grant select,insert,update,delete on all tables in schema public to anon;
