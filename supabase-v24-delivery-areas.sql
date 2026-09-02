-- قِطاف V24: شغّل هذا الملف مرة واحدة لإضافة مناطق ومواعيد التوصيل.
alter table public.delivery_areas add column if not exists available_from time not null default '09:00';
alter table public.delivery_areas add column if not exists available_to time not null default '18:00';
alter table public.delivery_areas add column if not exists active boolean not null default true;
alter table public.delivery_areas add column if not exists notes text;
alter table public.orders add column if not exists delivery_area_id uuid references public.delivery_areas(id) on delete set null;

grant select,insert,update,delete on public.delivery_areas to authenticated;
drop policy if exists "authenticated_delivery_areas_read" on public.delivery_areas;
create policy "authenticated_delivery_areas_read" on public.delivery_areas for select to authenticated
using (active or public.has_platform_permission('driver') or public.has_platform_permission('admin'));

drop policy if exists "delivery_areas_admin_write" on public.delivery_areas;
create policy "delivery_areas_admin_write" on public.delivery_areas for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());

-- تظل الإضافة والتعديل مقتصرين على الإدارة من خلال سياسة authenticated_admin_delivery_areas الموجودة.
