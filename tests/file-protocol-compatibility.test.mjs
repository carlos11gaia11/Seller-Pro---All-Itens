import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('entry pages avoid browser modules so the app works when index.html is opened directly', async () => {
  for (const file of ['index.html', 'paginas/cadastro.html', 'paginas/perfil.html']) {
    const html = await read(file);
    assert.doesNotMatch(html, /<script\b[^>]*\btype=["']module["']/i, `${file} usa script module e falha em file://`);
  }
});

test('browser entry scripts avoid top-level module syntax', async () => {
  for (const file of ['assets/js/login.js', 'assets/js/signup.js', 'assets/js/profile.js', 'assets/js/gamification.js']) {
    const source = await read(file);
    assert.doesNotMatch(source, /^\s*import\s/m, `${file} contém import`);
    assert.doesNotMatch(source, /^\s*export\s/m, `${file} contém export`);
  }
});

test('pages load the local-session bridge before the shared auth core', async () => {
  for (const file of [
    'index.html',
    'paginas/ares.html',
    'paginas/cadastro.html',
    'paginas/estoque.html',
    'paginas/lista-treinamento.html',
    'paginas/lojas-prontas.html',
    'paginas/menu.html',
    'paginas/perfil-lider.html',
    'paginas/perfil.html'
  ]) {
    const html = await read(file);
    const bridge = html.indexOf('file-session.js');
    const core = html.indexOf('app-core.js');
    assert.ok(bridge >= 0, `${file} não carrega file-session.js`);
    assert.ok(core > bridge, `${file} precisa carregar file-session.js antes de app-core.js`);
  }
});

test('the auth core restores transferred sessions and login navigates with the returned session', async () => {
  const core = await read('assets/js/app-core.js');
  const login = await read('assets/js/login.js');
  assert.match(core, /restoreTransferredSession\(client\)/);
  assert.match(core, /client\.auth\.setSession\(session\)/);
  assert.match(login, /SellerProApp\.navigate\(safeRedirect\(\),\s*\{\s*replace:\s*true,\s*session:\s*data\.session\s*\}\)/);
});
