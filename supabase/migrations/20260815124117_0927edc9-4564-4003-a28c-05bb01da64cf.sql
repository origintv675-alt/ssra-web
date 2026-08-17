drop policy if exists "Members upload own chat images" on storage.objects;
create policy "Members upload own chat images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members read chat images" on storage.objects;
create policy "Members read chat images" on storage.objects
  for select to authenticated
  using (bucket_id = 'community-media');

drop policy if exists "Members delete own chat images" on storage.objects;
create policy "Members delete own chat images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-media' and (storage.foldername(name))[1] = auth.uid()::text);