-- A gestão de suportes passa pela Edge Function leader-admin (service role),
-- que valida o JWT e o cargo do usuário. Removemos as políticas legadas que
-- permitiam escrita direta pela Data API.

drop policy if exists "Permitir inserir suportes_sellerpro" on public.suportes_sellerpro;
drop policy if exists "Permitir atualizar suportes_sellerpro" on public.suportes_sellerpro;
drop policy if exists "Permitir deletar suportes_sellerpro" on public.suportes_sellerpro;
