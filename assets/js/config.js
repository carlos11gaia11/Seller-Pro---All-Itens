(function configureSellerPro(global) {
  'use strict';

  const scriptUrl = document.currentScript?.src || new URL('assets/js/config.js', window.location.href).href;
  const projectRoot = new URL('../../', scriptUrl);

  const routes = Object.freeze({
    login: new URL('index.html', projectRoot).href,
    signup: new URL('paginas/cadastro.html', projectRoot).href,
    menu: new URL('paginas/menu.html', projectRoot).href,
    ares: new URL('paginas/ares.html', projectRoot).href,
    stores: new URL('paginas/lojas-prontas.html', projectRoot).href,
    sellers: new URL('paginas/lista-treinamento.html', projectRoot).href,
    inventory: new URL('paginas/estoque.html', projectRoot).href,
    profile: new URL('paginas/perfil.html', projectRoot).href,
    leader: new URL('paginas/perfil.html#leaderWorkspace', projectRoot).href
  });

  global.SellerProConfig = Object.freeze({
    supabaseUrl: 'https://owgvzmeewzpmzgcdwbfq.supabase.co',
    supabaseKey: 'sb_publishable_vEZ-hnwOMl9Z1NJGrK5ktw_vT2-4HMr',
    supabaseCdn: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    projectRoot: projectRoot.href,
    routes,
    protectedFiles: Object.freeze([
      'menu.html',
      'ares.html',
      'lojas-prontas.html',
      'lista-treinamento.html',
      'estoque.html',
      'perfil.html',
      'perfil-lider.html'
    ])
  });
})(window);
