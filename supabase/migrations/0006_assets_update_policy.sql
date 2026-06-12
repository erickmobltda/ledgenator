create policy "assets_auth_update" on public.assets
  for update to authenticated
  using (true)
  with check (true);
