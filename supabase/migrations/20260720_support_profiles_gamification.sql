-- Seller Pro: perfis individuais, avatar e base de gamificação.
-- Execute este arquivo no SQL Editor do Supabase antes de publicar o perfil novo.

create extension if not exists pgcrypto;

create table if not exists public.support_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  nome text not null default '',
  cargo text not null default 'suporte',
  telefone text,
  especialidade text,
  bio text check (char_length(coalesce(bio, '')) <= 300),
  data_entrada date,
  avatar_url text,
  avatar_path text,
  xp_bonus integer not null default 0 check (xp_bonus >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_profiles add column if not exists avatar_path text;

create index if not exists support_profiles_email_idx
  on public.support_profiles (lower(email));

alter table public.support_profiles enable row level security;

drop policy if exists "support_profiles_authenticated_read" on public.support_profiles;
create policy "support_profiles_authenticated_read"
  on public.support_profiles
  for select
  to authenticated
  using (true);

drop policy if exists "support_profiles_insert_own" on public.support_profiles;
create policy "support_profiles_insert_own"
  on public.support_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "support_profiles_update_own" on public.support_profiles;
create policy "support_profiles_update_own"
  on public.support_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "support_profiles_delete_own" on public.support_profiles;
create policy "support_profiles_delete_own"
  on public.support_profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_support_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_profiles_set_updated_at on public.support_profiles;
create trigger support_profiles_set_updated_at
before update on public.support_profiles
for each row execute function public.set_support_profile_updated_at();

create or replace function public.enforce_support_profile_privileged_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  request_user uuid := auth.uid();
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      new.user_id := request_user;
      new.cargo := 'suporte';
      new.xp_bonus := 0;
    else
      new.user_id := old.user_id;
      new.cargo := old.cargo;
      new.xp_bonus := old.xp_bonus;
    end if;

    new.email := coalesce(auth.jwt() ->> 'email', new.email);

    if coalesce(new.avatar_path, '') <> ''
      and split_part(new.avatar_path, '/', 1) <> request_user::text then
      raise exception 'avatar_path precisa pertencer ao usuário autenticado'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists support_profiles_protect_privileged_fields on public.support_profiles;
create trigger support_profiles_protect_privileged_fields
before insert or update on public.support_profiles
for each row execute function public.enforce_support_profile_privileged_fields();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_authenticated_read" on storage.objects;
create policy "avatars_authenticated_read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

revoke all on public.support_profiles from authenticated;
grant select on public.support_profiles to authenticated;
grant insert (user_id, email, nome, telefone, especialidade, bio, data_entrada, avatar_url, avatar_path)
  on public.support_profiles to authenticated;
grant update (user_id, email, nome, telefone, especialidade, bio, data_entrada, avatar_url, avatar_path)
  on public.support_profiles to authenticated;
grant delete on public.support_profiles to authenticated;
