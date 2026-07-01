# Seller Pro — Projeto Organizado

Este projeto é uma aplicação web em **HTML, CSS e JavaScript** usada para centralizar acessos, páginas de suporte, materiais de treinamento, documentos, planilhas e controles internos.

## Arquivo principal

Abra primeiro o arquivo:

```text
index.html
```

Ele é a tela de login. Após o login, a aplicação direciona para:

```text
paginas/menu.html
```

## Estrutura das pastas

```text
/
├── index.html
├── menu.html
├── signup.html
├── README.md
├── MAPA-DO-PROJETO.md
├── paginas/
├── estilos/
├── scripts/
├── imagens/
├── sons/
├── documentos/
├── planilhas/
├── apresentacoes/
├── dados/
└── arquivos-antigos/
```

### paginas/
Aqui ficam as telas da aplicação, como menu, cadastro, perfil, Ares, estoque, treinamento e lojas prontas.

### estilos/
Pasta reservada para arquivos CSS separados. No estado atual, a maior parte do CSS continua dentro dos próprios arquivos HTML para evitar quebra de layout.

### scripts/
Pasta reservada para arquivos JavaScript separados. No estado atual, a maior parte do JavaScript continua dentro dos próprios arquivos HTML para preservar o funcionamento atual.

### imagens/
Aqui ficam logos, ícones e banners usados no sistema.

### sons/
Aqui ficam os efeitos sonoros usados na aplicação.

### documentos/
Aqui ficam PDFs, cartas, modelos e materiais de consulta.

### planilhas/
Aqui ficam arquivos Excel e controles.

### apresentacoes/
Aqui ficam arquivos de apresentação e treinamento.

### dados/
Pasta reservada para arquivos JSON ou outros dados locais, se forem usados no futuro.

### arquivos-antigos/
Pasta reservada para arquivos duplicados, antigos ou sem uso confirmado. Nenhum arquivo funcional foi enviado para essa pasta nesta organização.

## Observações importantes

- As chaves do Supabase foram mantidas como estavam.
- As regras de login não foram alteradas intencionalmente.
- Os arquivos HTML continuam com CSS e JavaScript internos para reduzir risco de quebra.
- Os caminhos internos de imagens, sons, páginas, documentos, planilhas e apresentações foram corrigidos.
- Os arquivos `menu.html` e `signup.html` foram mantidos na raiz apenas como redirecionadores de compatibilidade para evitar erro em links antigos.

## Arquivos que pareciam problemáticos

Os arquivos abaixo têm tamanho muito pequeno e podem estar vazios ou corrompidos. Eles foram mantidos no projeto porque existiam links apontando para eles:

```text
apresentacoes/treinamentos/apresentacao-onboard.pptx
documentos/pdfs/como-criar-anuncio.pdf
documentos/pdfs/processo-spn-amazon.pdf
documentos/pdfs/treinamento-fba.pdf
```

Recomendação: substituir esses arquivos por versões válidas quando possível.

## Principais arquivos movidos

| Antes | Depois |
|---|---|
| `menu.html` | `paginas/menu.html` |
| `signup.html` | `paginas/cadastro.html` |
| `doc/Ares.html` | `paginas/ares.html` |
| `doc/estoque.html` | `paginas/estoque.html` |
| `doc/lista_treinamento.html` | `paginas/lista-treinamento.html` |
| `doc/lojas_prontas.html` | `paginas/lojas-prontas.html` |
| `doc/perfil.html` | `paginas/perfil.html` |
| `doc/perfillider.html` | `paginas/perfil-lider.html` |
| `doc/iconnovaera.png` | `imagens/icones/icon-nova-era.png` |
| `doc/novaera.png` | `imagens/logos/nova-era.png` |
| `doc/sound/*` | `sons/efeitos-sonoros/` |
| `doc/*.pdf` | `documentos/pdfs/` |
| `doc/*.docx` | `documentos/modelos/` |
| `doc/*.xlsx` | `planilhas/controles/` |
| `doc/*.pptx` | `apresentacoes/treinamentos/` |


## Principais arquivos renomeados

| Antes | Depois |
|---|---|
| `signup.html` | `paginas/cadastro.html` |
| `doc/Ares.html` | `paginas/ares.html` |
| `doc/lista_treinamento.html` | `paginas/lista-treinamento.html` |
| `doc/lojas_prontas.html` | `paginas/lojas-prontas.html` |
| `doc/perfillider.html` | `paginas/perfil-lider.html` |
| `doc/iconnovaera.png` | `imagens/icones/icon-nova-era.png` |
| `doc/novaera.png` | `imagens/logos/nova-era.png` |
| `doc/sound/som_entregue.mp3` | `sons/efeitos-sonoros/som-entregue.mp3` |
| `doc/Guia.pdf` | `documentos/pdfs/guia-criacao-loja.pdf` |
| `doc/Listing Padr#U00e3o Seller Pro.pdf` | `documentos/pdfs/listing-padrao-seller-pro.pdf` |
| `doc/Mapa Mental -- Aula 2.pdf` | `documentos/pdfs/mapa-mental-aula-2.pdf` |
| `doc/beneficiosSP.pdf` | `documentos/pdfs/beneficios-amazon-sp.pdf` |
| `doc/comocriaranuncio.pdf` | `documentos/pdfs/como-criar-anuncio.pdf` |
| `doc/comocriaranuncioo.pdf` | `documentos/pdfs/como-fazer-envio.pdf` |
| `doc/dba.pdf` | `documentos/pdfs/guia-dba.pdf` |
| `doc/explicacao_ads_acos_amazon.pdf` | `documentos/pdfs/explicacao-ads-acos-amazon.pdf` |
| `doc/spnamazon.pdf` | `documentos/pdfs/processo-spn-amazon.pdf` |
| `doc/treinamento_fba.pdf` | `documentos/pdfs/treinamento-fba.pdf` |
| `doc/carta de autorizacao.docx` | `documentos/modelos/carta-autorizacao.docx` |
| `doc/carta de revenda de marca.docx` | `documentos/modelos/carta-revenda-marca.docx` |
| `doc/hazmat baterias.xlsx` | `planilhas/controles/hazmat-baterias.xlsx` |
| `doc/hazmat quimicos.xlsx` | `planilhas/controles/hazmat-quimicos.xlsx` |
| `doc/planilhaFBA.xlsx` | `planilhas/controles/planilha-fba.xlsx` |
| `doc/apresentacao.pptx` | `apresentacoes/treinamentos/apresentacao-onboard.pptx` |


## Como publicar no GitHub Pages

1. Envie esta pasta organizada para o GitHub.
2. No repositório, vá em **Settings**.
3. Acesse **Pages**.
4. Em **Branch**, selecione a branch principal, geralmente `main`.
5. Selecione a pasta `/root`.
6. Salve.
7. O GitHub vai gerar um link público para acessar a aplicação.

## Conferência feita

Foi realizada uma verificação automática dos principais caminhos locais em HTML, CSS inline e JavaScript inline. Os links internos conhecidos foram atualizados para a nova estrutura.
