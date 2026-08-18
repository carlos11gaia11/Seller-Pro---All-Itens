(function initializeSellerProSignup() {
  'use strict';

  const form = document.querySelector('#signupForm');
  const button = document.querySelector('#signupButton');
  const messageBox = document.querySelector('#signupMessage');
  const passwordInput = document.querySelector('#senha');
  const confirmationInput = document.querySelector('#confirmarSenha');
  const strengthBar = document.querySelector('#strengthBar');
  const strengthLabel = document.querySelector('#strengthLabel');

  let authClient = null;
  let initializationError = null;

  function showMessage(text = '', type = '') {
    if (!messageBox) return;
    messageBox.className = `auth-message${text ? ' is-visible' : ''}${type ? ` is-${type}` : ''}`;
    const textElement = messageBox.querySelector('span:last-child');
    if (textElement) textElement.textContent = text;
  }

  function translate(error) {
    return window.SellerProAuthErrors?.translate(error) || 'Não foi possível criar a conta.';
  }

  function diagnostics(error) {
    return window.SellerProAuthErrors?.diagnostics(error) || {
      name: error?.name || '',
      message: error?.message || '',
      code: error?.code || '',
      status: Number(error?.status) || 0,
      details: error?.details || '',
      hint: error?.hint || ''
    };
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

  function strength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }

  function renderStrength() {
    const score = strength(passwordInput?.value || '');
    const widths = [0, 22, 42, 64, 82, 100];
    const labels = ['Muito fraca', 'Muito fraca', 'Fraca', 'Boa', 'Forte', 'Excelente'];
    const colors = ['#ff6472', '#ff6472', '#ff8a3d', '#f5bd45', '#2dd4a4', '#2dd4a4'];
    if (strengthBar) {
      strengthBar.style.width = `${widths[score]}%`;
      strengthBar.style.background = colors[score];
    }
    if (strengthLabel) strengthLabel.textContent = labels[score];
  }

  for (const toggle of document.querySelectorAll('[data-toggle-password]')) {
    toggle.addEventListener('click', () => {
      const input = document.getElementById(toggle.dataset.togglePassword);
      if (!input) return;
      const showing = input.type === 'password';
      input.type = showing ? 'text' : 'password';
      toggle.setAttribute('aria-label', showing ? 'Ocultar senha' : 'Mostrar senha');
    });
  }
  passwordInput?.addEventListener('input', renderStrength);

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    showMessage();
    const nome = document.querySelector('#nome').value.trim();
    const email = document.querySelector('#email').value.trim().toLowerCase();
    const password = passwordInput.value;
    if (password !== confirmationInput.value) return showMessage('As senhas não conferem.', 'error');
    if (strength(password) < 3) return showMessage('Use uma senha mais forte, combinando letras e números.', 'error');

    button.disabled = true;
    button.textContent = 'Criando conta...';
    try {
      const client = await getClient();
      const redirectTo = new URL('index.html?cadastro=sucesso', window.SellerProConfig.projectRoot).href;
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { nome, nome_completo: nome, cargo: 'suporte' }
        }
      });
      if (error) throw error;
      if (!data?.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) throw new Error('Este e-mail já está cadastrado.');
      if (data.session) await client.auth.signOut();
      form.reset();
      renderStrength();
      showMessage('Conta criada. Verifique seu e-mail para confirmar o cadastro.', 'success');
      window.setTimeout(() => window.location.replace(redirectTo), 1200);
    } catch (error) {
      console.error('[Seller Pro] Falha no cadastro.', diagnostics(error), error);
      showMessage(translate(error), 'error');
      button.disabled = false;
      button.textContent = 'Criar conta';
    }
  });

  async function initializeSession() {
    try {
      const client = await getClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data?.session) await window.SellerProApp.navigate(window.SellerProConfig.routes.menu, { replace: true, session: data.session });
    } catch (error) {
      console.error('[Seller Pro] Falha ao inicializar cadastro.', error);
      showMessage(translate(error), 'error');
    }
  }

  renderStrength();
  void initializeSession();
})();
