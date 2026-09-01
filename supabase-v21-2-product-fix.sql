-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor لإصلاح إضافة المنتجات والصور.
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
