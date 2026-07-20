# Configuração do Supabase

## Migração obrigatória

Execute no SQL Editor:

```text
migrations/20260720_support_profiles_gamification.sql
```

A operação é idempotente para a tabela, coluna, índice, trigger, bucket e políticas declaradas no arquivo.

## Tabela `support_profiles`

Campos principais:

| Campo | Uso |
|---|---|
| `user_id` | Referência única ao usuário de `auth.users`. |
| `email` | E-mail de apoio para exibição e compatibilidade. |
| `nome` | Nome exibido no perfil e cabeçalho. |
| `cargo` | Suporte, líder ou administrador. |
| `telefone` | Contato profissional. |
| `especialidade` | Área principal de atuação. |
| `bio` | Resumo de até 300 caracteres. |
| `data_entrada` | Data de entrada na operação. |
| `avatar_path` | Caminho privado da foto no Storage. |
| `xp_bonus` | Ajuste manual não negativo de XP. |

## Políticas da tabela

- usuários autenticados podem visualizar perfis;
- cada usuário insere, altera ou exclui somente a própria linha;
- `cargo`, `xp_bonus` e `user_id` são protegidos por trigger contra alterações do cliente autenticado;
- o caminho do avatar precisa começar com o próprio `auth.uid()`;
- `updated_at` é atualizado por trigger.

A leitura autenticada de todos os perfis foi mantida para permitir uma futura visão da equipe pela liderança. Dados sensíveis adicionais não devem ser adicionados a essa tabela sem revisar a política de leitura.

## Bucket `avatars`

Configuração:

- privado;
- limite de 5 MB por arquivo;
- JPEG, PNG e WebP;
- leitura somente por usuários autenticados;
- escrita, alteração e exclusão somente na pasta cujo primeiro segmento é o próprio `auth.uid()`.

Exemplo de caminho:

```text
<user-id>/avatar-<timestamp>.webp
```

A aplicação comprime a imagem para WebP, com até 512 × 512 pixels, antes do upload.

## Cargos de liderança

O frontend reconhece como liderança os cargos normalizados:

```text
lider
líder
leader
gestor
admin
administrador
```

A autorização usa `app_metadata` ou `support_profiles.cargo`. `user_metadata` e campos do navegador não concedem acesso.

A alteração deve ser feita pelo SQL Editor, backend administrativo ou outra rotina com privilégio elevado. Exemplo no SQL Editor:

```sql
insert into public.support_profiles (user_id, email, nome, cargo)
values ('UUID_DO_USUARIO', 'email@empresa.com', 'Nome', 'lider')
on conflict (user_id) do update set cargo = excluded.cargo;
```

O cadastro público e as inserções feitas por usuários autenticados sempre resultam em cargo de suporte.

## RLS das tabelas existentes

A migração deste projeto cobre somente `support_profiles` e `avatars`. Antes da publicação, confirme RLS nas tabelas existentes consumidas pelas páginas, incluindo, conforme o ambiente:

- `profiles`;
- `suportes_sellerpro`;
- `sellers`;
- `sp_tasks`;
- `sp_lojas_entregues`;
- `chamados_audio`;
- demais tabelas das áreas Ares, estoque e lojas prontas.

Uma política permissiva no banco não é corrigida pelo bloqueio do frontend.

## URLs de autenticação

Em **Authentication > URL Configuration**:

- configure a URL pública do projeto;
- adicione as URLs de desenvolvimento utilizadas;
- confirme o destino de recuperação de senha;
- evite curingas amplos em produção.

## Checklist pós-migração

1. criar ou acessar uma conta de suporte;
2. abrir `Meu perfil`;
3. salvar os dados;
4. enviar uma foto;
5. recarregar a página e confirmar a URL assinada;
6. verificar que outro usuário não altera a foto ou linha alheia;
7. testar um usuário comum em `perfil-lider.html`;
8. testar um usuário com cargo de liderança;
9. revisar os logs e as políticas RLS.
