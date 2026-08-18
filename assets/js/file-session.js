(function exposeSellerProFileSession(global) {
  'use strict';

  const PARAMETER = 'sp_session';

  function encodeText(value) {
    if (typeof global.btoa === 'function') return global.btoa(value);
    if (typeof Buffer !== 'undefined') return Buffer.from(value, 'utf8').toString('base64');
    throw new Error('Codificador Base64 indisponível.');
  }

  function decodeText(value) {
    if (typeof global.atob === 'function') return global.atob(value);
    if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8');
    throw new Error('Decodificador Base64 indisponível.');
  }

  function sessionPayload(session) {
    if (!session?.access_token || !session?.refresh_token) return null;
    return {
      access_token: String(session.access_token),
      refresh_token: String(session.refresh_token)
    };
  }

  function withSession(target, session, baseUrl) {
    const url = new URL(target, baseUrl || target);
    if (url.protocol !== 'file:') return url.href;

    const payload = sessionPayload(session);
    if (!payload) return url.href;

    const parts = url.hash.slice(1).split('&').filter(Boolean).filter(part => !part.startsWith(`${PARAMETER}=`));
    const encoded = encodeURIComponent(encodeText(JSON.stringify(payload)));
    parts.push(`${PARAMETER}=${encoded}`);
    url.hash = parts.join('&');
    return url.href;
  }

  function extractSession(target, baseUrl) {
    const url = new URL(target, baseUrl || target);
    const parts = url.hash.slice(1).split('&').filter(Boolean);
    const marker = parts.find(part => part.startsWith(`${PARAMETER}=`));
    const remaining = parts.filter(part => !part.startsWith(`${PARAMETER}=`));
    url.hash = remaining.join('&');

    if (!marker) return { session: null, cleanedUrl: url.href };

    try {
      const encoded = decodeURIComponent(marker.slice(PARAMETER.length + 1));
      const parsed = JSON.parse(decodeText(encoded));
      const session = sessionPayload(parsed);
      return { session, cleanedUrl: url.href };
    } catch {
      return { session: null, cleanedUrl: url.href };
    }
  }

  global.SellerProFileSession = Object.freeze({
    PARAMETER,
    withSession,
    extractSession
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
