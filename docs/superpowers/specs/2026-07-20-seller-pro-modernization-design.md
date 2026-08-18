# Seller Pro — Design de Modernização, Segurança e Gamificação

## Objetivo

Modernizar o projeto Seller Pro sem reescrever as rotinas operacionais já existentes. A solução deve unificar a identidade visual preta e laranja, proteger todas as páginas internas com sessão real do Supabase, melhorar o perfil individual de cada suporte, adicionar foto e gamificação, reduzir dependências visuais pesadas e manter o projeto compreensível para manutenção futura.

## Diagnóstico do estado atual

- Aplicação estática em HTML, CSS e JavaScript, sem etapa de build.
- Aproximadamente 21 mil linhas concentradas em arquivos HTML com CSS e JavaScript inline.
- Proteção de acesso inconsistente: algumas páginas validam Supabase, outras aceitam apenas flags manipuláveis em `localStorage`/`sessionStorage`.
- O login contém uma credencial temporária embutida no código.
- Páginas usam combinações diferentes de Tailwind CDN, DaisyUI, GSAP, tsParticles, Font Awesome e CSS próprio.
- A página de perfil atual funciona principalmente como gestão de suportes/liderança, e não como perfil individual completo.
- Imagens principais estão maiores do que o necessário para os espaços em que são exibidas.

## Abordagem escolhida

Modernização progressiva sobre o stack existente, com uma camada compartilhada e leve em Vanilla CSS/JavaScript. As páginas operacionais permanecem funcionais e recebem autenticação, cabeçalho, tema, navegação, acessibilidade e estados de carregamento compartilhados. A página de perfil individual será reconstruída como uma tela própria, enquanto o painel administrativo do líder permanecerá em `perfil-lider.html`.

## Arquitetura

### Camada compartilhada

- `assets/css/seller-pro.css`: tokens, componentes, cabeçalho global, acessibilidade, responsividade e overrides compatíveis.
- `assets/js/config.js`: configuração pública do Supabase e rotas internas.
- `assets/js/app-core.js`: sessão, guarda de autenticação, carregamento do perfil, navegação global, tema e logout.
- `assets/js/profile.js`: perfil individual, upload de avatar, edição de dados e cálculo de gamificação.
- `assets/icons/favicon.svg`: favicon vetorial leve.

### Autenticação

- Login e cadastro continuam sendo páginas públicas de autenticação.
- Todas as páginas operacionais são protegidas pelo `app-core.js`.
- A guarda exige sessão Supabase válida e não confia em flags locais como prova de autenticação.
- O acesso temporário embutido no login é removido.
- O logout encerra a sessão Supabase e limpa somente dados legados de compatibilidade.
- A autorização administrativa continua sendo validada por cargo e RLS no Supabase.

### Perfil individual

O perfil exibe e permite editar:

- foto;
- nome;
- cargo;
- telefone;
- especialidade;
- biografia curta;
- data de entrada;
- e-mail somente leitura;
- indicadores operacionais;
- nível, XP, sequência e conquistas.

A fonte primária é `support_profiles`; quando ainda não existir registro, os dados básicos são preenchidos por `suportes_sellerpro`, `profiles` ou metadados do usuário.

### Gamificação

A gamificação é orientada a progresso profissional, sem ranking público obrigatório:

- XP por lojas entregues, vendas finalizadas, tarefas concluídas e sellers ativos atribuídos ao suporte;
- nível calculado por faixas crescentes;
- barra de progresso para o próximo nível;
- conquistas desbloqueadas por marcos reais;
- sequência de atividade baseada em dias distintos com entregas/conclusões;
- dados calculados em leitura, evitando criar eventos duplicados.

### Banco de dados

Uma migration SQL cria:

- tabela `support_profiles` vinculada a `auth.users`;
- colunas editáveis e campos de gamificação;
- bucket `avatars`;
- políticas RLS para leitura interna e edição do próprio perfil;
- políticas do Storage para avatar próprio.

O sistema continua funcionando em modo limitado caso a migration ainda não tenha sido aplicada: avatar e preferências ficam locais e os indicadores são calculados somente quando as tabelas existentes permitem leitura.

## Design visual

- Paleta: fundo grafite/preto, superfícies elevadas, laranja como ação, verde apenas para sucesso, vermelho apenas para erro.
- Tipografia: fonte do sistema para evitar download adicional.
- Ícones: SVGs próprios e símbolos simples no shell compartilhado; bibliotecas antigas permanecem apenas nas páginas que dependem delas.
- Hierarquia: uma métrica principal por card, títulos curtos, contraste alto, espaços consistentes.
- Animações: discretas e desativadas com `prefers-reduced-motion`.
- Responsividade: mobile-first para shell e perfil, preservando tabelas com rolagem horizontal.

## Desempenho

- Sem novo framework pesado.
- Scripts compartilhados carregados com `defer`.
- Imagens rasterizadas redimensionadas/comprimidas e variantes WebP quando úteis.
- Remoção do Tailwind CDN da página de cadastro reconstruída e do perfil novo.
- Lazy loading em imagens não críticas.
- Evitar animações contínuas e partículas no shell compartilhado.
- Manter bibliotecas grandes somente onde a lógica atual ainda depende delas.

## Tratamento de erros

- Tela de sessão inválida com redirecionamento seguro.
- Toast compartilhado com mensagens úteis.
- Falhas de perfil/gamificação não bloqueiam o restante da aplicação.
- Upload valida tipo e tamanho, comprime a imagem no navegador e apresenta fallback local.
- Consultas opcionais usam `Promise.allSettled` para não derrubar o perfil inteiro.

## Testes e validação

- Verificação estática de links locais, scripts e folhas de estilo.
- Testes unitários em Node para funções puras de XP, nível e conquistas.
- Servidor HTTP local e testes de navegação com navegador headless.
- Capturas de tela do login e perfil em desktop e mobile.
- Verificação de console para erros JavaScript e recursos 404.
- Empacotamento final em ZIP, sem arquivos temporários.

## Limites de segurança

Um frontend estático não substitui políticas RLS. A chave pública do Supabase pode permanecer no cliente, mas qualquer permissão efetiva deve ser aplicada no banco. A migration incluída é parte obrigatória da implantação para foto e dados privados funcionarem com segurança completa.
