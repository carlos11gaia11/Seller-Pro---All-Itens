import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const menu = await readFile(new URL('../paginas/menu.html', import.meta.url), 'utf8');
const core = await readFile(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');

test('leader-only UI relies on the authenticated Supabase profile', () => {
  assert.match(core, /app\.isLeader\s*=\s*isLeader/);
  assert.match(menu, /SellerProApp\?\.isLeader/);
  assert.doesNotMatch(menu, /EMAILS_SUPORTE_LIDER/);
  assert.doesNotMatch(menu, /suporte99@/);
});
