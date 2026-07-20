import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const leaderPage = await readFile(new URL('../paginas/perfil-lider.html', import.meta.url), 'utf8');

test('management page rejects authenticated users without a leader role', () => {
  assert.match(leaderPage, /SellerProApp\.isLeader\(SellerProApp\.profile\)/);
  assert.match(leaderPage, /Acesso restrito à liderança/);
  assert.match(leaderPage, /SellerProApp\.navigate\("\.\/perfil\.html",\s*\{\s*replace:\s*true\s*\}\)/);
  assert.doesNotMatch(leaderPage, /setTimeout\(loadVoiceHistory/);
});
