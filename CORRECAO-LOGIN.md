# Correção do login — versão 2.0.1

## Causa encontrada

O login, o cadastro e o perfil eram carregados como scripts JavaScript do tipo `module`. Ao abrir o `index.html` diretamente no computador, navegadores bloqueiam esses módulos locais, deixando o formulário visível, porém sem eventos de clique ou envio.

## Alterações

- scripts de entrada convertidos para JavaScript clássico;
- eventos do formulário conectados antes da inicialização do Supabase;
- mensagem visível em caso de falha de CDN, internet ou Supabase;
- sessão transferida entre páginas locais e removida do endereço após a leitura;
- navegação hospedada continua usando o armazenamento padrão do Supabase;
- parâmetros de versão atualizados para evitar cache antigo.

## Diagnóstico do Supabase

O frontend aponta para o projeto `owgvzmeewzpmzgcdwbfq`. A conexão Supabase disponível nesta sessão não possui permissão para consultar esse projeto, portanto o estado dele e as configurações de Auth precisam ser confirmados no painel da conta que o administra.

## Testes

- 32 testes automatizados;
- verificação de referências e páginas protegidas;
- verificação de sintaxe de todos os scripts;
- teste de interação do formulário com sucesso e falha de conexão.
