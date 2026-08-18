import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('paginas/perfil.html', root), 'utf8');
const profile = await readFile(new URL('assets/js/profile.js', root), 'utf8');

test('profile indicators settle and expose a retry state instead of loading forever', () => {
  assert.match(profile, /Promise\.allSettled/);
  assert.match(profile, /profileMetricsRetry/);
  assert.match(profile, /setMetricsState/);
  assert.doesNotMatch(profile, /client\.from\(table\)\.select\('\*'\)/);
});

test('leadership workspace is loaded as a dedicated module and has explicit Auth linking controls', () => {
  assert.match(html, /assets\/js\/leader-workspace\.js/);
  assert.match(html, /id="leaderAuthUser"/);
  assert.match(html, /id="leaderLinkAuthButton"/);
  assert.match(html, /id="leaderUnlinkAuthButton"/);
});


test('profile loading hidden state wins over layout CSS', async () => {
  const css = await readFile(new URL('assets/css/profile.css', root), 'utf8');
  assert.match(css, /\.sp-profile-loading\[hidden\]\s*\{[^}]*display:\s*none\s*!important/i);
});
