(async function initializeSellerProProfile() {
  'use strict';

  const gamificationApi = window.SellerProGamification;
  if (!gamificationApi?.calculateGamification) {
    throw new Error('O módulo de gamificação não foi carregado.');
  }
  const { calculateGamification } = gamificationApi;

const app = await window.SellerProApp.ready;
const client = app.supabase;
const user = app.user;
let profile = { ...app.profile };
let initialFormSnapshot = '';
let uploadedAvatarUrl = profile.avatar_url || '';
let uploadedAvatarPath = profile.avatar_path || '';

const $ = selector => document.querySelector(selector);
const elements = {
  loading: $('#profileLoading'),
  app: $('#profileApp'),
  form: $('#profileForm'),
  status: $('#profileStatus'),
  saveButton: $('#saveProfileButton'),
  resetButton: $('#resetProfileButton'),
  name: $('#profileFullName'),
  email: $('#profileEmailInput'),
  role: $('#profileRoleInput'),
  phone: $('#profilePhone'),
  specialty: $('#profileSpecialty'),
  startDate: $('#profileStartDate'),
  bio: $('#profileBio'),
  bioCount: $('#bioCount'),
  identityName: $('#profileName'),
  identityEmail: $('#profileEmail'),
  identityRole: $('#profileRole'),
  avatarEditor: $('#avatarEditor'),
  avatarImage: $('#avatarImage'),
  avatarFallback: $('#avatarFallback'),
  avatarButton: $('#avatarButton'),
  avatarInput: $('#avatarInput'),
  completeness: $('#profileCompleteness'),
  completenessBar: $('#profileCompletenessBar')
};

const iconMap = {
  rocket: '<svg viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2M15 9l-6 6m2-10.5A13.5 13.5 0 0 1 21.5 2.5 13.5 13.5 0 0 1 19.5 13L13 19.5 4.5 11z"/><circle cx="15" cy="9" r="2"/></svg>',
  store: '<svg viewBox="0 0 24 24"><path d="M4 9v11h16V9M3 9l2-6h14l2 6M8 20v-6h8v6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/></svg>',
  tasks: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.9"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 22c4.4 0 8-3.4 8-7.7 0-3.2-1.6-5.7-4.6-8.2.2 3-1.5 4.3-2.8 5.2.1-4.6-2.5-7.3-5.3-9.3.2 4-3.3 6.7-3.3 11.9C4 18.4 7.6 22 12 22z"/></svg>'
};

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeStatus(value) {
  return normalize(value).replace(/[_-]+/g, ' ');
}

function initials(value) {
  const pieces = String(value || 'Seller Pro').trim().split(/\s+/).filter(Boolean);
  if (pieces.length > 1) return `${pieces[0][0]}${pieces.at(-1)[0]}`.toUpperCase();
  return String(value || 'SP').slice(0, 2).toUpperCase();
}

function ownerMatches(record, name, email) {
  const candidates = [
    record?.owner,
    record?.suporte,
    record?.support,
    record?.suporte_responsavel,
    record?.responsavel,
    record?.created_by_email,
    record?.email_suporte
  ].map(normalize).filter(Boolean);
  return candidates.includes(normalize(name)) || candidates.includes(normalize(email));
}

function getDateValues(record) {
  const values = [
    record?.updated_at,
    record?.created_at,
    record?.delivery_completed_at,
    record?.sale_finalized_at,
    record?.data_entrega,
    record?.data_finalizacao
  ];
  if (Array.isArray(record?.updates)) {
    for (const update of record.updates) values.push(update?.date, update?.data, update?.created_at);
  }
  return values.filter(Boolean);
}

async function fetchOptionalTable(table) {
  try {
    const { data, error } = await client.from(table).select('*');
    if (error) throw error;
    return { table, rows: data || [], error: null };
  } catch (error) {
    console.warn(`[Perfil] Tabela opcional indisponível: ${table}`, error);
    return { table, rows: [], error };
  }
}

async function loadOperationalStats() {
  const results = await Promise.all([
    fetchOptionalTable('sp_tasks'),
    fetchOptionalTable('sp_lojas_entregues'),
    fetchOptionalTable('sellers')
  ]);
  const byTable = Object.fromEntries(results.map(item => [item.table, item]));
  const name = profile.nome || '';
  const email = user.email || '';

  const tasks = byTable.sp_tasks.rows.filter(row => ownerMatches(row, name, email));
  const stores = byTable.sp_lojas_entregues.rows.filter(row => ownerMatches(row, name, email));
  const sellers = byTable.sellers.rows.filter(row => ownerMatches(row, name, email));

  const taskStatus = task => normalizeStatus(task.status);
  const deliveredTaskIds = new Set(
    tasks
      .filter(task => taskStatus(task).includes('loja entregue') || taskStatus(task).includes('venda finalizada'))
      .map(task => String(task.id))
  );
  for (const store of stores) {
    deliveredTaskIds.add(String(store.task_id || store.id));
  }

  const finalizedSales = Math.max(
    tasks.filter(task => taskStatus(task).includes('venda finalizada')).length,
    stores.filter(store => normalizeStatus(store.status).includes('venda finalizada') || Boolean(store.sale_finalized_at)).length
  );
  const completedTasks = tasks.filter(task => {
    const status = taskStatus(task);
    return ['concluido', 'concluida', 'loja entregue', 'venda finalizada', 'finalizado', 'finalizada'].some(value => status.includes(value));
  }).length;
  const activeSellers = sellers.filter(seller => {
    const status = normalizeStatus(seller.situacao || seller.status);
    return !status || status.includes('ativo') || status.includes('ativou');
  }).length;
  const activityDates = [...tasks, ...stores].flatMap(getDateValues);

  const gamification = calculateGamification({
    deliveredStores: deliveredTaskIds.size,
    finalizedSales,
    completedTasks,
    activeSellers,
    activityDates
  });

  return {
    gamification,
    unavailableTables: results.filter(item => item.error).map(item => item.table)
  };
}

function localProfileKey() {
  return `sellerProProfileDraft:${user.id}`;
}

function localAvatarKey() {
  return `sellerProAvatar:${user.id}`;
}

function loadLocalFallbacks() {
  try {
    const saved = JSON.parse(localStorage.getItem(localProfileKey()) || '{}');
    profile = { ...profile, ...saved };
  } catch {}
  uploadedAvatarPath = profile.avatar_path || '';
  uploadedAvatarUrl = profile.avatar_url || localStorage.getItem(localAvatarKey()) || '';
}

function setStatus(message = '', type = '') {
  elements.status.textContent = message;
  elements.status.className = `sp-form-status${type ? ` is-${type}` : ''}`;
}

function setAvatar(url) {
  uploadedAvatarUrl = url || '';
  elements.avatarFallback.textContent = initials(elements.name.value || profile.nome);
  if (uploadedAvatarUrl) {
    elements.avatarImage.src = uploadedAvatarUrl;
    elements.avatarEditor.classList.add('has-image');
  } else {
    elements.avatarImage.removeAttribute('src');
    elements.avatarEditor.classList.remove('has-image');
  }
}

function formDataObject() {
  return {
    nome: elements.name.value.trim(),
    telefone: elements.phone.value.trim(),
    especialidade: elements.specialty.value.trim(),
    data_entrada: elements.startDate.value || null,
    bio: elements.bio.value.trim(),
    avatar_url: uploadedAvatarUrl || null,
    avatar_path: uploadedAvatarPath || null
  };
}

function snapshotForm() {
  return JSON.stringify(formDataObject());
}

function updateCompleteness() {
  const data = formDataObject();
  const fields = [data.nome, profile.cargo, data.telefone, data.especialidade, data.data_entrada, data.bio, data.avatar_path || data.avatar_url];
  const percent = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  elements.completeness.textContent = `${percent}%`;
  elements.completenessBar.style.width = `${percent}%`;
}

function populateForm() {
  elements.name.value = profile.nome || '';
  elements.email.value = user.email || profile.email || '';
  elements.role.value = profile.cargo || 'Suporte';
  elements.phone.value = profile.telefone || '';
  elements.specialty.value = profile.especialidade || '';
  elements.startDate.value = String(profile.data_entrada || '').slice(0, 10);
  elements.bio.value = profile.bio || '';
  elements.bioCount.textContent = String(elements.bio.value.length);
  elements.identityName.textContent = profile.nome || 'Suporte Seller Pro';
  elements.identityEmail.textContent = user.email || 'Sessão autenticada';
  elements.identityRole.textContent = profile.cargo || 'Suporte';
  setAvatar(uploadedAvatarUrl);
  updateCompleteness();
  initialFormSnapshot = snapshotForm();
}

function renderGamification(result) {
  const { gamification, unavailableTables } = result;
  const { level, stats, achievements, streak, xp } = gamification;

  $('#deliveredStoresValue').textContent = stats.deliveredStores.toLocaleString('pt-BR');
  $('#finalizedSalesValue').textContent = stats.finalizedSales.toLocaleString('pt-BR');
  $('#completedTasksValue').textContent = stats.completedTasks.toLocaleString('pt-BR');
  $('#activeSellersValue').textContent = stats.activeSellers.toLocaleString('pt-BR');
  $('#levelTitle').textContent = `Nível ${level.level} · ${level.title}`;
  $('#xpValue').textContent = `${xp.toLocaleString('pt-BR')} XP`;
  $('#levelStartXp').textContent = `${level.levelStartXp.toLocaleString('pt-BR')} XP`;
  $('#nextLevelXp').textContent = level.nextLevelXp ? `${level.nextLevelXp.toLocaleString('pt-BR')} XP` : 'Nível máximo';
  $('#levelProgressBar').style.width = `${level.progress}%`;
  $('#levelProgress').setAttribute('aria-valuenow', String(level.progress));
  $('#streakBadge').textContent = `${streak} ${streak === 1 ? 'dia' : 'dias'} de sequência`;

  $('#achievementsGrid').innerHTML = achievements.map(item => `
    <article class="sp-achievement${item.unlocked ? '' : ' is-locked'}">
      <div class="sp-achievement__top">
        <span class="sp-achievement__icon">${iconMap[item.icon] || iconMap.check}</span>
        <span class="sp-achievement__state">${item.unlocked ? 'Desbloqueada' : 'Em progresso'}</span>
      </div>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <div class="sp-achievement__progress">${item.progress}/${item.target}</div>
    </article>
  `).join('');

  if (unavailableTables.length) {
    $('#profileDataNote').innerHTML = `<span aria-hidden="true">ⓘ</span><span><strong>Dados parciais:</strong> não foi possível consultar ${unavailableTables.join(', ')}. Verifique as políticas RLS para liberar todos os indicadores.</span>`;
  }
}

async function compressAvatar(file) {
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem JPG, PNG ou WebP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.');

  const image = await createImageBitmap(file);
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#111317';
  context.fillRect(0, 0, size, size);
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  image.close();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82));
  if (!blob) throw new Error('Não foi possível processar a imagem.');
  return blob;
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function uploadAvatar(file) {
  const blob = await compressAvatar(file);
  const objectPath = `${user.id}/avatar.webp`;

  try {
    const { error } = await client.storage.from('avatars').upload(objectPath, blob, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: true
    });
    if (error) throw error;
    const { data, error: signedError } = await client.storage.from('avatars').createSignedUrl(objectPath, 60 * 60 * 12);
    if (signedError || !data?.signedUrl) throw signedError || new Error('Não foi possível abrir a foto enviada.');
    uploadedAvatarPath = objectPath;
    setAvatar(data.signedUrl);
    localStorage.removeItem(localAvatarKey());
    window.SellerProApp.toast('Foto atualizada. Salve o perfil para confirmar.', 'success');
  } catch (error) {
    console.warn('[Perfil] Upload remoto indisponível; usando fallback local.', error);
    const dataUrl = await blobToDataUrl(blob);
    uploadedAvatarPath = '';
    localStorage.setItem(localAvatarKey(), dataUrl);
    setAvatar(dataUrl);
    window.SellerProApp.toast('Foto salva neste navegador. Aplique a migration para sincronizar na equipe.', 'warning', 6200);
  }
  updateCompleteness();
}

