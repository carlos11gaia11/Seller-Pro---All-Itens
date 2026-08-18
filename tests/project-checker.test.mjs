import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { auditProject } from '../scripts/project-checker.mjs';

async function fixture(files) {
  const root = await mkdtemp(path.join(tmpdir(), 'seller-pro-check-'));
  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, contents);
  }
  return root;
}

test('reports missing local assets referenced by HTML', async () => {
  const root = await fixture({
    'index.html': '<img src="images/missing.png"><a href="pages/home.html">Home</a>',
    'pages/home.html': '<p>ok</p>',
  });

  const report = await auditProject(root, { protectedPages: [] });

  assert.equal(report.errors.length, 1);
  assert.match(report.errors[0], /images\/missing\.png/);
});

test('requires the shared authentication shell on protected pages', async () => {
  const root = await fixture({
    'paginas/menu.html': '<!doctype html><title>Menu</title>',
  });

  const report = await auditProject(root, {
    protectedPages: ['paginas/menu.html'],
  });

  assert.equal(report.errors.length, 1);
  assert.match(report.errors[0], /app-core\.js/);
});

test('ignores external, anchor, data and template URLs', async () => {
  const root = await fixture({
    'index.html': [
      '<a href="#top">Topo</a>',
      '<a href="https://example.com">Externo</a>',
      '<img src="data:image/svg+xml;base64,abc">',
      '<img src="${dynamicUrl}">',
    ].join(''),
  });

  const report = await auditProject(root, { protectedPages: [] });

  assert.deepEqual(report.errors, []);
});

test('reports invalid inline JavaScript with the page and script index', async () => {
  const root = await fixture({
    'index.html': '<script>const value = ;</script>',
  });

  const report = await auditProject(root, { protectedPages: [] });

  assert.equal(report.errors.length, 1);
  assert.match(report.errors[0], /index\.html: script inline 1 inválido/);
});

test('ignores non-JavaScript script blocks during syntax validation', async () => {
  const root = await fixture({
    'index.html': '<script type="application/json">{"enabled": true}</script>',
  });

  const report = await auditProject(root, { protectedPages: [] });

  assert.deepEqual(report.errors, []);
});
