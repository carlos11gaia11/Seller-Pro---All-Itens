import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function exists(url) { try { await access(url); return true; } catch { return false; } }

test('training PDFs use one canonical directory', async () => {
  const menu = await readFile(new URL('paginas/menu.html', root), 'utf8');
  assert.equal(await exists(new URL('pdfs/', root)), false);
  assert.equal(await exists(new URL('docs/pdfs/', root)), false);
  assert.equal(await exists(new URL('documentos/pdfs/', root)), true);
  assert.doesNotMatch(menu, /\.\.\/(?:docs\/pdfs|pdfs)\//);
  assert.match(menu, /\.\.\/documentos\/pdfs\//);
});