async function saveProfile(event) {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;

  const editable = formDataObject();
  const payload = {
    user_id: user.id,
    email: user.email || null,
    nome: editable.nome,
    telefone: editable.telefone || null,
    especialidade: editable.especialidade || null,
    data_entrada: editable.data_entrada,
    bio: editable.bio || null,
    avatar_url: editable.avatar_path ? null : editable.avatar_url,
    avatar_path: editable.avatar_path
  };

  elements.saveButton.disabled = true;
  elements.saveButton.textContent = 'Salvando...';
  setStatus('Salvando seu perfil...');

  let remoteSaved = false;
  try {
    const { error } = await client.from('support_profiles').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    remoteSaved = true;
    localStorage.removeItem(localProfileKey());
    setStatus('Perfil atualizado e sincronizado com sucesso.', 'success');
    window.SellerProApp.toast('Perfil salvo com sucesso.', 'success');
  } catch (error) {
    console.warn('[Perfil] support_profiles indisponível; salvando fallback local.', error);
    localStorage.setItem(localProfileKey(), JSON.stringify(editable));
    setStatus('Dados salvos neste navegador. Execute a migration do Supabase para sincronização completa.', 'error');
    window.SellerProApp.toast('Perfil salvo localmente; banco ainda não configurado.', 'warning', 6200);
  } finally {
    profile = { ...profile, ...editable };
    elements.identityName.textContent = profile.nome;
    elements.avatarFallback.textContent = initials(profile.nome);
    updateCompleteness();
    initialFormSnapshot = snapshotForm();
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = 'Salvar perfil';
  }

  if (remoteSaved) {
    app.profile = profile;
    document.dispatchEvent(new CustomEvent('sellerpro:profile-updated', { detail: profile }));
  }
}

