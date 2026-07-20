import assert from 'node:assert/strict';
import test from 'node:test';

await import('../assets/js/file-session.js');

const helper = globalThis.SellerProFileSession;

test('encodes a Supabase session only for file URLs', () => {
  const session = { access_token: 'access.token', refresh_token: 'refresh-token' };
  const local = helper.withSession('file:///C:/Seller-Pro/paginas/menu.html', session);
  const hosted = helper.withSession('https://sellerpro.example/paginas/menu.html', session);

  assert.match(local, /sp_session=/);
  assert.equal(hosted, 'https://sellerpro.example/paginas/menu.html');
});

test('extracts a local session and removes it from the visible URL', () => {
  const session = { access_token: 'access.token', refresh_token: 'refresh-token' };
  const target = helper.withSession('file:///C:/Seller-Pro/paginas/menu.html#secao', session);
  const result = helper.extractSession(target);

  assert.deepEqual(result.session, session);
  assert.equal(result.cleanedUrl, 'file:///C:/Seller-Pro/paginas/menu.html#secao');
});

test('ignores malformed session payloads', () => {
  const result = helper.extractSession('file:///C:/Seller-Pro/index.html#sp_session=invalido');
  assert.equal(result.session, null);
  assert.match(result.cleanedUrl, /index\.html$/);
});
