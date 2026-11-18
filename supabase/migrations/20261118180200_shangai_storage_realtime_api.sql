-- =============================================================================
-- Shangai Center · imágenes (Storage), tiempo real y exposición del schema
-- =============================================================================

-- Bucket público de imágenes del catálogo y la portada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shangai', 'shangai', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
   set public = excluded.public,
       file_size_limit = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública por URL (bucket público). Listar / subir / reemplazar / borrar: dueño o encargado.
create policy "shangai: el equipo lista imágenes" on storage.objects
  for select to authenticated
  using (bucket_id = 'shangai' and (select shangai_private.es_personal()));

create policy "shangai: el equipo sube imágenes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shangai' and (select shangai_private.tiene_rol(array['dueno', 'encargado'])));

create policy "shangai: el equipo reemplaza imágenes" on storage.objects
  for update to authenticated
  using (bucket_id = 'shangai' and (select shangai_private.tiene_rol(array['dueno', 'encargado'])))
  with check (bucket_id = 'shangai' and (select shangai_private.tiene_rol(array['dueno', 'encargado'])));

create policy "shangai: el equipo borra imágenes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'shangai' and (select shangai_private.tiene_rol(array['dueno', 'encargado'])));

-- Pedidos nuevos en vivo para el panel (Realtime respeta RLS: solo personal).
alter publication supabase_realtime add table shangai.pedidos;

-- Exponer el schema en la Data API (se suma a los que ya usa el proyecto).
alter role authenticator set pgrst.db_schemas = 'public, workos, graphql_public, laceleste, shangai';
notify pgrst, 'reload config';