function resetForm() {
  populateForm();
  setStatus('Alterações desfeitas.');
}

async function initialize() {
  loadLocalFallbacks();
  populateForm();
  const stats = await loadOperationalStats();
  renderGamification(stats);
  elements.loading.hidden = true;
  elements.app.hidden = false;
}

elements.bio.addEventListener('input', () => {
  elements.bioCount.textContent = String(elements.bio.value.length);
  updateCompleteness();
});
for (const input of elements.form.querySelectorAll('input, textarea')) {
  input.addEventListener('input', updateCompleteness);
}
elements.name.addEventListener('input', () => {
  elements.avatarFallback.textContent = initials(elements.name.value);
});
elements.avatarButton.addEventListener('click', () => elements.avatarInput.click());
elements.avatarInput.addEventListener('change', async () => {
  const [file] = elements.avatarInput.files || [];
  if (!file) return;
  elements.avatarButton.disabled = true;
  try {
    await uploadAvatar(file);
  } catch (error) {
    window.SellerProApp.toast(error.message || 'Não foi possível atualizar a foto.', 'error');
  } finally {
    elements.avatarInput.value = '';
    elements.avatarButton.disabled = false;
  }
});
elements.form.addEventListener('submit', saveProfile);
elements.resetButton.addEventListener('click', resetForm);
window.addEventListener('beforeunload', event => {
  if (snapshotForm() !== initialFormSnapshot) {
    event.preventDefault();
    event.returnValue = '';
  }
});

initialize().catch(error => {
  console.error('[Perfil] Falha ao carregar perfil.', error);
  elements.loading.innerHTML = `<div class="sp-profile-loading__box"><strong>Não foi possível carregar o perfil.</strong><span>${error.message || error}</span><a class="sp-button" href="${window.SellerProConfig.routes.menu}">Voltar ao início</a></div>`;
});

})().catch(error => {
  console.error('[Perfil] Falha ao iniciar a página.', error);
  const loading = document.querySelector('#profileLoading');
  if (loading) {
    const fallback = window.SellerProConfig?.routes?.menu || 'menu.html';
    loading.innerHTML = `<div class="sp-profile-loading__box"><strong>Não foi possível carregar o perfil.</strong><span>${error.message || error}</span><a class="sp-button" href="${fallback}">Voltar ao início</a></div>`;
  }
});
