import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../supabase/migrations/20260818_leader_role_compatibility.sql', import.meta.url);

test('leader compatibility migration protects legacy role fields and syncs existing leaders', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /enforce_legacy_profile_privileged_fields/i);
  assert.match(sql, /new\.cargo\s*:=\s*old\.cargo/i);
  assert.match(sql, /new\.status\s*:=\s*old\.status/i);
  assert.match(sql, /support_profiles/i);
  assert.match(sql, /Suporte Lider/i);
  assert.match(sql, /lider_suporte/i);
});
