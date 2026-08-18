import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';

const menuUrl = new URL('../paginas/menu.html', import.meta.url);

test('corrupted training files are not exposed as functional downloads', async () => {
  const menu = await readFile(menuUrl, 'utf8');
  const brokenPaths = [
    '../apresentacoes/treinamentos/apresentacao-onboard.pptx',
    '../documentos/pdfs/como-criar-anuncio.pdf',
    '../documentos/pdfs/processo-spn-amazon.pdf',
    '../documentos/pdfs/treinamento-fba.pdf',
  ];

  for (const file of brokenPaths) assert.doesNotMatch(menu, new RegExp(`href=["']${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(menu, /is-unavailable/);
});

test('original corrupted bytes are preserved in a quarantined folder', async () => {
  const backups = [
    '../arquivos-corrompidos/apresentacao-onboard.pptx.original-corrompido',
    '../arquivos-corrompidos/como-criar-anuncio.pdf.original-corrompido',
    '../arquivos-corrompidos/processo-spn-amazon.pdf.original-corrompido',
    '../arquivos-corrompidos/treinamento-fba.pdf.original-corrompido',
  ];
  await Promise.all(backups.map((file) => access(new URL(file, import.meta.url))));
});
