import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

async function text(file) {
  return readFile(new URL(`../${file}`, import.meta.url), 'utf8');
}

test('avatar bucket is private and readable only by authenticated users', async () => {
  const migration = await text('supabase/migrations/20260720_support_profiles_gamification.sql');
  assert.match(migration, /'avatars',\s*'avatars',\s*false/);
  assert.match(migration, /avatars_authenticated_read/);
  assert.doesNotMatch(migration, /create policy "avatars_public_read"/);
});

test('profile stores a storage path and renders a signed URL', async () => {
  const profile = await text('assets/js/profile.js');
  assert.match(profile, /createSignedUrl/);
  assert.doesNotMatch(profile, /getPublicUrl/);
});
