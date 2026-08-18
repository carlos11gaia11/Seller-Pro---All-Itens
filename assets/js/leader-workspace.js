(function initializeSellerProLeaderWorkspace() {
  'use strict';

  const workspace = document.getElementById('leaderWorkspace');
  if (!workspace) return;

  const LEADER_FUNCTION = 'leader-admin';
  const $ = selector => workspace.querySelector(selector);
  const normalize = value => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizeKey = value => normalize(value).replace(/[-\s]+/g, '_');
  const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const isLeaderRole = value => ['lider_suporte', 'suporte_lider', 'lider', 'admin', 'administrador', 'gestor'].includes(normalizeKey(value));
  const isActive = value => !['inativo', 'inactive', 'false', '0', 'nao', 'não'].includes(normalizeKey(value));

  let client = null;
  let supports = [];
  let sellers = [];
  let authUsers = [];
  let sellerCountBySupportId = {};
  let sellerCountBySupportName = {};

  function withTimeout(promise, timeoutMs, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => window.clearTimeout(timer));
  }

  function supportId(row) { return String(row?.id || ''); }
  function supportName(row) { return String(row?.nome || row?.name || '').trim(); }

  function setStatus(selector, message, type = '') {
    const element = $(selector);
    if (!element) return;
    element.textContent = message;
    element.className = `sp-leader-status${type ? ` is-${type}` : ''}`;
  }

  function setButtonBusy(button, busy, busyText, normalText) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
  }

  async function requireAuthenticatedClient() {
    const app = window.SellerProApp;
    client = app?.supabase || null;
    if (!client?.auth?.getSession || !client?.functions?.invoke) {
      throw new Error('Cliente do Supabase não está disponível.');
    }
    const { data, error } = await withTimeout(client.auth.getSession(), 6000, 'Tempo excedido ao validar a sessão administrativa.');
    if (error) throw error;
    if (!data?.session?.access_token) throw new Error('Sessão administrativa não encontrada. Entre novamente.');
    return data.session;
  }

  async function invokeLeader(action, payload = {}) {
    const session = await requireAuthenticatedClient();
    const result = await withTimeout(
      client.functions.invoke(LEADER_FUNCTION, {
        body: { action, ...payload },
        headers: { Authorization: `Bearer ${session.access_token}` }
      }),
      12000,
      `Tempo excedido na operação administrativa: ${action}.`
    );
    const { data, error } = result || {};
    if (error) throw new Error(data?.error || error.message || 'Falha na função administrativa.');
    if (!data?.ok) throw new Error(data?.error || 'Operação administrativa recusada.');
    return data;
  }

  function buildCounts() {
    sellerCountBySupportId = {};
    sellerCountBySupportName = {};
    for (const seller of sellers) {
      const id = String(seller.suporte_id || '');
      const name = normalize(seller.suporte || '');
      if (id) sellerCountBySupportId[id] = (sellerCountBySupportId[id] || 0) + 1;
      if (name) sellerCountBySupportName[name] = (sellerCountBySupportName[name] || 0) + 1;
    }
  }

  function getSupportCount(row) {
    const byId = sellerCountBySupportId[supportId(row)];
    return Number.isFinite(byId) ? byId : (sellerCountBySupportName[normalize(supportName(row))] || 0);
  }

  function getAssignableSupports() {
    return supports.filter(row => isActive(row.status) && !isLeaderRole(row.cargo));
  }

  function getLeastLoadedSupport() {
    return getAssignableSupports()
      .map(row => ({ row, count: getSupportCount(row) }))
      .sort((a, b) => a.count - b.count || supportName(a.row).localeCompare(supportName(b.row), 'pt-BR'))[0] || null;
  }

  function authUserById(id) { return authUsers.find(user => String(user.id) === String(id)); }
  function linkedSupportForUser(userId) { return supports.find(row => String(row.user_id || '') === String(userId || '')); }

  function renderStats() {
    const least = getLeastLoadedSupport();
    $('#leaderSupportTotal').textContent = String(supports.length);
    $('#leaderSupportActive').textContent = String(supports.filter(row => isActive(row.status)).length);
    $('#leaderUserLinked').textContent = String(supports.filter(row => row.user_id).length);
    $('#leaderAuthTotal').textContent = String(authUsers.length);
    $('#leaderSellerTotal').textContent = String(sellers.length);
    $('#leaderLeastLoaded').textContent = least ? `${supportName(least.row)} · ${least.count}` : '—';
    $('#leaderAutomaticSupportPreview').textContent = least
      ? `Distribuição automática: ${supportName(least.row)}, com ${least.count} seller(s).`
      : 'Nenhum suporte ativo disponível para distribuição automática.';
  }

  function supportOptions(selected = '', includeAuto = false) {
    const options = [];
    if (includeAuto) options.push(`<option value="__auto__"${selected === '__auto__' ? ' selected' : ''}>Automático: menor fila</option>`);
    for (const row of getAssignableSupports()) {
      const id = supportId(row);
      options.push(`<option value="${escapeHtml(id)}"${String(selected) === id ? ' selected' : ''}>${escapeHtml(supportName(row))} · ${getSupportCount(row)} seller(s)</option>`);
    }
    return options.join('');
  }

  function renderSelects() {
    const sellerSupport = $('#leaderSellerSupport');
    const sellerCurrent = sellerSupport.value || '__auto__';
    sellerSupport.innerHTML = supportOptions(sellerCurrent, true);
    if (![...sellerSupport.options].some(option => option.value === sellerCurrent)) sellerSupport.value = '__auto__';

    const supportSelect = $('#leaderAccessSupport');
    const currentSupport = supportSelect.value;
    supportSelect.innerHTML = `<option value="">Selecione um suporte</option>${supports.map(row => {
      const auth = row.user_id ? ' · Auth vinculado' : ' · sem Auth';
      return `<option value="${escapeHtml(supportId(row))}"${currentSupport === supportId(row) ? ' selected' : ''}>${escapeHtml(supportName(row))}${auth}</option>`;
    }).join('')}`;

    renderAuthUsers();
    updateAccessPanel();
  }

  function renderAuthUsers() {
    const select = $('#leaderAuthUser');
    const selected = select.value;
    select.innerHTML = `<option value="">Selecione um usuário Auth</option>${authUsers.map(user => {
      const linked = linkedSupportForUser(user.id);
      const label = `${user.email || user.name || user.id}${linked ? ` · vinculado a ${supportName(linked)}` : ' · disponível'}`;
      const disabled = linked && supportId(linked) !== $('#leaderAccessSupport').value;
      return `<option value="${escapeHtml(user.id)}"${selected === String(user.id) ? ' selected' : ''}${disabled ? ' disabled' : ''}>${escapeHtml(label)}</option>`;
    }).join('')}`;
    if (selected && ![...select.options].some(option => option.value === selected && !option.disabled)) select.value = '';
  }

  function updateAccessPanel() {
    const row = supports.find(item => supportId(item) === $('#leaderAccessSupport').value);
    const currentBox = $('#leaderCurrentAccess');
    const unlinkButton = $('#leaderUnlinkAuthButton');
    const linkButton = $('#leaderLinkAuthButton');

    renderAuthUsers();
    if (!row) {
      $('#leaderAccessHelp').textContent = 'Selecione um suporte para consultar o acesso atual.';
      currentBox.innerHTML = '<span class="sp-access-current__label">Vínculo atual</span><strong>Nenhum suporte selecionado</strong><small>Selecione um suporte para consultar o acesso.</small>';
      unlinkButton.disabled = true;
      linkButton.disabled = false;
      return;
    }

    $('#leaderAccessEmail').placeholder = row.email || 'E-mail de login';
    const authUser = authUserById(row.user_id);
    if (row.user_id) {
      const authEmail = authUser?.email || row.email || 'e-mail não retornado';
      $('#leaderAccessHelp').textContent = 'Este suporte já possui uma conta Auth vinculada. Você pode alterar e-mail e/ou senha sem recriar o usuário.';
      currentBox.innerHTML = `<span class="sp-access-current__label">Vínculo atual</span><strong>${escapeHtml(authEmail)}</strong><small>User ID: ${escapeHtml(row.user_id)}</small>`;
      $('#leaderAuthUser').value = String(row.user_id);
      unlinkButton.disabled = false;
      linkButton.textContent = 'Atualizar vínculo Auth';
    } else {
      $('#leaderAccessHelp').textContent = 'Este suporte não possui login vinculado. Escolha um usuário Auth existente ou crie uma nova conta com e-mail e senha.';
      currentBox.innerHTML = `<span class="sp-access-current__label">Vínculo atual</span><strong>Sem usuário Auth</strong><small>Cadastro operacional existente, mas sem acesso de login vinculado.</small>`;
      unlinkButton.disabled = true;
      linkButton.textContent = 'Vincular usuário Auth';
    }
  }

  function renderSupportTable() {
    const term = normalize($('#leaderSupportSearch').value);
    const filtered = supports.filter(row => normalize([supportName(row), row.email, row.telefone, row.cargo, row.status].join(' ')).includes(term));
    $('#leaderSupportTableBody').innerHTML = filtered.length ? filtered.map(row => {
      const auth = authUserById(row.user_id);
      return `<tr>
        <td><strong>${escapeHtml(supportName(row) || '—')}</strong><small>${escapeHtml(row.email || 'Sem e-mail')}</small></td>
        <td>${escapeHtml(row.telefone || '—')}</td>
        <td><span class="sp-leader-chip${isLeaderRole(row.cargo) ? ' sp-leader-chip--warn' : ''}">${escapeHtml(row.cargo || 'suporte')}</span></td>
        <td><span class="sp-leader-chip${isActive(row.status) ? ' sp-leader-chip--ok' : ' sp-leader-chip--warn'}">${escapeHtml(row.status || 'ativo')}</span></td>
        <td>${row.user_id ? `<span class="sp-leader-chip sp-leader-chip--ok">Vinculado</span><small>${escapeHtml(auth?.email || row.user_id)}</small>` : '<span class="sp-leader-chip sp-leader-chip--warn">Sem vínculo</span>'}</td>
        <td><strong>${getSupportCount(row)}</strong></td>
        <td><div class="sp-leader-row-actions"><button class="sp-leader-button" type="button" data-edit-support="${escapeHtml(supportId(row))}">Editar</button><button class="sp-leader-button" type="button" data-access-support="${escapeHtml(supportId(row))}">Acesso</button><button class="sp-leader-button sp-leader-button--danger" type="button" data-delete-support="${escapeHtml(supportId(row))}">Excluir</button></div></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7">Nenhum suporte encontrado.</td></tr>';
  }

  function renderSellerTable() {
    const term = normalize($('#leaderSellerSearch').value);
    const filtered = sellers.filter(row => normalize([row.nome, row.email, row.mcid, row.status, row.suporte].join(' ')).includes(term));
    $('#leaderSellerTableBody').innerHTML = filtered.length ? filtered.map(row => `<tr>
      <td><strong>${escapeHtml(row.nome || '—')}</strong><small>${escapeHtml(row.email || '')}</small></td>
      <td>${escapeHtml(row.mcid || '—')}</td>
      <td>${escapeHtml(row.status || row.situacao || '—')}</td>
      <td>${escapeHtml(row.suporte || '—')}</td>
      <td><select class="sp-leader-select" data-seller-support-select="${escapeHtml(row.id)}">${supportOptions(String(row.suporte_id || ''), false)}</select></td>
      <td><button class="sp-leader-button" type="button" data-assign-seller="${escapeHtml(row.id)}">Salvar responsável</button></td>
    </tr>`).join('') : '<tr><td colspan="6">Nenhum seller encontrado.</td></tr>';
  }

  function renderAll() {
    buildCounts();
    renderStats();
    renderSelects();
    renderSupportTable();
    renderSellerTable();
  }

  async function loadDashboard() {
    setStatus('#leaderGlobalStatus', 'Atualizando dados administrativos...');
    const [dashboardResult, authResult] = await Promise.allSettled([
      invokeLeader('dashboard'),
      invokeLeader('list_auth_users')
    ]);

    if (dashboardResult.status === 'rejected') {
      throw dashboardResult.reason;
    }
    supports = Array.isArray(dashboardResult.value.supports) ? dashboardResult.value.supports : [];
    sellers = Array.isArray(dashboardResult.value.sellers) ? dashboardResult.value.sellers : [];

    if (authResult.status === 'fulfilled') {
      authUsers = Array.isArray(authResult.value.users) ? authResult.value.users : [];
      setStatus('#leaderGlobalStatus', 'Dados administrativos atualizados.', 'success');
    } else {
      authUsers = [];
      setStatus('#leaderGlobalStatus', `Suportes carregados, mas não foi possível listar usuários Auth: ${authResult.reason?.message || authResult.reason}`, 'warning');
    }
    renderAll();
  }

  function clearSupportForm() {
    $('#leaderSupportForm').reset();
    $('#leaderSupportId').value = '';
    $('#leaderSupportFormTitle').textContent = 'Cadastrar suporte';
    $('#leaderSaveSupportButton').textContent = 'Salvar suporte';
  }

  function fillSupportForm(row) {
    $('#leaderSupportId').value = supportId(row);
    $('#leaderSupportName').value = row.nome || '';
    $('#leaderSupportEmail').value = row.email || '';
    $('#leaderSupportPhone').value = row.telefone || '';
    $('#leaderSupportRole').value = ['suporte', 'lider_suporte', 'admin'].includes(normalizeKey(row.cargo)) ? normalizeKey(row.cargo) : 'suporte';
    $('#leaderSupportState').value = isActive(row.status) ? 'ativo' : 'inativo';
    $('#leaderSupportTempPassword').value = '';
    $('#leaderSupportFormTitle').textContent = 'Editar suporte';
    $('#leaderSaveSupportButton').textContent = 'Atualizar suporte';
    $('#leaderSupportName').focus();
  }

  $('#leaderSupportForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('#leaderSaveSupportButton');
    const editing = Boolean($('#leaderSupportId').value);
    setButtonBusy(button, true, 'Salvando...', editing ? 'Atualizar suporte' : 'Salvar suporte');
    try {
      await invokeLeader('save_support', { support: {
        id: $('#leaderSupportId').value || null,
        nome: $('#leaderSupportName').value.trim(),
        email: $('#leaderSupportEmail').value.trim().toLowerCase(),
        telefone: $('#leaderSupportPhone').value.trim() || null,
        cargo: $('#leaderSupportRole').value,
        status: $('#leaderSupportState').value,
        password: $('#leaderSupportTempPassword').value || null
      }});
      setStatus('#leaderSupportStatus', 'Suporte salvo com sucesso.', 'success');
      clearSupportForm();
      await loadDashboard();
    } catch (error) {
      setStatus('#leaderSupportStatus', error.message, 'error');
    } finally {
      setButtonBusy(button, false, '', editing ? 'Atualizar suporte' : 'Salvar suporte');
    }
  });

  $('#leaderAuthLinkForm').addEventListener('submit', async event => {
    event.preventDefault();
    const supportIdValue = $('#leaderAccessSupport').value;
    const userId = $('#leaderAuthUser').value;
    if (!supportIdValue) return setStatus('#leaderAccessStatus', 'Selecione um suporte.', 'warning');
    if (!userId) return setStatus('#leaderAccessStatus', 'Selecione um usuário do Supabase Auth.', 'warning');
    const row = supports.find(item => supportId(item) === supportIdValue);
    const replace = Boolean(row?.user_id && String(row.user_id) !== String(userId));
    if (replace && !window.confirm('Este suporte já possui outro usuário Auth vinculado. Deseja substituir o vínculo? O usuário anterior continuará existindo no Auth.')) return;
    const button = $('#leaderLinkAuthButton');
    setButtonBusy(button, true, 'Vinculando...', 'Vincular usuário Auth');
    try {
      await invokeLeader('link_auth_user', { support_id: supportIdValue, user_id: userId, replace });
      setStatus('#leaderAccessStatus', 'Usuário Auth vinculado ao suporte com sucesso.', 'success');
      await loadDashboard();
      $('#leaderAccessSupport').value = supportIdValue;
      updateAccessPanel();
    } catch (error) {
      setStatus('#leaderAccessStatus', error.message, 'error');
    } finally {
      setButtonBusy(button, false, '', 'Vincular usuário Auth');
    }
  });

  $('#leaderUnlinkAuthButton').addEventListener('click', async () => {
    const supportIdValue = $('#leaderAccessSupport').value;
    const row = supports.find(item => supportId(item) === supportIdValue);
    if (!row?.user_id) return;
    if (!window.confirm(`Desvincular o acesso Auth de ${supportName(row)}? A conta Auth não será excluída.`)) return;
    const button = $('#leaderUnlinkAuthButton');
    setButtonBusy(button, true, 'Desvinculando...', 'Desvincular');
    try {
      await invokeLeader('unlink_auth_user', { support_id: supportIdValue });
      setStatus('#leaderAccessStatus', 'Vínculo removido. A conta Auth foi preservada.', 'success');
      await loadDashboard();
      $('#leaderAccessSupport').value = supportIdValue;
      updateAccessPanel();
    } catch (error) {
      setStatus('#leaderAccessStatus', error.message, 'error');
    } finally {
      setButtonBusy(button, false, '', 'Desvincular');
    }
  });

  $('#leaderAccessForm').addEventListener('submit', async event => {
    event.preventDefault();
    const supportIdValue = $('#leaderAccessSupport').value;
    const email = $('#leaderAccessEmail').value.trim().toLowerCase();
    const password = $('#leaderAccessPassword').value;
    if (!supportIdValue) return setStatus('#leaderAccessStatus', 'Selecione um suporte.', 'warning');
    if (!email && !password) return setStatus('#leaderAccessStatus', 'Informe um e-mail ou uma senha.', 'warning');
    const button = $('#leaderSaveAccessButton');
    setButtonBusy(button, true, 'Salvando...', 'Criar / atualizar acesso');
    try {
      await invokeLeader('save_access', { support_id: supportIdValue, email: email || null, password: password || null });
      $('#leaderAccessPassword').value = '';
      $('#leaderAccessEmail').value = '';
      setStatus('#leaderAccessStatus', 'Credenciais salvas e vínculo sincronizado.', 'success');
      await loadDashboard();
      $('#leaderAccessSupport').value = supportIdValue;
      updateAccessPanel();
    } catch (error) {
      setStatus('#leaderAccessStatus', error.message, 'error');
    } finally {
      setButtonBusy(button, false, '', 'Criar / atualizar acesso');
    }
  });

  $('#leaderSellerForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('#leaderSaveSellerButton');
    setButtonBusy(button, true, 'Adicionando...', 'Adicionar seller');
    try {
      await invokeLeader('create_seller', { seller: {
        nome: $('#leaderSellerName').value.trim(),
        email: $('#leaderSellerEmail').value.trim().toLowerCase() || null,
        telefone: $('#leaderSellerPhone').value.trim() || null,
        mcid: $('#leaderSellerMcid').value.trim() || null,
        status: $('#leaderSellerState').value,
        support_id: $('#leaderSellerSupport').value
      }});
      $('#leaderSellerForm').reset();
      $('#leaderSellerSupport').value = '__auto__';
      setStatus('#leaderSellerStatus', 'Seller cadastrado e atribuído.', 'success');
      await loadDashboard();
    } catch (error) {
      setStatus('#leaderSellerStatus', error.message, 'error');
    } finally {
      setButtonBusy(button, false, '', 'Adicionar seller');
    }
  });

  $('#leaderSupportTableBody').addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-support]');
    const access = event.target.closest('[data-access-support]');
    const remove = event.target.closest('[data-delete-support]');
    if (edit) {
      const row = supports.find(item => supportId(item) === edit.dataset.editSupport);
      if (row) fillSupportForm(row);
      return;
    }
    if (access) {
      $('#leaderAccessSupport').value = access.dataset.accessSupport;
      updateAccessPanel();
      $('#leaderAuthUser').focus();
      $('#leaderAccessSupport').closest('.sp-leader-card--wide')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!remove) return;
    const id = remove.dataset.deleteSupport;
    const row = supports.find(item => supportId(item) === id);
    if (!row) return;
    const count = getSupportCount(row);
    const warning = count > 0
      ? `${supportName(row)} possui ${count} seller(s). O sistema irá desativar o suporte para preservar o histórico. Continuar?`
      : `Excluir ${supportName(row)}? Se houver histórico ou acesso vinculado, o servidor fará uma desativação segura.`;
    if (!window.confirm(warning)) return;
    setButtonBusy(remove, true, 'Processando...', 'Excluir');
    try {
      const data = await invokeLeader('delete_support', { support_id: id });
      setStatus('#leaderGlobalStatus', data.message || 'Operação concluída.', 'success');
      await loadDashboard();
    } catch (error) {
      setStatus('#leaderGlobalStatus', error.message, 'error');
    } finally {
      if (document.body.contains(remove)) setButtonBusy(remove, false, '', 'Excluir');
    }
  });

  $('#leaderSellerTableBody').addEventListener('click', async event => {
    const button = event.target.closest('[data-assign-seller]');
    if (!button) return;
    const sellerId = button.dataset.assignSeller;
    const select = $(`[data-seller-support-select="${CSS.escape(sellerId)}"]`);
    if (!select?.value) return setStatus('#leaderGlobalStatus', 'Selecione um suporte para o seller.', 'warning');
    setButtonBusy(button, true, 'Salvando...', 'Salvar responsável');
    try {
      await invokeLeader('assign_seller', { seller_id: sellerId, support_id: select.value });
      setStatus('#leaderGlobalStatus', 'Responsável atualizado.', 'success');
      await loadDashboard();
    } catch (error) {
      setStatus('#leaderGlobalStatus', error.message, 'error');
    } finally {
      setButtonBusy(button, false, '', 'Salvar responsável');
    }
  });

  $('#leaderRefreshButton').addEventListener('click', () => loadDashboard().catch(error => setStatus('#leaderGlobalStatus', error.message, 'error')));
  $('#leaderClearSupportButton').addEventListener('click', clearSupportForm);
  $('#leaderClearSellerButton').addEventListener('click', () => { $('#leaderSellerForm').reset(); $('#leaderSellerSupport').value = '__auto__'; });
  $('#leaderClearSearchButton').addEventListener('click', () => { $('#leaderSupportSearch').value = ''; renderSupportTable(); });
  $('#leaderSupportSearch').addEventListener('input', renderSupportTable);
  $('#leaderSellerSearch').addEventListener('input', renderSellerTable);
  $('#leaderAccessSupport').addEventListener('change', updateAccessPanel);

  async function initialize() {
    const app = await withTimeout(window.SellerProApp?.ready, 12000, 'Tempo excedido ao iniciar a área de liderança.');
    const profile = app?.profile || {};
    const allowed = typeof app?.isLeader === 'function' ? app.isLeader(profile) : isLeaderRole(profile.authorization_role || profile.cargo);
    if (!allowed) return;
    workspace.hidden = false;
    if (window.location.hash === '#leaderWorkspace') window.setTimeout(() => workspace.scrollIntoView({ block: 'start' }), 50);
    try {
      await loadDashboard();
    } catch (error) {
      console.error('[Liderança] Falha ao carregar dados:', error);
      setStatus('#leaderGlobalStatus', error.message, 'error');
    }
  }

  initialize().catch(error => {
    console.error('[Liderança] Falha ao iniciar:', error);
    setStatus('#leaderGlobalStatus', error.message || String(error), 'error');
  });
})();
