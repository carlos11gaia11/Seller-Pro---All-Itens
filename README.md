# Seller Pro — Central de Operações

Aplicação web interna para centralizar rotinas de suporte, acompanhamento de sellers, lojas prontas, estoque, materiais de treinamento e gestão da equipe.

A versão atual utiliza **HTML, CSS e JavaScript**, com autenticação e dados no **Supabase**. A interface foi padronizada no tema Seller Pro, com paleta preta, grafite, branca e laranja.

## O que foi modernizado

- autenticação Supabase obrigatória em todas as páginas internas;
- autorização adicional para a página de gestão da liderança;
- cadastro público limitado ao perfil de suporte;
- navegação, cabeçalho, tema e encerramento de sessão centralizados;
- novo perfil individual com foto, dados profissionais e indicadores;
- bucket privado para fotos de perfil, usando links temporários assinados;
- gamificação com XP, níveis, sequência de atividade e conquistas;
- imagens WebP otimizadas para reduzir o carregamento do HUB;
- substituição de bibliotecas de animação por recursos nativos do navegador;
- favicon próprio e identidade visual compartilhada;
- testes automatizados de segurança, gamificação, desempenho e integridade;
- verificador de links locais, páginas protegidas e JavaScript embutido;
- quarentena dos arquivos inválidos encontrados na auditoria.

## Requisitos

- navegador moderno;
- projeto Supabase já configurado;
- conexão com a internet para carregar o cliente Supabase e acessar o projeto;
- servidor HTTP/HTTPS recomendado para uso em produção;
- Node.js 20 ou superior apenas para executar os testes.

> A versão 2.0.1 também aceita a abertura direta do `index.html`. Para contornar o isolamento de armazenamento entre arquivos locais, a sessão é transferida somente entre páginas protegidas pelo fragmento da URL e removida imediatamente após a leitura. Em produção, continue usando HTTP/HTTPS.

## Correção de login da versão 2.0.1

- removidos os scripts `type="module"` que eram bloqueados quando o arquivo era aberto diretamente;
- login, cadastro, perfil e gamificação passaram a usar scripts clássicos compatíveis;
- o formulário agora mostra erro de conexão em vez de ficar sem resposta;
- adicionada compatibilidade de sessão entre páginas no protocolo `file://`;
- cache dos scripts alterados foi invalidado.

## Instalação rápida

### 1. Aplicar a migração do Supabase

Abra o **SQL Editor** do Supabase e execute:

```text
supabase/migrations/20260720_support_profiles_gamification.sql
```

A migração cria:

- tabela `support_profiles`;
- regras RLS para leitura autenticada e edição do próprio perfil;
- bucket privado `avatars`;
- políticas de upload, alteração e exclusão na pasta do próprio usuário.

Detalhes: [`supabase/README.md`](supabase/README.md).

### 2. Iniciar um servidor local

Na raiz do projeto:

```bash
python -m http.server 8080
```

Depois acesse:

```text
http://localhost:8080
```

Também pode ser usado qualquer servidor estático, como Live Server, Netlify, Vercel ou GitHub Pages.

### 3. Executar a validação

```bash
npm test
npm run check
```

- `npm test`: executa testes de segurança, gamificação e desempenho.
- `npm run check`: verifica referências locais, páginas protegidas, documentos suspeitos e sintaxe dos scripts embutidos.

## Autenticação e permissões

### Usuário de suporte

- cria a conta em `paginas/cadastro.html`;
- recebe o cargo inicial de suporte;
- acessa as páginas operacionais;
- edita somente os dados do próprio perfil;
- envia e altera somente a própria foto de perfil.

### Liderança

A permissão de liderança não pode ser escolhida no cadastro público nem alterada pelo formulário pessoal. A autorização considera somente:

- `app_metadata.role`, `app_metadata.cargo` ou `app_metadata.funcao`, definidos por uma rotina administrativa;
- o campo protegido `support_profiles.cargo`.

Cargos reconhecidos:

```text
lider
líder
leader
gestor
admin
administrador
```

A migration impede usuários autenticados de alterar `cargo` e `xp_bonus` diretamente pela API. A página `paginas/perfil-lider.html` faz uma segunda validação antes de carregar os dados. Ocultar o link no menu não é tratado como controle de segurança.

### Chave pública do Supabase

A chave configurada em `assets/js/config.js` é a chave publicável usada pelo navegador. A proteção dos dados depende das políticas **RLS** das tabelas e do Storage. Nunca coloque uma `service_role` no frontend.

## Perfil e gamificação

A página `paginas/perfil.html` permite registrar:

- nome;
- cargo;
- telefone;
- especialidade;
- biografia curta;
- data de entrada;
- foto de perfil.

A pontuação padrão é calculada com dados operacionais existentes:

| Evento | XP |
|---|---:|
| Loja entregue | 30 |
| Venda finalizada | 20 |
| Tarefa concluída | 12 |
| Seller ativo | 5 |

Os níveis são definidos em `assets/js/gamification.js`. A pontuação pode ser ajustada de forma centralizada nesse arquivo.

## Estrutura principal

```text
/
├── index.html                         # Login
├── paginas/                           # Telas públicas e protegidas
├── assets/css/                        # Tema, autenticação e perfil
├── assets/js/                         # Configuração, autenticação e módulos
├── assets/icons/                      # Favicon e ativos vetoriais
├── imagens/                           # Imagens originais e WebP otimizadas
├── documentos/                        # PDFs e modelos válidos
├── planilhas/                         # Controles em Excel
├── apresentacoes/                     # Apresentações válidas
├── sons/                              # Efeitos sonoros
├── supabase/migrations/               # Migrações SQL
├── scripts/                           # Auditoria e otimização
├── tests/                             # Testes automatizados
├── arquivos-corrompidos/              # Bytes originais em quarentena
└── docs/                              # Especificações, plano e QA
```

Consulte também [`MAPA-DO-PROJETO.md`](MAPA-DO-PROJETO.md).

## Arquivos pendentes

Quatro arquivos recebidos tinham apenas `2 bytes` e não eram documentos válidos. Eles foram retirados dos downloads para não causar erro ou falsa expectativa. Os bytes originais foram preservados em `arquivos-corrompidos/`.

Veja [`ARQUIVOS-PENDENTES.md`](ARQUIVOS-PENDENTES.md) para os caminhos esperados de substituição.

## Publicação

Antes de publicar:

1. aplique a migração do Supabase;
2. confirme as URLs permitidas em **Authentication > URL Configuration**;
3. revise o redirecionamento de recuperação de senha;
4. valide as políticas RLS das tabelas operacionais já existentes;
5. execute `npm test` e `npm run check`;
6. publique a raiz do projeto por HTTPS;
7. teste login, logout, perfil, upload de avatar e acesso da liderança.

## Manutenção

- coloque configurações globais em `assets/js/config.js`;
- evite duplicar autenticação dentro de páginas novas;
- adicione `assets/js/app-core.js` a toda página interna;
- use os tokens de `assets/css/seller-pro.css` para manter o tema;
- prefira WebP para novas imagens grandes;
- não adicione bibliotecas pesadas para efeitos que CSS ou Web Animations API resolvem;
- crie um teste para toda regra nova de segurança ou gamificação.

## Relatórios

- [`RELATORIO-DE-MELHORIAS.md`](RELATORIO-DE-MELHORIAS.md)
- [`docs/QA-VALIDACAO.md`](docs/QA-VALIDACAO.md)
- [`ARQUIVOS-PENDENTES.md`](ARQUIVOS-PENDENTES.md)
