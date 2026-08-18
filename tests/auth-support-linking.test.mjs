import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const fn = await readFile(new URL('supabase/functions/leader-admin/index.ts', root), 'utf8');

test('leader admin exposes explicit Auth-user link management actions', () => {
  for (const action of ['list_auth_users', 'link_auth_user', 'unlink_auth_user']) {
    assert.match(fn, new RegExp(`case\\s+[\\"']${action}[\\"']`), `ação ${action} ausente`);
  }
  assert.match(fn, /auth\.admin\.listUsers/);
  assert.match(fn, /already_linked|já está vinculado/i);
});

test('database migration enforces one Auth user per support link', async () => {
  const sql = await readFile(new URL('supabase/migrations/20260818_auth_support_linking.sql', root), 'utf8');
  assert.match(sql, /unique index/i);
  assert.match(sql, /suportes_sellerpro\s*\(user_id\)/i);
  assert.match(sql, /sellers\s*\(suporte_id\)/i);
});
