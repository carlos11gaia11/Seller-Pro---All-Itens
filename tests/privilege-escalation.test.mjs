import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const core = await readFile(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const profile = await readFile(new URL('../assets/js/profile.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20260720_support_profiles_gamification.sql', import.meta.url), 'utf8');

test('leader authorization ignores user-editable auth metadata', () => {
  assert.match(core, /profile\?\.authorization_role/);
  assert.match(core, /user\.app_metadata\s*\|\|\s*\{\}/);
  assert.doesNotMatch(core, /cargo:\s*metadata\.cargo\s*\|\|/);
});

test('personal profile save does not submit privileged fields', () => {
  const payload = profile.match(/const payload = \{([\s\S]*?)\n  \};/)?.[1] || '';
  assert.ok(payload, 'payload de perfil não encontrado');
  assert.doesNotMatch(payload, /\bcargo\s*:/);
  assert.doesNotMatch(payload, /\bxp_bonus\s*:/);
  assert.doesNotMatch(payload, /\bupdated_at\s*:/);
});

test('database migration prevents authenticated users from changing role or XP bonus', () => {
  assert.match(migration, /enforce_support_profile_privileged_fields/);
  assert.match(migration, /auth\.role\(\)\s*=\s*'authenticated'/);
  assert.match(migration, /new\.cargo\s*:=\s*'suporte'/);
  assert.match(migration, /new\.cargo\s*:=\s*old\.cargo/);
  assert.match(migration, /new\.xp_bonus\s*:=\s*old\.xp_bonus/);
  assert.doesNotMatch(migration, /grant select, insert, update, delete on public\.support_profiles to authenticated/i);
});
