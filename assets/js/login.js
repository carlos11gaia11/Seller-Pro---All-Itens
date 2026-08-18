(function initializeSellerProLogin() {
  'use strict';

  const loginCard = document.querySelector('#loginCard');
  const resetCard = document.querySelector('#resetCard');
  const loginForm = document.querySelector('#loginForm');
  const loginButton = document.querySelector('#loginButton');
  const loginMessage = document.querySelector('#loginMessage');
  const forgotButton = document.querySelector('#forgotPasswordButton');
  const resetForm = document.querySelector('#resetForm');
  const resetButton = document.querySelector('#resetButton');
  const resetMessage = document.querySelector('#resetMessage');

  let authClient = null;
  let initializationError = null;

  function message(element, text = '', type = '') {
    if (!element) return;
    element.className = `auth-message${text ? ' is-visible' : ''}${type ? ` is-${type}` : ''}`;
    const textElement = element.querySelector('span:last-child');
    if (textElement) textElement.textContent = text;
  }

  function translate(error) {
    const value = String(error?.message || error || '').toLowerCase();
    if (value.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (value.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (value.includes('rate limit') || value.includes('too many')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
    if (value.includes('network') || value.includes('fetch') || value.includes('supabase') || value.includes('biblioteca')) {
      return 'Não foi possível conectar ao Supabase. Verifique sua internet e tente novamente.';
    }
    return error?.message || 'Não foi possível concluir a operação.';
  }

  function safeRedirect() {
    const fallback = window.SellerProConfig?.routes?.menu || 'paginas/menu.html';
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (!raw) return fallback;

    try {
      const target = new URL(raw, window.location.href);
      if (window.location.protocol === 'file:') {
        if (!target.href.startsWith(window.SellerProConfig.projectRoot)) return fallback;
      } else if (target.origin !== window.location.origin) {
        return fallback;
      }
      return target.href;
    } catch {
      return fallback;
    }
  }

  function isRecoveryFlow() {
    return new URLSearchParams(window.location.search).has('reset') || window.location.hash.includes('type=recovery');
  }

  async function getClient() {
    if (authClient) return authClient;
    if (initializationError) throw initializationError;

    try {
      const app = await window.SellerProApp.ready;
      if (!app?.supabase) throw new Error('Supabase não foi inicializado.');
      authClient = app.supabase;
      return authClient;
    } catch (error) {
      initializationError = error instanceof Error ? error : new Error(String(error));
      throw initializationError;
    }
  }

  for (const button of document.querySelectorAll('[data-toggle-password]')) {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    message(loginMessage);
    loginButton.disabled = true;
    loginButton.textContent = 'Entrando...';

    try {
      const client = await getClient();
      const email = document.querySelector('#email').value.trim().toLowerCase();
      const password = document.querySelector('#senha').value;
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.session) throw new Error('O Supabase não retornou uma sessão válida.');
      message(loginMessage, 'Login realizado. Abrindo o painel...', 'success');
      await window.SellerProApp.navigate(safeRedirect(), { replace: true, session: data.session });
    } catch (error) {
      console.error('[Seller Pro] Falha no login.', error);
      message(loginMessage, translate(error), 'error');
      loginButton.disabled = false;
      loginButton.textContent = 'Entrar';
    }
  });

  forgotButton?.addEventListener('click', async () => {
    const emailInput = document.querySelector('#email');
    const email = emailInput.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message(loginMessage, 'Digite seu e-mail para receber o link de recuperação.', 'error');
      emailInput.focus();
      return;
    }

    forgotButton.disabled = true;
    forgotButton.textContent = 'Enviando...';
    try {
      const client = await getClient();
      const redirectTo = new URL('index.html?reset=1', window.SellerProConfig.projectRoot).href;
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      message(loginMessage, 'Link de recuperação enviado. Verifique sua caixa de entrada.', 'success');
    } catch (error) {
      console.error('[Seller Pro] Falha na recuperação de senha.', error);
      message(loginMessage, translate(error), 'error');
    } finally {
      forgotButton.disabled = false;
      forgotButton.textContent = 'Esqueci minha senha';
    }
  });

  resetForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.querySelector('#newPassword').value;
    const confirmation = document.querySelector('#confirmNewPassword').value;
    if (password.length < 8) return message(resetMessage, 'Use uma senha com pelo menos 8 caracteres.', 'error');
    if (password !== confirmation) return message(resetMessage, 'As senhas não conferem.', 'error');

    resetButton.disabled = true;
    resetButton.textContent = 'Atualizando...';
    try {
      const client = await getClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      message(resetMessage, 'Senha atualizada. Você será direcionado ao login.', 'success');
      await client.auth.signOut();
      window.setTimeout(() => window.location.replace(window.SellerProConfig.routes.login), 900);
    } catch (error) {
      console.error('[Seller Pro] Falha ao atualizar senha.', error);
      message(resetMessage, translate(error), 'error');
      resetButton.disabled = false;
      resetButton.textContent = 'Atualizar senha';
    }
  });

  async function initializeSession() {
    try {
      const client = await getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;

      if (isRecoveryFlow()) {
        loginCard?.classList.add('auth-hidden');
        resetCard?.classList.remove('auth-hidden');
      } else if (data?.session) {
        await window.SellerProApp.navigate(safeRedirect(), { replace: true, session: data.session });
      } else {
        const params = new URLSearchParams(window.location.search);
        if (params.get('motivo') === 'sessao' || params.get('motivo') === 'token') {
          message(loginMessage, 'Sua sessão expirou. Entre novamente para continuar.', 'error');
        } else if (params.get('cadastro') === 'sucesso') {
          message(loginMessage, 'Cadastro concluído. Confirme seu e-mail e faça o login.', 'success');
        }
      }
    } catch (error) {
      console.error('[Seller Pro] Falha ao inicializar autenticação.', error);
      message(loginMessage, translate(error), 'error');
    }
  }

  void initializeSession();
})();
