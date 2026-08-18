import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../supabase/functions/leader-admin/index.ts', import.meta.url);

async function source() {
  return await readFile(sourceUrl, 'utf8');
}

test('leader-admin Edge Function exists and validates the authenticated caller as leadership', async () => {
  const code = await source();
  assert.match(code, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(code, /auth\.getUser\(/);
  assert.match(code, /support_profiles/);
  assert.match(code, /isLeaderRole/);
  assert.match(code, /Acesso restrito/i);
});

test('leader-admin implements the operations used by the leader UI', async () => {
  const code = await source();
  for (const action of ['dashboard', 'save_support', 'save_access', 'create_seller', 'assign_seller', 'delete_support']) {
    assert.match(code, new RegExp(`case\\s+[\\\"']${action}[\\\"']`), `ação ${action} ausente`);
  }
});

test('delete support is soft by default when related sellers exist', async () => {
  const code = await source();
  assert.match(code, /delete_support/);
  assert.match(code, /sellers/i);
  assert.match(code, /status[^\n]*inativo|inativo[^\n]*status/i);
});

test('leader-admin accepts the legacy Suporte Lider role used by the live database', async () => {
  const code = await source();
  assert.match(code, /suporte_lider/);
  assert.match(code, /Suporte Lider/);
});

test('leader-admin keeps modern and legacy profile tables synchronized', async () => {
  const code = await source();
  assert.match(code, /support_profiles/);
  assert.match(code, /profiles/);
  assert.match(code, /Suporte N1/);
  assert.match(code, /Suporte Lider/);
});

test('deactivating a support also clears the legacy ativo flag', async () => {
  const code = await source();
  assert.match(code, /ativo\s*:\s*false/);
});
