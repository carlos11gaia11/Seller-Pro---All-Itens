import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';

async function text(file) {
  return readFile(new URL(`../${file}`, import.meta.url), 'utf8');
}

test('hub does not load Tailwind at runtime and uses optimized images', async () => {
  const hub = await text('paginas/menu.html');
  assert.doesNotMatch(hub, /cdn\.tailwindcss\.com/);
  assert.match(hub, /nova-era\.webp/);
  assert.match(hub, /planilhas-online\.webp/);
});

test('Loja Pronta avoids animation libraries for cosmetic effects', async () => {
  const page = await text('paginas/lojas-prontas.html');
  assert.doesNotMatch(page, /gsap(?:\.min)?\.js|ScrollTrigger|tsparticles|confetti\.browser/);
});

test('optimized visual assets stay below the static performance budget', async () => {
  const files = [
    'imagens/logos/nova-era.webp',
    'imagens/banners/lojapronta.webp',
    'imagens/banners/planilhas-online.webp',
    'imagens/banners/dba-fba.webp',
    'imagens/banners/treinamento.webp',
    'imagens/banners/arquivos-download.webp',
    'imagens/banners/pocket-amazon.webp',
  ];

  for (const file of files) {
    const info = await stat(new URL(`../${file}`, import.meta.url));
    assert.ok(info.size < 200_000, `${file} excedeu 200 KB`);
  }
});

test('protected pages use the local system font stack instead of Google Fonts imports', async () => {
  const pages = [
    'paginas/ares.html',
    'paginas/lista-treinamento.html',
  ];

  for (const page of pages) {
    assert.doesNotMatch(await text(page), /fonts\.googleapis\.com/, `${page} ainda importa Google Fonts`);
  }
});
