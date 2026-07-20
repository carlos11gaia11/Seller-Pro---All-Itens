# Mapa do Projeto

## Entradas públicas

| Arquivo | Função |
|---|---|
| `index.html` | Login, recuperação de senha e redirecionamento seguro após autenticação. |
| `paginas/cadastro.html` | Cadastro de novos usuários com cargo inicial de suporte. |
| `menu.html` | Redirecionador de compatibilidade para `paginas/menu.html`. |
| `signup.html` | Redirecionador de compatibilidade para `paginas/cadastro.html`. |

## Páginas protegidas

Todas as páginas abaixo carregam `assets/js/app-core.js`, validam a sessão Supabase antes de iniciar consultas e recebem o cabeçalho compartilhado.

| Página | Responsabilidade |
|---|---|
| `paginas/menu.html` | HUB de atalhos, materiais e áreas operacionais. |
| `paginas/ares.html` | Painel Ares e rotinas relacionadas. |
| `paginas/lojas-prontas.html` | Controle de lojas prontas e entregas. |
| `paginas/lista-treinamento.html` | Acompanhamento de sellers e treinamento. |
| `paginas/estoque.html` | Controle de estoque. |
| `paginas/perfil.html` | Perfil individual, avatar, indicadores e gamificação. |
| `paginas/perfil-lider.html` | Gestão da equipe; exige cargo de liderança. |

## Núcleo compartilhado

| Arquivo | Responsabilidade |
|---|---|
| `assets/js/config.js` | URL, chave publicável do Supabase e rotas da aplicação. |
| `assets/js/app-core.js` | Sessão, perfil autenticado, autorização, navegação, tema e logout. |
| `assets/js/gamification.js` | XP, níveis, sequência e conquistas. |
| `assets/js/login.js` | Login, recuperação de senha e mensagens da autenticação. |
| `assets/js/signup.js` | Cadastro seguro e validação de senha. |
| `assets/js/profile.js` | Perfil, métricas, foto, compressão e persistência. |
| `assets/css/seller-pro.css` | Design system global e cabeçalho responsivo. |
| `assets/css/auth.css` | Layout das páginas de login e cadastro. |
| `assets/css/profile.css` | Layout do perfil e gamificação. |
| `assets/icons/favicon.svg` | Favicon oficial do projeto. |

## Dados do Supabase

### Novos recursos

| Recurso | Uso |
|---|---|
| `support_profiles` | Dados complementares do suporte e caminho da foto. |
| bucket `avatars` | Fotos privadas dos usuários. |

### Recursos existentes consumidos

A aplicação também consulta tabelas já existentes, como:

- `profiles`;
- `suportes_sellerpro`;
- `sellers`;
- `sp_tasks`;
- `sp_lojas_entregues`;
- tabelas específicas das páginas operacionais.

As políticas RLS dessas tabelas precisam ser mantidas no Supabase. O frontend não substitui segurança de banco.

## Imagens

| Pasta | Conteúdo |
|---|---|
| `imagens/logos/` | Logo original e versão WebP otimizada. |
| `imagens/banners/` | Banners originais e versões WebP usadas pelo HUB. |
| `imagens/icones/` | Ícones raster antigos preservados. |
| `assets/icons/` | Ícones vetoriais globais, incluindo o favicon. |

Os PNGs originais foram preservados. As páginas modernizadas usam as versões WebP sempre que possível.

## Documentos e materiais

| Pasta | Conteúdo |
|---|---|
| `documentos/pdfs/` | PDFs válidos para consulta e download. |
| `documentos/modelos/` | Modelos em Word. |
| `planilhas/controles/` | Planilhas Excel. |
| `apresentacoes/treinamentos/` | Apresentações válidas. |
| `arquivos-corrompidos/` | Arquivos inválidos preservados para rastreabilidade. |

## Qualidade e manutenção

| Arquivo | Função |
|---|---|
| `scripts/project-checker.mjs` | Auditoria de links, proteção, documentos e scripts inline. |
| `scripts/optimize-images.py` | Geração reproduzível das imagens WebP. |
| `tests/*.test.mjs` | Testes automatizados do projeto. |
| `docs/QA-VALIDACAO.md` | Evidências de validação e limitações do ambiente. |
| `supabase/README.md` | Instruções de banco, Storage e RLS. |
| `ARQUIVOS-PENDENTES.md` | Relação dos materiais que precisam ser substituídos. |

## Regra para novas páginas internas

Toda nova página protegida deve incluir, nesta ordem:

```html
<link rel="stylesheet" href="../assets/css/seller-pro.css">
<script src="../assets/js/config.js"></script>
<script src="../assets/js/app-core.js" defer></script>
```

O carregamento de dados deve começar somente após:

```js
SellerProApp.ready.then(() => {
  // iniciar a página
});
```
