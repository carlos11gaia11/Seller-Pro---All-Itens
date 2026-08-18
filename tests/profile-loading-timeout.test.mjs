import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const profile = await readFile(new URL('../assets/js/profile.js', import.meta.url), 'utf8');
const core = await readFile(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');

test('profile optional Supabase queries have a deadline so the spinner cannot wait forever', () => {
  assert.match(profile, /function\s+withTimeout\s*\(/);
  assert.match(profile, /Promise\.allSettled/);
  assert.match(profile, /fetchMetricSource/);
  assert.match(profile, /Tempo excedido ao consultar/);
  assert.doesNotMatch(profile, /client\.from\(table\)\.select\('\*'\)/);

  const initializeBody = profile.match(/async function initialize\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(initializeBody, 'initialize() não encontrado');
  assert.match(initializeBody, /elements\.app\.hidden = false/);
  assert.match(initializeBody, /void refreshMetrics\(\)/);
});

test('protected-page authentication has deadlines for Supabase calls', () => {
  assert.match(core, /function\s+withTimeout\s*\(/);
  assert.match(core, /withTimeout\([\s\S]*?client\.auth\.getSession\(\)/);
  assert.match(core, /withTimeout\([\s\S]*?client\.auth\.getUser\(\)/);
  assert.match(core, /withTimeout\([\s\S]*?loadProfile\(userData\.user\)/);
});
