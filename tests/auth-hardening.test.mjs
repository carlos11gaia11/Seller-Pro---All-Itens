import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('login does not contain embedded temporary credentials', async () => {
  const html = await read('index.html');
  assert.equal(html.includes('suporte99@'), false);
  assert.equal(html.includes('ACESSO TEMPORÁRIO'), false);
});

test('signup cannot self-assign leader or admin roles', async () => {
  const html = await read('paginas/cadastro.html');
  assert.equal(/value=["'](?:admin|lider_suporte)["']/i.test(html), false);
  assert.match(html, /name=["']cargo["'][^>]*value=["']suporte["']/i);
});

test('auth pages use local lightweight assets instead of Tailwind CDN', async () => {
  const login = await read('index.html');
  const signup = await read('paginas/cadastro.html');
  assert.equal(login.includes('cdn.tailwindcss.com'), false);
  assert.equal(signup.includes('cdn.tailwindcss.com'), false);
  assert.match(login, /assets\/css\/auth\.css/);
  assert.match(signup, /assets\/css\/auth\.css/);
});
