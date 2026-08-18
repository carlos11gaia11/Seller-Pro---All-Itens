# Seller Pro Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar o projeto Seller Pro com identidade visual unificada, autenticação Supabase real em todas as páginas internas, perfil individual com foto e gamificação, menor peso e documentação clara.

**Architecture:** Manter a aplicação estática e introduzir uma camada compartilhada em Vanilla CSS/JavaScript para configuração, sessão, shell e tema. Reescrever somente o perfil individual e os trechos de autenticação de alto risco, preservando as páginas operacionais e suas consultas existentes.

**Tech Stack:** HTML5, CSS3, JavaScript ES2020, Supabase JS v2, SQL PostgreSQL/RLS, Node.js para testes estáticos, Chromium headless para validação visual.

## Global Constraints

- Não introduzir React, Vue, Angular ou outra runtime pesada.
- Preservar tabelas, integrações e fluxos Supabase já usados.
- Exigir sessão Supabase em todas as páginas internas.
- Usar paleta preta/grafite/laranja com contraste WCAG apropriado.
- Manter funcionamento responsivo e compatível com hospedagem estática.
- Não depender de credenciais secretas no frontend.
- O perfil deve continuar utilizável mesmo antes da migration, com fallback limitado.

---

### Task 1: Baseline, testes e mapa de dependências

**Files:**
- Create: `tests/test-gamification.mjs`
- Create: `tests/check-project.mjs`
- Create: `package.json`

**Interfaces:**
- Produces: comandos `npm test` e `npm run check`.

- [ ] Criar testes de XP, nível, progresso e conquistas com casos de limite.
- [ ] Criar verificador de links locais, arquivos vazios/corrompidos conhecidos e presença da guarda de autenticação.
- [ ] Executar os testes antes da implementação e confirmar falhas esperadas por módulos ausentes.

### Task 2: Camada compartilhada de configuração, tema e autenticação

**Files:**
- Create: `assets/js/config.js`
- Create: `assets/js/app-core.js`
- Create: `assets/css/seller-pro.css`
- Create: `assets/icons/favicon.svg`
- Modify: `paginas/*.html`

**Interfaces:**
- Produces: `window.SellerProConfig`, `window.SellerProApp.ready`, `window.SellerProApp.profile`, `window.SellerProApp.toast(message,type)`.

- [ ] Definir rotas, configuração pública Supabase e helpers de caminho.
- [ ] Implementar guarda com `auth.getSession()` e `auth.getUser()`.
- [ ] Implementar shell global, tema persistente, navegação, usuário e logout.
- [ ] Injetar CSS/scripts com `defer` em todas as páginas internas.
- [ ] Remover guardas baseadas apenas em armazenamento local.

### Task 3: Fortalecer login e cadastro

**Files:**
- Modify: `index.html`
- Modify: `paginas/cadastro.html`

**Interfaces:**
- Consumes: configuração compartilhada do Supabase.
- Produces: autenticação sem chave temporária e fluxo de recuperação de senha.

- [ ] Remover credencial temporária embutida.
- [ ] Redirecionar sessão já autenticada para o menu.
- [ ] Adicionar recuperação de senha por e-mail.
- [ ] Tornar mensagens acessíveis e impedir múltiplos envios.
- [ ] Simplificar cadastro visual e documentar que a aprovação real depende do Supabase/RLS.

### Task 4: Perfil individual e avatar

**Files:**
- Rewrite: `paginas/perfil.html`
- Create: `assets/js/profile.js`
- Create: `supabase/migrations/20260720_support_profiles_gamification.sql`

**Interfaces:**
- Consumes: `SellerProApp.ready`, usuário Supabase e tabelas operacionais.
- Produces: edição de `support_profiles`, avatar no bucket `avatars` e indicadores calculados.

- [ ] Criar layout de perfil responsivo com dados pessoais e profissionais.
- [ ] Implementar carregamento com fallback `support_profiles` → `suportes_sellerpro` → metadata.
- [ ] Implementar compressão de avatar em canvas e upload seguro.
- [ ] Implementar edição com validação e feedback.
- [ ] Criar migration com tabela, índices, trigger e RLS.

### Task 5: Motor de gamificação

**Files:**
- Create: `assets/js/gamification.js`
- Modify: `assets/js/profile.js`
- Test: `tests/test-gamification.mjs`

**Interfaces:**
- Produces: `calculateGamification(input)`, `getLevelFromXp(xp)`, `getAchievements(stats)`.

- [ ] Implementar fórmula determinística de XP.
- [ ] Implementar níveis com crescimento progressivo.
- [ ] Implementar conquistas e sequência de atividade.
- [ ] Consultar tarefas, lojas entregues e sellers de forma tolerante a falhas.
- [ ] Renderizar progresso e explicar como cada indicador foi calculado.

### Task 6: Unificação visual e desempenho das páginas operacionais

**Files:**
- Modify: `paginas/menu.html`
- Modify: `paginas/ares.html`
- Modify: `paginas/estoque.html`
- Modify: `paginas/lista-treinamento.html`
- Modify: `paginas/lojas-prontas.html`
- Modify: `paginas/perfil-lider.html`

**Interfaces:**
- Consumes: classes e tokens de `seller-pro.css`.

- [ ] Aplicar body classes e títulos padronizados.
- [ ] Corrigir contraste, foco, rolagem de tabelas e estados vazios.
- [ ] Remover animações contínuas incompatíveis com `prefers-reduced-motion`.
- [ ] Adicionar lazy loading e dimensões às imagens.
- [ ] Deferir scripts que não precisam bloquear a renderização.

### Task 7: Otimização de imagens e favicon

**Files:**
- Create: `imagens/logos/nova-era-optimized.webp`
- Create: `imagens/icones/icon-nova-era-64.png`
- Modify: referências de logo e favicon.

**Interfaces:**
- Produces: recursos menores mantendo os originais para compatibilidade.

- [ ] Gerar WebP redimensionado para uso na interface.
- [ ] Gerar PNG pequeno para fallback de favicon.
- [ ] Atualizar dimensões e carregamento das imagens.
- [ ] Comparar tamanhos antes/depois.

### Task 8: Verificação completa e empacotamento

**Files:**
- Modify: `README.md`
- Modify: `MAPA-DO-PROJETO.md`
- Create: `RELATORIO-DE-MELHORIAS.md`
- Create: `Seller-Pro-modernizado.zip`

**Interfaces:**
- Consumes: projeto completo.
- Produces: ZIP final e relatório de implantação.

- [ ] Executar `npm test` e `npm run check`.
- [ ] Abrir servidor local e testar login, redirecionamentos e perfil em Chromium.
- [ ] Verificar erros de console e 404.
- [ ] Atualizar documentação de implantação e migration.
- [ ] Remover artefatos temporários e gerar ZIP final.
