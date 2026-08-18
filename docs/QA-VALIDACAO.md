# QA e Validação — correção de login, 20 de julho de 2026

## Escopo

Foram verificados:

- autenticação e cadastro;
- proteção das páginas internas;
- autorização da liderança;
- perfil e foto;
- gamificação;
- integridade dos caminhos locais;
- sintaxe de JavaScript;
- orçamento de imagens;
- layout de login e perfil em desktop e mobile.

## Validação automatizada

Comandos:

```bash
npm test
npm run check
```

Resultado na entrega:

- 32 testes automatizados aprovados;
- nenhuma referência local quebrada;
- nenhuma página protegida sem `app-core.js`;
- nenhum script inline com erro de sintaxe;
- nenhum documento inválido exposto como download funcional.

## Validação funcional do login

O formulário foi executado no Chromium com um cliente Supabase controlado para verificar o fluxo de ponta a ponta do frontend:

- clique em **Entrar** chamou `signInWithPassword` com o e-mail normalizado e a senha informada;
- a resposta com sessão exibiu a mensagem de sucesso e acionou a navegação;
- uma falha de inicialização exibiu uma mensagem clara e manteve o botão habilitado;
- não houve erro de página no cenário de sucesso nem no cenário de falha controlada.

Também foram adicionados testes para impedir regressão de scripts `type="module"` e para validar a transferência local de sessão.

## Validação visual

O ambiente de execução bloqueou navegação do Chromium por URL, inclusive em `localhost`, com `ERR_BLOCKED_BY_ADMINISTRATOR`. Por isso, a validação visual utilizou o fallback do Playwright com o HTML e CSS de produção carregados diretamente em memória.

Viewports avaliados:

| Tela | Viewport | Resultado |
|---|---:|---|
| Login desktop | 1440 × 1000 | Sem overflow; hierarquia, formulário e contraste conferidos. |
| Login mobile | 390 × 844 | Layout empilhado e sem overflow horizontal. |
| Perfil desktop | 1440 × 1760 | Sidebar, KPIs, formulário e conquistas alinhados. |
| Perfil mobile | 390 × 3539 | Cards responsivos, KPIs em duas colunas e formulário legível. |

## Pontos visuais conferidos

1. paleta preta, grafite, branca e laranja;
2. legibilidade e hierarquia tipográfica;
3. tamanho e estados dos campos e botões;
4. composição do login em desktop e mobile;
5. identidade, progresso e preenchimento do perfil;
6. KPIs e conquistas sem corte;
7. ausência de rolagem horizontal;
8. espaçamento consistente entre seções;
9. favicon e identidade do cabeçalho;
10. comportamento responsivo dos principais blocos.

## Validação funcional por código

Foram confirmados por testes e inspeção:

- o carregamento de dados aguarda `SellerProApp.ready`;
- a sessão vem de `supabase.auth.getSession()`;
- usuário sem sessão é redirecionado ao login;
- usuário comum é retirado da gestão;
- upload do avatar usa pasta do próprio usuário;
- a foto é exibida por URL assinada;
- cadastro público não define cargo elevado;
- `user_metadata` não é aceito como fonte de autorização;
- a migration protege cargo, bônus de XP e pasta do avatar;
- XP e níveis produzem resultado determinístico;
- arquivos corrompidos não aparecem como downloads ativos.

## Limitações da validação

- não foi possível autenticar contra o projeto Supabase real porque não há credenciais de usuário de teste e o projeto configurado não está disponível na conexão Supabase desta sessão;
- integrações externas dependem das permissões e disponibilidade dos serviços de produção;
- RLS das tabelas antigas precisa ser confirmado no painel do Supabase;
- quatro documentos originais continuam pendentes de reposição;
- páginas antigas com Tailwind/DaisyUI foram preservadas para evitar quebra e permanecem dependentes de CDN.

## Teste final recomendado no ambiente publicado

1. entrar com suporte comum;
2. navegar por todas as páginas;
3. salvar o perfil e enviar uma foto;
4. sair e entrar novamente;
5. tentar abrir a gestão com suporte comum;
6. entrar com liderança e abrir a gestão;
7. testar CRUD das áreas operacionais;
8. verificar console e Network do navegador;
9. testar em celular real;
10. confirmar RLS usando duas contas diferentes.
