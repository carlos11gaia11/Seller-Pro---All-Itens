import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('leader navigation uses the secure profile workspace instead of legacy direct-table CRUD', async () => {
  const config = await readFile(new URL('assets/js/config.js', root), 'utf8');
  const legacy = await readFile(new URL('paginas/perfil-lider.html', root), 'utf8');
  assert.match(config, /paginas\/perfil\.html#leaderWorkspace/);
  assert.match(legacy, /perfil\.html#leaderWorkspace/);
});

test('RLS hardening migration removes public write policies from support management', async () => {
  const sql = await readFile(new URL('supabase/migrations/20260818_support_management_rls.sql', root), 'utf8');
  assert.match(sql, /drop policy if exists "Permitir inserir suportes_sellerpro"/i);
  assert.match(sql, /drop policy if exists "Permitir atualizar suportes_sellerpro"/i);
  assert.match(sql, /drop policy if exists "Permitir deletar suportes_sellerpro"/i);
});
