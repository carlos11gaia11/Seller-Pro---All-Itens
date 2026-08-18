-- Garante vínculo 1:1 entre cadastro operacional de suporte e usuário do Supabase Auth.
create unique index if not exists suportes_sellerpro_user_id_unique
  on public.suportes_sellerpro (user_id)
  where user_id is not null;

-- Acelera os contadores e a redistribuição de sellers por suporte.
create index if not exists sellers_suporte_id_idx
  on public.sellers (suporte_id);
