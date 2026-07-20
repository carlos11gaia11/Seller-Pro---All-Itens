(function bootstrapSellerPro(global) {
  'use strict';

  const config = global.SellerProConfig;
  const fileSession = global.SellerProFileSession || null;
  if (!config) {
    console.error('[Seller Pro] config.js precisa ser carregado antes de app-core.js.');
    document.documentElement.classList.remove('sp-auth-pending');
    return;
  }

  const app = global.SellerProApp || {};
  const readyResolver = {};
  app.ready = new Promise((resolve, reject) => {
    readyResolver.resolve = resolve;
    readyResolver.reject = reject;
  });
  app.config = config;
  app.user = null;
  app.profile = null;
  app.supabase = null;
  global.SellerProApp = app;

  const pageFile = window.location.pathname.split('/').pop() || 'index.html';
  const isProtectedPage = config.protectedFiles.includes(pageFile);
  const legacyStorageKeys = [
    'logado', 'autenticado', 'redirectLiberado', 'acessoTemporario',
    'usuarioLogado', 'usuario', 'currentUser', 'sellerProUsuario', 'dadosUsuario',
    'emailUsuario', 'nomeUsuario', 'cargoUsuario', 'avatarUsuario'
  ];

  const icons = Object.freeze({
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8v9.1a1.1 1.1 0 0 1-1.1 1.1h-5.2v-6.1H9.3V21H4.1A1.1 1.1 0 0 1 3 19.9z"/></svg>',
    board: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v16H4zm10 0h6v9h-6zm0 13h6v3h-6z"/></svg>',
    store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.2V21h16V9.2M3 9.2 5.1 3h13.8L21 9.2c0 1.6-1.3 2.8-2.8 2.8-1.2 0-2.2-.7-2.6-1.7A2.8 2.8 0 0 1 13 12c-1.2 0-2.2-.7-2.6-1.7A2.8 2.8 0 0 1 7.8 12C6.3 12 5 10.8 5 9.2"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.9m-2-11.8a4 4 0 0 1 0 7.7"/></svg>',
    inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10m-3-10 2 2 4-5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3m12-9h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
  });

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function isLeader(profile) {
    const role = normalizeText(profile?.authorization_role)
      .replace(/[_-]+/g, ' ');
    return role.includes('lider') || role.includes('admin') || role.includes('gestor');
  }
  app.isLeader = isLeader;

  function initials(value) {
    const text = String(value || 'Seller Pro').trim().replace(/@.*/, '');
    const pieces = text.split(/\s+/).filter(Boolean);
    if (pieces.length > 1) return `${pieces[0][0]}${pieces[pieces.length - 1][0]}`.toUpperCase();
    return text.slice(0, 2).toUpperCase();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function clearLegacySession() {
    for (const key of legacyStorageKeys) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  }

  function saveCompatibilitySession(user, profile) {
    const payload = {
      id: user.id,
      email: user.email || '',
      nome: profile?.nome || user.user_metadata?.nome || user.email || 'Usuário',
      cargo: profile?.cargo || 'Suporte',
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || ''
    };
    localStorage.setItem('sellerProUsuario', JSON.stringify(payload));
    sessionStorage.setItem('sellerProUsuario', JSON.stringify(payload));
    localStorage.setItem('logado', 'sim');
    sessionStorage.setItem('logado', 'sim');
  }

  function currentTheme() {
    const stored = localStorage.getItem('sellerProTheme') || localStorage.getItem('sellerProTema');
    if (stored === 'light' || stored === 'claro') return 'light';
    return 'dark';
  }

  function applyTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.spTheme = normalized;
    localStorage.setItem('sellerProTheme', normalized);
    document.dispatchEvent(new CustomEvent('sellerpro:theme', { detail: normalized }));
  }

  app.setTheme = applyTheme;
  applyTheme(currentTheme());

  function toast(message, type = 'info', duration = 4200) {
    let region = document.getElementById('sp-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'sp-toast-region';
      region.className = 'sp-toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.append(region);
    }

    const item = document.createElement('div');
    item.className = `sp-toast sp-toast--${type}`;
    item.innerHTML = `<span class="sp-toast__dot"></span><span>${escapeHtml(message)}</span>`;
    region.append(item);

    requestAnimationFrame(() => item.classList.add('is-visible'));
    window.setTimeout(() => {
      item.classList.remove('is-visible');
      window.setTimeout(() => item.remove(), 220);
    }, duration);
  }
  app.toast = toast;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => script.src === src || script.src.startsWith(src));
      if (existing && global.supabase) return resolve();

      const script = existing || document.createElement('script');
      if (!existing) {
        script.src = src;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        document.head.append(script);
      }
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('Não foi possível carregar o Supabase.')), { once: true });
    });
  }

  async function ensureSupabase() {
    if (!global.supabase?.createClient) await loadScript(config.supabaseCdn);
    if (!global.supabase?.createClient) throw new Error('Biblioteca do Supabase indisponível.');

    if (!app.supabase) {
      app.supabase = global.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return app.supabase;
  }
  app.ensureSupabase = ensureSupabase;

  function buildAuthenticatedUrl(target, session) {
    if (!fileSession || window.location.protocol !== 'file:') return new URL(target, window.location.href).href;
    return fileSession.withSession(target, session, window.location.href);
  }
  app.buildAuthenticatedUrl = buildAuthenticatedUrl;

  async function navigate(target, options = {}) {
    let session = options.session || null;
    if (!session && app.supabase) {
      const { data } = await app.supabase.auth.getSession();
      session = data?.session || null;
    }

    const href = buildAuthenticatedUrl(target, session);
    if (options.replace) window.location.replace(href);
    else window.location.assign(href);
  }
  app.navigate = navigate;

  async function restoreTransferredSession(client) {
    if (!fileSession || window.location.protocol !== 'file:') return;

    const { session, cleanedUrl } = fileSession.extractSession(window.location.href);
    if (cleanedUrl !== window.location.href) {
      window.history.replaceState(null, document.title, cleanedUrl);
    }
    if (!session) return;

    const { error } = await client.auth.setSession(session);
    if (error) throw error;
  }

  function installFileNavigationBridge() {
    if (!fileSession || window.location.protocol !== 'file:' || app.fileNavigationInstalled) return;
    app.fileNavigationInstalled = true;

    document.addEventListener('click', async event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      let target;
      try {
        target = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      const targetFile = target.pathname.split('/').pop() || 'index.html';
      if (target.protocol !== 'file:' || !config.protectedFiles.includes(targetFile)) return;

      event.preventDefault();
      try {
        await navigate(target.href);
      } catch (error) {
        console.error('[Seller Pro] Falha ao manter a sessão na navegação local.', error);
        window.location.assign(target.href);
      }
    });
  }

  async function safeMaybeSingle(queryFactory) {
    try {
      const { data, error } = await queryFactory();
      if (error) return null;
      return data || null;
    } catch (error) {
      return null;
    }
  }

  async function loadProfile(user) {
    const client = app.supabase;
    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    const fallback = {
      id: user.id,
      email: user.email || '',
      nome: metadata.nome || metadata.nome_completo || user.email?.split('@')[0] || 'Usuário',
      cargo: 'Suporte',
      avatar_url: metadata.avatar_url || '',
      telefone: metadata.telefone || '',
      especialidade: metadata.especialidade || '',
      bio: metadata.bio || ''
    };

    const [supportProfile, profile, support] = await Promise.all([
      safeMaybeSingle(() => client.from('support_profiles').select('*').eq('user_id', user.id).maybeSingle()),
      safeMaybeSingle(() => client.from('profiles').select('*').eq('id', user.id).maybeSingle()),
      safeMaybeSingle(() => client.from('suportes_sellerpro').select('*').ilike('email', user.email || '').maybeSingle())
    ]);

    const authorizationRole = appMetadata.cargo
      || appMetadata.role
      || appMetadata.funcao
      || supportProfile?.cargo
      || 'suporte';

    const merged = {
      ...fallback,
      ...(support || {}),
      ...(profile || {}),
      ...(supportProfile || {}),
      id: supportProfile?.id || profile?.id || support?.id || user.id,
      user_id: user.id,
      email: user.email || supportProfile?.email || profile?.email || support?.email || '',
      nome: supportProfile?.nome || profile?.nome || support?.nome || fallback.nome,
      cargo: supportProfile?.cargo || profile?.cargo || support?.cargo || fallback.cargo,
      authorization_role: authorizationRole,
      avatar_path: supportProfile?.avatar_path || profile?.avatar_path || support?.avatar_path || '',
      avatar_url: supportProfile?.avatar_url || profile?.avatar_url || support?.avatar_url || fallback.avatar_url
    };

    const storedAvatarPath = merged.avatar_path || (
      merged.avatar_url && !/^(?:https?:|data:|blob:)/i.test(merged.avatar_url)
        ? merged.avatar_url
        : ''
    );
    if (storedAvatarPath) {
      const { data, error } = await client.storage.from('avatars').createSignedUrl(storedAvatarPath, 60 * 60 * 12);
      if (!error && data?.signedUrl) {
        merged.avatar_path = storedAvatarPath;
        merged.avatar_url = data.signedUrl;
      }
    }

    return merged;
  }
  app.loadProfile = loadProfile;

  function navItems(profile) {
    const items = [
      ['menu', 'Início', 'home'],
      ['ares', 'Ares', 'board'],
      ['stores', 'Lojas prontas', 'store'],
      ['sellers', 'Sellers', 'users'],
      ['inventory', 'Estoque', 'inventory'],
      ['profile', 'Meu perfil', 'profile']
    ];
    if (isLeader(profile)) items.push(['leader', 'Gestão', 'shield']);
    return items;
  }

  function pageRouteKey() {
    const href = window.location.href.split('#')[0].split('?')[0];
    return Object.entries(config.routes).find(([, value]) => value.split('#')[0].split('?')[0] === href)?.[0] || '';
  }

  function createShell(user, profile) {
    if (document.getElementById('sp-global-header')) return;

    const activeKey = pageRouteKey();
    const displayName = profile?.nome || user.email?.split('@')[0] || 'Usuário';
    const avatar = profile?.avatar_url || '';
    const items = navItems(profile);

    const header = document.createElement('header');
    header.id = 'sp-global-header';
    header.className = 'sp-global-header';
    header.innerHTML = `
      <div class="sp-global-header__inner">
        <a class="sp-brand" href="${config.routes.menu}" aria-label="Seller Pro — início">
          <span class="sp-brand__mark">SP</span>
          <span class="sp-brand__text"><strong>Seller Pro</strong><small>Central de operações</small></span>
        </a>
        <button class="sp-mobile-toggle" type="button" aria-expanded="false" aria-controls="sp-global-nav">
          <span class="sp-mobile-toggle__open">${icons.menu}</span>
          <span class="sp-mobile-toggle__close">${icons.close}</span>
          <span class="sr-only">Abrir menu</span>
        </button>
        <nav class="sp-global-nav" id="sp-global-nav" aria-label="Navegação principal">
          ${items.map(([key, label, icon]) => `
            <a href="${config.routes[key]}" class="sp-global-nav__link${key === activeKey ? ' is-active' : ''}">
              ${icons[icon]}<span>${label}</span>
            </a>
          `).join('')}
        </nav>
        <div class="sp-account">
          <button class="sp-icon-button" id="sp-theme-button" type="button" title="Alternar tema" aria-label="Alternar tema">${icons.sun}</button>
          <a class="sp-user-chip" href="${config.routes.profile}">
            <span class="sp-user-chip__avatar${avatar ? ' has-image' : ''}">
              ${avatar ? `<img src="${escapeHtml(avatar)}" alt="Foto de ${escapeHtml(displayName)}" referrerpolicy="no-referrer">` : `<span>${escapeHtml(initials(displayName))}</span>`}
            </span>
            <span class="sp-user-chip__copy"><strong>${escapeHtml(displayName)}</strong><small>${escapeHtml(profile?.cargo || user.email || 'Sessão ativa')}</small></span>
          </a>
          <button class="sp-icon-button sp-icon-button--danger" id="sp-logout-button" type="button" title="Sair" aria-label="Sair da conta">${icons.logout}</button>
        </div>
      </div>`;

    document.body.prepend(header);
    document.body.classList.add('sp-app', `sp-page-${pageFile.replace('.html', '')}`);

    const mobileButton = header.querySelector('.sp-mobile-toggle');
    mobileButton?.addEventListener('click', () => {
      const open = header.classList.toggle('is-menu-open');
      mobileButton.setAttribute('aria-expanded', String(open));
    });

    header.querySelector('#sp-theme-button')?.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.spTheme === 'dark' ? 'light' : 'dark');
    });

    header.querySelector('#sp-logout-button')?.addEventListener('click', async () => {
      await logout();
    });
  }

  async function logout() {
    try {
      if (app.supabase) await app.supabase.auth.signOut();
    } catch (error) {
      console.warn('[Seller Pro] Falha ao encerrar sessão remotamente.', error);
    } finally {
      clearLegacySession();
      window.location.replace(config.routes.login);
    }
  }
  app.logout = logout;

  function authFailure(reason = 'sessao') {
    clearLegacySession();
    const url = new URL(config.routes.login);
    url.searchParams.set('motivo', reason);
    url.searchParams.set('redirect', window.location.href);
    window.location.replace(url.href);
  }

  async function initializeProtectedPage() {
    try {
      const client = await ensureSupabase();
      await restoreTransferredSession(client);
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError || !sessionData?.session?.user) return authFailure('sessao');

      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) return authFailure('token');

      app.user = userData.user;
      app.profile = await loadProfile(userData.user);
      saveCompatibilitySession(app.user, app.profile);
      createShell(app.user, app.profile);
      installFileNavigationBridge();
      document.documentElement.classList.remove('sp-auth-pending');
      document.documentElement.classList.add('sp-auth-ready');
      document.dispatchEvent(new CustomEvent('sellerpro:ready', { detail: { user: app.user, profile: app.profile } }));
      readyResolver.resolve(app);
    } catch (error) {
      console.error('[Seller Pro] Falha ao iniciar página protegida.', error);
      document.documentElement.classList.remove('sp-auth-pending');
      readyResolver.reject(error);
      authFailure('erro');
    }
  }

  async function initializePublicPage() {
    try {
      await ensureSupabase();
      document.documentElement.classList.remove('sp-auth-pending');
      readyResolver.resolve(app);
    } catch (error) {
      document.documentElement.classList.remove('sp-auth-pending');
      readyResolver.reject(error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isProtectedPage) initializeProtectedPage();
      else initializePublicPage();
    }, { once: true });
  } else if (isProtectedPage) {
    initializeProtectedPage();
  } else {
    initializePublicPage();
  }
})(window);
