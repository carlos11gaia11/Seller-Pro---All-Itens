-- Compatibilidade e segurança da liderança Seller Pro.
-- Preserva a tabela legada profiles, mas impede que um usuário autenticado
-- eleve o próprio cargo/status por atualização direta no navegador.

create or replace function public.enforce_legacy_profile_privileged_fields()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  if auth.uid() is not null then
    new.id := old.id;
    new.user_id := old.user_id;
    new.cargo := old.cargo;
    new.status := old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_fields on public.profiles;
create trigger profiles_protect_privileged_fields
before update on public.profiles
for each row
execute function public.enforce_legacy_profile_privileged_fields();

-- Migra líderes existentes do modelo legado ("Suporte Lider") para o perfil
-- moderno protegido, sem apagar ou recriar usuários.
insert into public.support_profiles (
  user_id,
  email,
  nome,
  cargo,
  telefone
)
select
  coalesce(p.user_id, p.id) as user_id,
  p.email,
  p.nome,
  'lider_suporte' as cargo,
  p.telefone
from public.profiles p
where p.cargo::text in ('Suporte Lider', 'Mentor Lider')
  and coalesce(p.user_id, p.id) is not null
on conflict (user_id) do update
set
  email = excluded.email,
  nome = excluded.nome,
  cargo = 'lider_suporte',
  telefone = coalesce(excluded.telefone, public.support_profiles.telefone),
  updated_at = now();

-- Vincula cadastros operacionais existentes ao login quando o e-mail coincide.
update public.suportes_sellerpro s
set
  user_id = coalesce(p.user_id, p.id),
  updated_at = now()
from public.profiles p
where s.user_id is null
  and nullif(trim(s.email), '') is not null
  and lower(trim(s.email)) = lower(trim(p.email));
